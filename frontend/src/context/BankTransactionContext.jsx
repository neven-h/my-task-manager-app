import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import useBankTransactionData from '../hooks/useBankTransactionData';
import { formatCurrency } from '../utils/formatCurrency';

const BankTransactionContext = createContext(null);

export const useBankTransactionContext = () => {
    const ctx = useContext(BankTransactionContext);
    if (!ctx) throw new Error('useBankTransactionContext must be used within a BankTransactionProvider');
    return ctx;
};

// Color scheme - matching TaskTracker theme
const colors = {
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    success: '#00AA00',
    background: '#fff',
    card: '#ffffff',
    text: '#000',
    textLight: '#666',
    border: '#000'
};

export const BankTransactionProvider = ({ onBackToTasks, authUser, authRole, children }) => {
    const data = useBankTransactionData();
    const {
        uploadedData, setUploadedData,
        savedMonths, setSavedMonths,
        selectedMonth, setSelectedMonth,
        monthTransactions, setMonthTransactions,
        allDescriptions,
        transactionStats,
        loading, setLoading,
        error, setError,
        success, setSuccess,
        tabs, setTabs,
        activeTabId, setActiveTabId,
        orphanedCount,
        fetchTabs,
        checkOrphanedTransactions,
        adoptOrphanedTransactions: adoptOrphanedRaw,
        handleCreateFirstTab: createFirstTabRaw,
        fetchAllDescriptions,
        fetchTransactionStats,
        fetchSavedMonths,
        fetchAllTransactions,
        fetchMonthTransactions,
        handleFileUpload: handleFileUploadRaw,
        handleSaveTransactions: handleSaveRaw,
        handleAddTransaction: handleAddRaw,
        handleUpdateTransaction: handleUpdateRaw,
        handleDeleteTransaction: handleDeleteRaw,
        handleDeleteMonth: handleDeleteMonthRaw,
    } = data;

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [descriptionFilter, setDescriptionFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [previewFilter, setPreviewFilter] = useState('all');
    const [transactionType, setTransactionType] = useState('credit');
    const [visibleTransactions, setVisibleTransactions] = useState(50);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    // ==================== INITIALIZATION ====================

    useEffect(() => {
        const initializeData = async () => {
            const fetchedTabs = await fetchTabs();
            await checkOrphanedTransactions();

            if (!fetchedTabs || fetchedTabs.length === 0) {
                setActiveTabId(null);
                return;
            }

            const savedTabId = localStorage.getItem('activeTabId');
            let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;

            if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) {
                tabIdToUse = fetchedTabs[0].id;
            }

            setActiveTabId(tabIdToUse);
            localStorage.setItem('activeTabId', String(tabIdToUse));

            const fetchedMonths = await fetchSavedMonths(tabIdToUse);
            await fetchAllDescriptions();
            await fetchTransactionStats(tabIdToUse);

            const savedMonth = localStorage.getItem('selectedMonth');
            const monthList = fetchedMonths || [];
            if (savedMonth && savedMonth !== 'all' && monthList.some(m => m.month_year ? m.month_year === savedMonth : m === savedMonth)) {
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
        localStorage.setItem('activeTabId', String(tabId));
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
        setActiveTabId, setSelectedMonth, setMonthTransactions, setUploadedData]);

    // ==================== WRAPPED CRUD (with data refresh) ====================

    const adoptOrphanedTransactions = useCallback(async (tabId) => {
        const ok = await adoptOrphanedRaw(tabId);
        if (ok) {
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
            localStorage.setItem('activeTabId', String(result.id));
            setMonthTransactions([]);
            setSavedMonths([]);
            setSelectedMonth(null);
            await fetchSavedMonths(result.id);
            await fetchTransactionStats(result.id);
            await fetchAllTransactions(result.id);
        }
        return result;
    }, [createFirstTabRaw, fetchTabs, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const handleFileUpload = useCallback(async (event) => {
        await handleFileUploadRaw(event, transactionType);
        setPreviewFilter('all');
    }, [handleFileUploadRaw, transactionType]);

    const handleSaveTransactions = useCallback(async () => {
        const ok = await handleSaveRaw(activeTabId);
        if (ok) {
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
            await fetchAllTransactions(activeTabId);
        }
    }, [handleSaveRaw, activeTabId, fetchSavedMonths, fetchTransactionStats, fetchAllTransactions]);

    const handleAddTransaction = useCallback(async (newTransaction) => {
        const ok = await handleAddRaw(newTransaction, activeTabId);
        if (ok) {
            setShowAddForm(false);
            await fetchSavedMonths(activeTabId);
            await fetchAllDescriptions();
            await fetchTransactionStats(activeTabId);
            if (selectedMonth === 'all') {
                await fetchAllTransactions(activeTabId);
            } else if (selectedMonth) {
                await fetchMonthTransactions(selectedMonth, activeTabId);
            }
        }
        return ok;
    }, [handleAddRaw, activeTabId, selectedMonth, fetchSavedMonths, fetchAllDescriptions,
        fetchTransactionStats, fetchAllTransactions, fetchMonthTransactions]);

    const handleUpdateTransaction = useCallback(async (transactionId) => {
        const ok = await handleUpdateRaw(transactionId, editingTransaction);
        if (ok) {
            setEditingTransaction(null);
            if (selectedMonth === 'all') {
                await fetchAllTransactions(activeTabId);
            } else {
                await fetchMonthTransactions(selectedMonth, activeTabId);
            }
            await fetchAllDescriptions();
            await fetchTransactionStats(activeTabId);
        }
    }, [handleUpdateRaw, editingTransaction, selectedMonth, activeTabId,
        fetchAllTransactions, fetchMonthTransactions, fetchAllDescriptions, fetchTransactionStats]);

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        const ok = await handleDeleteRaw(transactionId);
        if (ok) {
            if (selectedMonth === 'all') {
                await fetchAllTransactions(activeTabId);
            } else {
                await fetchMonthTransactions(selectedMonth, activeTabId);
            }
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleDeleteRaw, selectedMonth, activeTabId, fetchAllTransactions,
        fetchMonthTransactions, fetchSavedMonths, fetchTransactionStats]);

    const handleDeleteMonth = useCallback(async (monthYear) => {
        if (!window.confirm(`Delete all transactions for ${formatMonthYear(monthYear)}?`)) return;
        const ok = await handleDeleteMonthRaw(monthYear, activeTabId);
        if (ok) {
            await fetchSavedMonths(activeTabId);
            await fetchTransactionStats(activeTabId);
        }
    }, [handleDeleteMonthRaw, activeTabId, fetchSavedMonths, fetchTransactionStats]);

    // ==================== WRAPPED DATA FETCHERS (auto-pass activeTabId) ====================

    const fetchAllTransactionsWrapped = useCallback(async () => {
        setVisibleTransactions(50);
        await fetchAllTransactions(activeTabId);
    }, [fetchAllTransactions, activeTabId]);

    const fetchMonthTransactionsWrapped = useCallback(async (monthYear) => {
        setVisibleTransactions(50);
        await fetchMonthTransactions(monthYear, activeTabId);
    }, [fetchMonthTransactions, activeTabId]);

    // ==================== HELPERS ====================

    const formatMonthYear = useCallback((monthYear) => {
        if (!monthYear || monthYear === 'all') return 'All Transactions';
        const [year, month] = monthYear.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, []);

    const aggregateByCategory = useCallback((transactions) => {
        const categoryData = {};
        transactions.forEach(t => {
            const desc = t.description || 'Other';
            if (!categoryData[desc]) {
                categoryData[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
            }
            categoryData[desc].count++;
            categoryData[desc].total += t.amount;
            if (t.transaction_type === 'cash') {
                categoryData[desc].cash += t.amount;
            } else {
                categoryData[desc].credit += t.amount;
            }
        });
        return categoryData;
    }, []);

    const getDescriptionHistory = useCallback((transaction) => {
        return monthTransactions
            .filter(t => t.id !== transaction.id && t.description === transaction.description)
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
            .slice(0, 5);
    }, [monthTransactions]);

    const getFilteredPreview = useCallback(() => {
        if (!uploadedData?.transactions) return [];
        return uploadedData.transactions.filter(t => {
            if (previewFilter === 'positive' && t.amount < 0) return false;
            return !(previewFilter === 'negative' && t.amount >= 0);
        });
    }, [uploadedData, previewFilter]);

    // ==================== MEMOIZED VALUES ====================

    const filteredTransactions = useMemo(() => {
        if (!Array.isArray(monthTransactions)) return [];
        return monthTransactions.filter(t => {
            if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
            if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return !(descriptionFilter && t.description !== descriptionFilter);
        });
    }, [monthTransactions, typeFilter, searchTerm, descriptionFilter]);

    const { totalFiltered, creditTotal, cashTotal } = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => ({
            totalFiltered: acc.totalFiltered + t.amount,
            creditTotal: acc.creditTotal + (t.transaction_type === 'credit' ? t.amount : 0),
            cashTotal: acc.cashTotal + (t.transaction_type === 'cash' ? t.amount : 0)
        }), { totalFiltered: 0, creditTotal: 0, cashTotal: 0 });
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        if (monthTransactions.length === 0) return null;
        const categoryData = aggregateByCategory(filteredTransactions);
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5);
        return { sortedCategories, totalAmount: totalFiltered };
    }, [filteredTransactions, monthTransactions.length, totalFiltered, aggregateByCategory]);

    // ==================== EXPORT PDF ====================

    const exportToPDF = useCallback(() => {
        const filtered = filteredTransactions;
        const printWindow = window.open('', '_blank');

        const { totalCredit, totalCash, total } = filtered.reduce((acc, t) => {
            acc.total += t.amount;
            if (t.transaction_type === 'credit') {
                acc.totalCredit += t.amount;
            } else if (t.transaction_type === 'cash') {
                acc.totalCash += t.amount;
            }
            return acc;
        }, { totalCredit: 0, totalCash: 0, total: 0 });

        const categories = aggregateByCategory(filtered);
        const sortedCategories = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);

        printWindow.document.write(`
      <html lang="en">
      <head>
        <title>Bank Transactions Report - ${selectedMonth === 'all' ? 'All' : formatMonthYear(selectedMonth)}</title>
        <style>
          body { font-family: 'Inter', 'Helvetica Neue', Calibri, sans-serif; padding: 20px; color: #000; }
          h1 { color: #000; border-bottom: 4px solid #000; padding-bottom: 10px; }
          h2 { color: #000; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
          .summary-box { background: #fff; padding: 15px 25px; border: 3px solid #000; }
          .summary-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
          .summary-box p { margin: 0; font-size: 24px; font-weight: bold; }
          .credit { color: #0000FF; }
          .cash { color: #00AA00; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 3px solid #000; }
          th, td { border: 1px solid #000; padding: 12px; text-align: left; }
          th { background: #0000FF; color: white; }
          tr:nth-child(even) { background: #f8f8f8; }
          .amount { text-align: right; font-family: monospace; font-size: 14px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>💰 Bank Transactions Report</h1>
        <p><strong>Period:</strong> ${selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth)}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

        <div class="summary">
          <div class="summary-box">
            <h3>Total Spending</h3>
            <p>${formatCurrency(total)}</p>
          </div>
          <div class="summary-box">
            <h3 class="credit">💳 Credit Card</h3>
            <p class="credit">${formatCurrency(totalCredit)}</p>
          </div>
          <div class="summary-box">
            <h3 class="cash">💵 Cash</h3>
            <p class="cash">${formatCurrency(totalCash)}</p>
          </div>
          <div class="summary-box">
            <h3>Transaction Count</h3>
            <p>${filtered.length}</p>
          </div>
        </div>

        <h2>📊 By Category</h2>
        <table>
          <thead>
            <tr><th>Category</th><th>Count</th><th>Credit</th><th>Cash</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${sortedCategories.map(([cat, d]) => `
              <tr>
                <td>${cat}</td>
                <td>${d.count}</td>
                <td class="amount credit">${formatCurrency(d.credit)}</td>
                <td class="amount cash">${formatCurrency(d.cash)}</td>
                <td class="amount" style="font-weight: bold;">${formatCurrency(d.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>📋 All Transactions</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${filtered.map(t => `
              <tr>
                <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td>${t.transaction_type === 'cash' ? '💵 Cash' : '💳 Credit'}</td>
                <td class="amount" style="font-weight: bold;">${formatCurrency(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    }, [filteredTransactions, selectedMonth, formatMonthYear, aggregateByCategory]);

    // ==================== TAB BAR CALLBACKS ====================

    const onTabCreated = useCallback(async (newTabId) => {
        setActiveTabId(newTabId);
        localStorage.setItem('activeTabId', String(newTabId));
        setMonthTransactions([]);
        setSavedMonths([]);
        setSelectedMonth(null);
        setVisibleTransactions(50);
        await fetchSavedMonths(newTabId);
        await fetchTransactionStats(newTabId);
        await fetchAllTransactions(newTabId);
    }, [fetchSavedMonths, fetchTransactionStats, fetchAllTransactions,
        setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const onTabDeleted = useCallback(async (deletedTabId, updatedTabs) => {
        if (activeTabId === deletedTabId) {
            if (updatedTabs.length > 0) {
                handleSwitchTab(updatedTabs[0].id);
            } else {
                setActiveTabId(null);
                localStorage.removeItem('activeTabId');
                setMonthTransactions([]);
                setSavedMonths([]);
                setSelectedMonth(null);
            }
        }
    }, [activeTabId, handleSwitchTab, setActiveTabId, setMonthTransactions, setSavedMonths, setSelectedMonth]);

    const value = {
        // Auth / nav
        onBackToTasks, authUser, authRole,

        // Colors
        colors,

        // Core data
        uploadedData, setUploadedData,
        savedMonths,
        selectedMonth,
        monthTransactions,
        allDescriptions,
        transactionStats,

        // UI state
        loading, error, setError,
        success, setSuccess,

        // Filter state
        searchTerm, setSearchTerm,
        descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter,
        previewFilter, setPreviewFilter,
        transactionType, setTransactionType,
        visibleTransactions, setVisibleTransactions,
        editingTransaction, setEditingTransaction,
        showAddForm, setShowAddForm,
        expandedDescriptionId, setExpandedDescriptionId,

        // Tab state
        tabs, setTabs,
        activeTabId,
        orphanedCount,

        // Tab functions
        handleSwitchTab,
        handleCreateFirstTab,
        adoptOrphanedTransactions,
        onTabCreated,
        onTabDeleted,

        // Data functions (wrapped to auto-pass activeTabId)
        fetchAllTransactions: fetchAllTransactionsWrapped,
        fetchMonthTransactions: fetchMonthTransactionsWrapped,

        // CRUD
        handleFileUpload,
        handleSaveTransactions,
        handleAddTransaction,
        handleUpdateTransaction,
        handleDeleteTransaction,
        handleDeleteMonth,

        // Memoized
        filteredTransactions,
        totalFiltered, creditTotal, cashTotal,
        chartData,

        // Helpers
        formatMonthYear,
        aggregateByCategory,
        getDescriptionHistory,
        getFilteredPreview,
        exportToPDF,
    };

    return <BankTransactionContext.Provider value={value}>{children}</BankTransactionContext.Provider>;
};

export default BankTransactionContext;
