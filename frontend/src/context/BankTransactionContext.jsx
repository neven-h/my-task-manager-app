import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useBankTransactionData from '../hooks/useBankTransactionData';
import useBankTransactionFilters from '../hooks/useBankTransactionFilters';
import { exportBankTransactionsPDF } from '../utils/exportBankPDF';
import storage, { STORAGE_KEYS } from '../utils/storage';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

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
        allDescriptions, transactionStats, setTransactionStats, loading, setLoading, error, setError, success, setSuccess,
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

    const [transactionType, setTransactionType] = useState('credit');
    const [visibleTransactions, setVisibleTransactions] = useState(50);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    // ==================== INITIALIZATION ====================

    useEffect(() => {
        const initializeData = async () => {
            // Phase 1: tabs + orphan check in parallel
            const [fetchedTabs] = await Promise.all([
                fetchTabs(),
                checkOrphanedTransactions(),
            ]);
            if (!fetchedTabs || fetchedTabs.length === 0) { setActiveTabId(null); return; }

            const savedTabId = storage.get(STORAGE_KEYS.ACTIVE_TAB_ID);
            let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;
            if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) tabIdToUse = fetchedTabs[0].id;

            setActiveTabId(tabIdToUse);
            storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(tabIdToUse));

            // Phase 2: all tab-specific fetches in parallel
            // Optimistically use the cached month from storage so transactions
            // load at the same time as months/stats/descriptions — saves 2 round-trips
            const savedMonth = storage.get(STORAGE_KEYS.SELECTED_MONTH);
            const shouldLoadSpecificMonth = savedMonth && savedMonth !== 'all';

            const [fetchedMonths] = await Promise.all([
                fetchSavedMonths(tabIdToUse),
                fetchAllDescriptions(),
                fetchTransactionStats(tabIdToUse),
                shouldLoadSpecificMonth
                    ? fetchMonthTransactions(savedMonth, tabIdToUse)
                    : fetchAllTransactions(tabIdToUse),
            ]);

            // Fallback: if cached month no longer exists in the list, load all
            const monthList = fetchedMonths || [];
            if (shouldLoadSpecificMonth && !monthList.some(m => (m.month_year ?? m) === savedMonth)) {
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
        setTransactionStats(null);
        setUploadedData(null);
        setSearchTerm('');
        setDescriptionFilter('');
        setTypeFilter('all');
        setVisibleTransactions(50);
        // All four fetches are independent — run in parallel
        await Promise.all([
            fetchSavedMonths(tabId),
            fetchAllDescriptions(),
            fetchTransactionStats(tabId),
            fetchAllTransactions(tabId),
        ]);
    }, [fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setSelectedMonth, setMonthTransactions, setTransactionStats, setUploadedData, setSearchTerm,
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
            setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); setTransactionStats(null);
            await fetchSavedMonths(result.id);
            await fetchTransactionStats(result.id);
            await fetchAllTransactions(result.id);
        }
        return result;
    }, [createFirstTabRaw, fetchTabs, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth, setTransactionStats]);

    const handleFileUpload = useCallback(async (event) => { await handleFileUploadRaw(event, transactionType); setPreviewFilter('all'); }, [handleFileUploadRaw, transactionType, setPreviewFilter]);

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

    const exportTransactionsCSV = useCallback(async () => {
        if (!activeTabId) return;
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
            const response = await fetch(`${API_BASE}/export/transactions/csv?${params}`, { headers: getAuthHeaders() });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${selectedMonth || 'all'}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    }, [activeTabId, selectedMonth, setError]);

    // ==================== TAB CALLBACKS ====================

    const onTabCreated = useCallback(async (newTabId) => {
        setActiveTabId(newTabId);
        storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(newTabId));
        setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); setTransactionStats(null); setVisibleTransactions(50);
        await fetchSavedMonths(newTabId);
        await fetchTransactionStats(newTabId);
        await fetchAllTransactions(newTabId);
    }, [fetchSavedMonths, fetchTransactionStats, fetchAllTransactions, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth, setTransactionStats]);

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
        transactionType, setTransactionType,
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
        exportTransactionsCSV,
    };

    return <BankTransactionContext.Provider value={value}>{children}</BankTransactionContext.Provider>;
};

export default BankTransactionContext;
