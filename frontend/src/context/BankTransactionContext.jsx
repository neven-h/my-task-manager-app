import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useBankTransactionData from '../hooks/useBankTransactionData';
import useBankTransactionFilters from '../hooks/useBankTransactionFilters';
import { exportBankTransactionsPDF } from '../utils/exportBankPDF';
import storage, { STORAGE_KEYS } from '../utils/storage';

const BankTransactionContext = createContext(null);

export const useBankTransactionContext = () => {
    const ctx = useContext(BankTransactionContext);
    if (!ctx) throw new Error('useBankTransactionContext must be used within a BankTransactionProvider');
    return ctx;
};

const colors = {
    primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000', success: '#00AA00',
    background: '#fff', card: '#ffffff', text: '#000', textLight: '#666', border: '#000'
};

export const BankTransactionProvider = ({ onBackToTasks, authUser, authRole, children }) => {
    const data = useBankTransactionData();
    const {
        uploadedData, setUploadedData, savedMonths, setSavedMonths,
        selectedMonth, setSelectedMonth, monthTransactions, setMonthTransactions,
        allDescriptions, transactionStats, loading, setLoading, error, setError, success, setSuccess,
        tabs, setTabs, activeTabId, setActiveTabId, orphanedCount,
        fetchTabs, checkOrphanedTransactions, adoptOrphanedTransactions: adoptOrphanedRaw,
        handleCreateFirstTab: createFirstTabRaw, fetchAllDescriptions, fetchTransactionStats,
        fetchSavedMonths, fetchAllTransactions, fetchMonthTransactions,
        handleFileUpload: handleFileUploadRaw, handleSaveTransactions: handleSaveRaw,
        handleAddTransaction: handleAddRaw, handleUpdateTransaction: handleUpdateRaw,
        handleDeleteTransaction: handleDeleteRaw, handleDeleteMonth: handleDeleteMonthRaw,
    } = data;

    const filters = useBankTransactionFilters(monthTransactions);
    const {
        searchTerm, setSearchTerm, descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter, previewFilter, setPreviewFilter,
        filteredTransactions, totalFiltered, creditTotal, cashTotal,
        chartData, aggregateByCategory, getFilteredPreview,
    } = filters;

    const [visibleTransactions, setVisibleTransactions] = useState(50);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    // ==================== INITIALIZATION ====================

    useEffect(() => {
        const initializeData = async () => {
            const fetchedTabs = await fetchTabs();
            await checkOrphanedTransactions();
            if (!fetchedTabs || fetchedTabs.length === 0) { setActiveTabId(null); return; }

            const savedTabId = storage.get(STORAGE_KEYS.ACTIVE_TAB_ID);
            let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;
            if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) tabIdToUse = fetchedTabs[0].id;

            setActiveTabId(tabIdToUse);
            storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(tabIdToUse));

            const fetchedMonths = await fetchSavedMonths(tabIdToUse);
            await fetchAllDescriptions();
            await fetchTransactionStats(tabIdToUse);

            const savedMonth = storage.get(STORAGE_KEYS.SELECTED_MONTH);
            const monthList = fetchedMonths || [];
            if (savedMonth && savedMonth !== 'all' && monthList.some(m => (m.month_year ?? m) === savedMonth)) {
                await fetchMonthTransactions(savedMonth, tabIdToUse);
            } else {
                await fetchAllTransactions(tabIdToUse);
            }
        };
        initializeData();
    }, []);

    // ==================== TAB SWITCHING ====================

    const handleSwitchTab = useCallback(async (tabId) => {
        setActiveTabId(tabId);
        storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(tabId));
        setSelectedMonth(null);
        setMonthTransactions([]);
        setUploadedData(null);
        setSearchTerm('');
        setDescriptionFilter('');
        setTypeFilter('all');
        setVisibleTransactions(50);
        await fetchSavedMonths(tabId);
        await fetchAllDescriptions();
        await fetchTransactionStats(tabId);
        await fetchAllTransactions(tabId);
    }, [fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setSelectedMonth, setMonthTransactions, setUploadedData, setSearchTerm,
        setDescriptionFilter, setTypeFilter]);

    // ==================== WRAPPED CRUD ====================

    const adoptOrphanedTransactions = useCallback(async (tabId) => {
        if (await adoptOrphanedRaw(tabId)) { await fetchSavedMonths(tabId); await fetchTransactionStats(tabId); await fetchAllTransactions(tabId); }
    }, [adoptOrphanedRaw, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions]);

    const handleCreateFirstTab = useCallback(async (tabName) => {
        const result = await createFirstTabRaw(tabName);
        if (result) {
            await fetchTabs();
            setActiveTabId(result.id);
            storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(result.id));
            setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null);
            await fetchSavedMonths(result.id);
            await fetchTransactionStats(result.id);
            await fetchAllTransactions(result.id);
        }
        return result;
    }, [createFirstTabRaw, fetchTabs, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const handleFileUpload = useCallback(async (event) => { await handleFileUploadRaw(event, filters.typeFilter); setPreviewFilter('all'); }, [handleFileUploadRaw, filters.typeFilter, setPreviewFilter]);

    const handleSaveTransactions = useCallback(async () => {
        if (await handleSaveRaw(activeTabId)) { await fetchSavedMonths(activeTabId); await fetchTransactionStats(activeTabId); await fetchAllTransactions(activeTabId); }
    }, [handleSaveRaw, activeTabId, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions]);

    const handleAddTransaction = useCallback(async (newTransaction) => {
        const ok = await handleAddRaw(newTransaction, activeTabId);
        if (ok) {
            setShowAddForm(false);
            await fetchSavedMonths(activeTabId);
            await fetchAllDescriptions();
            await fetchTransactionStats(activeTabId);
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else if (selectedMonth) await fetchMonthTransactions(selectedMonth, activeTabId);
        }
        return ok;
    }, [handleAddRaw, activeTabId, selectedMonth, fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats, fetchAllTransactions, fetchMonthTransactions]);

    const handleUpdateTransaction = useCallback(async (transactionId) => {
        const ok = await handleUpdateRaw(transactionId, editingTransaction);
        if (ok) {
            setEditingTransaction(null);
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchAllDescriptions();
            await fetchTransactionStats(activeTabId);
        }
    }, [handleUpdateRaw, editingTransaction, selectedMonth, activeTabId, fetchAllTransactions, fetchMonthTransactions, fetchAllDescriptions, fetchTransactionStats]);

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        const ok = await handleDeleteRaw(transactionId);
        if (ok) {
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleDeleteRaw, selectedMonth, activeTabId, fetchAllTransactions, fetchMonthTransactions, fetchSavedMonths, fetchTransactionStats]);

    const handleDeleteMonth = useCallback(async (monthYear) => {
        const label = monthYear === 'all' ? 'All Transactions' : new Date(...monthYear.split('-').map((v, i) => i === 1 ? v - 1 : v)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!window.confirm(`Delete all transactions for ${label}?`)) return;
        if (await handleDeleteMonthRaw(monthYear, activeTabId)) { await fetchSavedMonths(activeTabId); await fetchTransactionStats(activeTabId); }
    }, [handleDeleteMonthRaw, activeTabId, fetchSavedMonths, fetchTransactionStats]);

    const fetchAllTransactionsWrapped = useCallback(async () => { setVisibleTransactions(50); await fetchAllTransactions(activeTabId); }, [fetchAllTransactions, activeTabId]);
    const fetchMonthTransactionsWrapped = useCallback(async (monthYear) => { setVisibleTransactions(50); await fetchMonthTransactions(monthYear, activeTabId); }, [fetchMonthTransactions, activeTabId]);

    const formatMonthYear = useCallback((monthYear) => {
        if (!monthYear || monthYear === 'all') return 'All Transactions';
        const [year, month] = monthYear.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, []);

    const getDescriptionHistory = useCallback((transaction) => (
        monthTransactions.filter(t => t.id !== transaction.id && t.description === transaction.description)
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)).slice(0, 5)
    ), [monthTransactions]);

    const exportToPDF = useCallback(() => exportBankTransactionsPDF(filteredTransactions, selectedMonth), [filteredTransactions, selectedMonth]);

    // ==================== TAB CALLBACKS ====================

    const onTabCreated = useCallback(async (newTabId) => {
        setActiveTabId(newTabId);
        storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(newTabId));
        setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); setVisibleTransactions(50);
        await fetchSavedMonths(newTabId);
        await fetchTransactionStats(newTabId);
        await fetchAllTransactions(newTabId);
    }, [fetchSavedMonths, fetchTransactionStats, fetchAllTransactions, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const onTabDeleted = useCallback(async (deletedTabId, updatedTabs) => {
        if (activeTabId === deletedTabId) {
            if (updatedTabs.length > 0) { handleSwitchTab(updatedTabs[0].id); }
            else { setActiveTabId(null); storage.remove(STORAGE_KEYS.ACTIVE_TAB_ID); setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); }
        }
    }, [activeTabId, handleSwitchTab, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const value = {
        onBackToTasks, authUser, authRole, colors,
        uploadedData, setUploadedData, savedMonths, selectedMonth, monthTransactions,
        allDescriptions, transactionStats,
        loading, error, setError, success, setSuccess,
        searchTerm, setSearchTerm, descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter, previewFilter, setPreviewFilter,
        visibleTransactions, setVisibleTransactions,
        editingTransaction, setEditingTransaction, showAddForm, setShowAddForm,
        expandedDescriptionId, setExpandedDescriptionId,
        tabs, setTabs, activeTabId, orphanedCount,
        handleSwitchTab, handleCreateFirstTab, adoptOrphanedTransactions,
        onTabCreated, onTabDeleted,
        fetchAllTransactions: fetchAllTransactionsWrapped,
        fetchMonthTransactions: fetchMonthTransactionsWrapped,
        handleFileUpload, handleSaveTransactions, handleAddTransaction,
        handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
        filteredTransactions, totalFiltered, creditTotal, cashTotal, chartData,
        formatMonthYear, aggregateByCategory, getDescriptionHistory,
        getFilteredPreview: (ud) => getFilteredPreview(ud),
        exportToPDF,
    };

    return <BankTransactionContext.Provider value={value}>{children}</BankTransactionContext.Provider>;
};

export default BankTransactionContext;
