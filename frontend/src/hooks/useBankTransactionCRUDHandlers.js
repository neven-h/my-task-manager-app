import { useCallback } from 'react';
import storage, { STORAGE_KEYS } from '../utils/storage';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import { clearDescCache } from './useBankTransactionData';

/**
 * Wraps raw CRUD + rename handlers for BankTransactionContext.
 * All handlers refresh the relevant data after mutation.
 */
export const useBankTransactionCRUDHandlers = ({
    activeTabId, selectedMonth, editingTransaction, uploadTargetTabId, transactionType,
    setUploadTargetTabId, setShowAddForm, setEditingTransaction, setVisibleTransactions,
    setDescriptionFilter, setSuccess, setError,
    adoptOrphanedRaw, createFirstTabRaw, handleFileUploadRaw, handleSaveRaw,
    handleAddRaw, handleUpdateRaw, handleDeleteRaw, handleDeleteMonthRaw,
    fetchTabs, fetchSavedMonths, fetchAllDescriptions, fetchTransactionStats,
    fetchAllTransactions, fetchMonthTransactions,
    setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth, setTransactionStats,
    setUploadedData, setSearchTerm, setTypeFilter, setPreviewFilter,
    handleSwitchTab, selection,
}) => {
    const adoptOrphanedTransactions = useCallback(async (tabId) => {
        if (await adoptOrphanedRaw(tabId)) {
            await fetchSavedMonths(tabId);
            await fetchTransactionStats(tabId);
            await fetchAllTransactions(tabId);
        }
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

    const handleFileUpload = useCallback(async (event) => {
        await handleFileUploadRaw(event, transactionType);
        setPreviewFilter('all');
    }, [handleFileUploadRaw, transactionType, setPreviewFilter]);

    const handleSaveTransactions = useCallback(async () => {
        const targetTabId = uploadTargetTabId || activeTabId;
        if (await handleSaveRaw(targetTabId)) { setUploadTargetTabId(null); await handleSwitchTab(targetTabId); }
    }, [handleSaveRaw, uploadTargetTabId, activeTabId, handleSwitchTab, setUploadTargetTabId]);

    const handleAddTransaction = useCallback(async (newTransaction) => {
        const ok = await handleAddRaw(newTransaction, activeTabId);
        if (ok) {
            setShowAddForm(false);
            clearDescCache();
            await fetchSavedMonths(activeTabId);
            await fetchAllDescriptions(activeTabId);
            await fetchTransactionStats(activeTabId);
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else if (selectedMonth) await fetchMonthTransactions(selectedMonth, activeTabId);
        }
        return ok;
    }, [handleAddRaw, activeTabId, selectedMonth, fetchSavedMonths, fetchAllDescriptions,
        fetchTransactionStats, fetchAllTransactions, fetchMonthTransactions, setShowAddForm]);

    const handleUpdateTransaction = useCallback(async (transactionId) => {
        const ok = await handleUpdateRaw(transactionId, editingTransaction);
        if (ok) {
            setEditingTransaction(null);
            clearDescCache();
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchAllDescriptions(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleUpdateRaw, editingTransaction, selectedMonth, activeTabId,
        fetchAllTransactions, fetchMonthTransactions, fetchAllDescriptions, fetchTransactionStats, setEditingTransaction]);

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        const ok = await handleDeleteRaw(transactionId);
        if (ok) {
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleDeleteRaw, selectedMonth, activeTabId,
        fetchAllTransactions, fetchMonthTransactions, fetchSavedMonths, fetchTransactionStats]);

    const handleDeleteMonth = useCallback(async (monthYear) => {
        const label = monthYear === 'all' ? 'All Transactions'
            : new Date(...monthYear.split('-').map((v, i) => i === 1 ? v - 1 : v))
                .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!window.confirm(`Delete all transactions for ${label}?`)) return;
        if (await handleDeleteMonthRaw(monthYear, activeTabId)) {
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleDeleteMonthRaw, activeTabId, fetchSavedMonths, fetchTransactionStats]);

    const handleBatchRename = useCallback(async (oldDesc, newDesc) => {
        if (!activeTabId || !oldDesc || !newDesc) return;
        try {
            const res = await fetch(`${API_BASE}/transactions/batch/rename`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: activeTabId, old_description: oldDesc, new_description: newDesc }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Rename failed');
            const result = await res.json();
            setDescriptionFilter('');
            clearDescCache();
            if (selectedMonth === 'all') await fetchAllTransactions(activeTabId);
            else await fetchMonthTransactions(selectedMonth, activeTabId);
            await fetchAllDescriptions(activeTabId);
            setSuccess(`${result.updated} transactions renamed`);
        } catch (err) {
            setError(err.message);
        }
    }, [activeTabId, selectedMonth, fetchAllTransactions, fetchMonthTransactions,
        fetchAllDescriptions, setDescriptionFilter, setError, setSuccess]);

    return {
        adoptOrphanedTransactions, handleCreateFirstTab, handleFileUpload,
        handleSaveTransactions, handleAddTransaction, handleUpdateTransaction,
        handleDeleteTransaction, handleDeleteMonth, handleBatchRename,
    };
};

export default useBankTransactionCRUDHandlers;
