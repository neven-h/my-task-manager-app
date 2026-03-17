import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useBankTransactionData from '../hooks/useBankTransactionData';
import useBankTransactionFilters from '../hooks/useBankTransactionFilters';
import useTransactionSelection from '../hooks/useTransactionSelection';
import { useBankTransactionAI } from '../hooks/useBankTransactionAI';
import { useBankTransactionExport } from '../hooks/useBankTransactionExport';
import { useBankTransactionCRUDHandlers } from '../hooks/useBankTransactionCRUDHandlers';
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
        allDescriptions, transactionStats, setTransactionStats, loading, setLoading, error, setError, success, setSuccess,
        tabs, setTabs, activeTabId, setActiveTabId, orphanedCount,
        fetchTabs, checkOrphanedTransactions, adoptOrphanedTransactions: adoptOrphanedRaw,
        handleCreateFirstTab: createFirstTabRaw, fetchAllDescriptions, fetchTransactionStats,
        fetchSavedMonths, fetchAllTransactions, fetchMonthTransactions,
        handleFileUpload: handleFileUploadRaw, handleSaveTransactions: handleSaveRaw,
        handleAddTransaction: handleAddRaw, handleUpdateTransaction: handleUpdateRaw,
        handleDeleteTransaction: handleDeleteRaw, handleDeleteMonth: handleDeleteMonthRaw,
    } = data;

    const { searchTerm, setSearchTerm, descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter, previewFilter, setPreviewFilter,
        dateFrom, setDateFrom, dateTo, setDateTo, amountMin, setAmountMin, amountMax, setAmountMax,
        filteredTransactions, totalFiltered, creditTotal, cashTotal,
        chartData, aggregateByCategory, getFilteredPreview,
    } = useBankTransactionFilters(monthTransactions);

    const selection = useTransactionSelection(activeTabId, setError);

    const handleDeleteSelected = useCallback(async () => {
        const ok = await selection.deleteSelected();
        if (ok) {
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [selection, selectedMonth, activeTabId, fetchAllTransactions, fetchMonthTransactions, fetchSavedMonths, fetchTransactionStats]);

    const handleRenameSelected = useCallback(async (newDescription) => {
        const ok = await selection.renameSelected(newDescription);
        if (ok) {
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchAllDescriptions();
        }
    }, [selection, selectedMonth, activeTabId, fetchAllTransactions, fetchMonthTransactions, fetchAllDescriptions]);

    const [transactionType, setTransactionType] = useState('credit');
    const [visibleTransactions, setVisibleTransactions] = useState(15);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploadTargetTabId, setUploadTargetTabId] = useState(null);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    const { txPredictions, spendingInsights, insightsLoading, fetchTransactionPredictions, fetchSpendingInsights } =
        useBankTransactionAI(activeTabId, setError);
    const { exportToPDF, exportTransactionsCSV } =
        useBankTransactionExport(activeTabId, selectedMonth, filteredTransactions, setError);

    const handleSwitchTab = useCallback(async (tabId) => {
        setActiveTabId(tabId);
        storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(tabId));
        setSelectedMonth(null); setMonthTransactions([]); setTransactionStats(null);
        setUploadedData(null); setUploadTargetTabId(null);
        setSearchTerm(''); setDescriptionFilter(''); setTypeFilter('all'); setVisibleTransactions(15);
        selection.clearSelection();
        await Promise.all([fetchSavedMonths(tabId), fetchAllDescriptions(), fetchTransactionStats(tabId), fetchAllTransactions(tabId)]);
    }, [fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setSelectedMonth, setMonthTransactions, setTransactionStats, setUploadedData,
        setSearchTerm, setDescriptionFilter, setTypeFilter, selection]);

    const crud = useBankTransactionCRUDHandlers({
        activeTabId, selectedMonth, editingTransaction, uploadTargetTabId, transactionType,
        setUploadTargetTabId, setShowAddForm, setEditingTransaction, setVisibleTransactions,
        setDescriptionFilter, setSuccess, setError,
        adoptOrphanedRaw, createFirstTabRaw, handleFileUploadRaw, handleSaveRaw,
        handleAddRaw, handleUpdateRaw, handleDeleteRaw, handleDeleteMonthRaw,
        fetchTabs, fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats,
        fetchAllTransactions, fetchMonthTransactions,
        setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth, setTransactionStats,
        setUploadedData, setSearchTerm, setTypeFilter, setPreviewFilter, handleSwitchTab, selection,
    });

    useEffect(() => {
        const init = async () => {
            const [fetchedTabs] = await Promise.all([fetchTabs(), checkOrphanedTransactions()]);
            if (!fetchedTabs || fetchedTabs.length === 0) { setActiveTabId(null); return; }
            const savedTabId = storage.get(STORAGE_KEYS.ACTIVE_TAB_ID);
            let tabId = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;
            if (!tabId || !fetchedTabs.find(t => t.id === tabId)) tabId = fetchedTabs[0].id;
            setActiveTabId(tabId);
            storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(tabId));
            const savedMonth = storage.get(STORAGE_KEYS.SELECTED_MONTH);
            const useSpecific = savedMonth && savedMonth !== 'all';
            const [fetchedMonths] = await Promise.all([
                fetchSavedMonths(tabId), fetchAllDescriptions(), fetchTransactionStats(tabId),
                useSpecific ? fetchMonthTransactions(savedMonth, tabId) : fetchAllTransactions(tabId),
            ]);
            if (useSpecific && !(fetchedMonths || []).some(m => (m.month_year ?? m) === savedMonth))
                await fetchAllTransactions(tabId);
        };
        init();
    }, []);

    const formatMonthYear = useCallback((my) => {
        if (!my || my === 'all') return 'All Transactions';
        const [y, m] = my.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, []);

    const getDescriptionHistory = useCallback((tx) =>
        monthTransactions.filter(t => t.id !== tx.id && t.description === tx.description)
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)).slice(0, 5),
    [monthTransactions]);

    const onTabCreated = useCallback(async (newTabId) => {
        setActiveTabId(newTabId);
        storage.set(STORAGE_KEYS.ACTIVE_TAB_ID, String(newTabId));
        setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); setTransactionStats(null); setVisibleTransactions(15);
        await Promise.all([fetchSavedMonths(newTabId), fetchTransactionStats(newTabId), fetchAllTransactions(newTabId)]);
    }, [fetchSavedMonths, fetchTransactionStats, fetchAllTransactions, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth, setTransactionStats]);

    const onTabDeleted = useCallback(async (deletedTabId, updatedTabs) => {
        if (activeTabId === deletedTabId) {
            if (updatedTabs.length > 0) handleSwitchTab(updatedTabs[0].id);
            else { setActiveTabId(null); storage.remove(STORAGE_KEYS.ACTIVE_TAB_ID); setMonthTransactions([]); setSavedMonths([]); setSelectedMonth(null); }
        }
    }, [activeTabId, handleSwitchTab, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const fetchAllTransactionsWrapped = useCallback(async () => { setVisibleTransactions(15); await fetchAllTransactions(activeTabId); }, [fetchAllTransactions, activeTabId]);
    const fetchMonthTransactionsWrapped = useCallback(async (my) => { setVisibleTransactions(15); await fetchMonthTransactions(my, activeTabId); }, [fetchMonthTransactions, activeTabId]);

    const value = {
        onBackToTasks, authUser, authRole, colors,
        uploadedData, setUploadedData, savedMonths, selectedMonth, monthTransactions,
        allDescriptions, transactionStats, loading, error, setError, success, setSuccess,
        searchTerm, setSearchTerm, descriptionFilter, setDescriptionFilter,
        transactionType, setTransactionType, typeFilter, setTypeFilter, previewFilter, setPreviewFilter,
        dateFrom, setDateFrom, dateTo, setDateTo, amountMin, setAmountMin, amountMax, setAmountMax,
        visibleTransactions, setVisibleTransactions, editingTransaction, setEditingTransaction,
        showAddForm, setShowAddForm, uploadTargetTabId, setUploadTargetTabId,
        expandedDescriptionId, setExpandedDescriptionId,
        selectedIds: selection.selectedIds, toggleSelected: selection.toggleSelected,
        toggleSelectAll: selection.selectAll, clearSelection: selection.clearSelection,
        selectAllFiltered: () => selection.selectAll(filteredTransactions.map(t => t.id)),
        handleDeleteSelected, handleRenameSelected, exportSelectedCSV: selection.exportSelected,
        filteredCount: filteredTransactions.length,
        tabs, setTabs, activeTabId, orphanedCount,
        handleSwitchTab, onTabCreated, onTabDeleted,
        fetchAllTransactions: fetchAllTransactionsWrapped,
        fetchMonthTransactions: fetchMonthTransactionsWrapped,
        filteredTransactions, totalFiltered, creditTotal, cashTotal, chartData,
        formatMonthYear, aggregateByCategory, getDescriptionHistory,
        getFilteredPreview: (ud) => getFilteredPreview(ud),
        exportToPDF, exportTransactionsCSV,
        txPredictions, fetchTransactionPredictions,
        spendingInsights, insightsLoading, fetchSpendingInsights,
        ...crud,
    };

    return <BankTransactionContext.Provider value={value}>{children}</BankTransactionContext.Provider>;
};

export default BankTransactionContext;
