import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Calendar, Trash2, FileText, AlertCircle, CheckCircle, ArrowLeft, Plus, Edit2, Save, X, FileDown, Banknote, CreditCard, PieChart, Users } from 'lucide-react';
import API_BASE from './config';
import { formatCurrency } from './utils/formatCurrency';
import { getAuthHeaders } from './api.js';
import TabBar from './components/TabBar';

const BankTransactions = ({ onBackToTasks, authUser, authRole }) => {
  const [uploadedData, setUploadedData] = useState(null);
  const [savedMonths, setSavedMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [allDescriptions, setAllDescriptions] = useState([]);
  const [transactionType, setTransactionType] = useState('credit');
  const [transactionStats, setTransactionStats] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    month_year: new Date().toISOString().slice(0, 7),
    transaction_type: 'credit'
  });
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [visibleTransactions, setVisibleTransactions] = useState(50);

  // Tab state for organizing transactions
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null); // null = default (no tab)
  const [newTabName, setNewTabName] = useState('');
  const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);
  const [orphanedCount, setOrphanedCount] = useState(0);

  // Color scheme - matching TaskTracker theme
  const colors = {
    primary: '#0000FF',      // Blue (primary actions)
    secondary: '#FFD500',    // Yellow
    accent: '#FF0000',       // Red (for errors/warnings only)
    success: '#00AA00',      // Green
    background: '#fff',      // White
    card: '#ffffff',
    text: '#000',            // Black
    textLight: '#666',
    border: '#000'           // Black
  };

  // ==================== TAB FUNCTIONS ====================

  const fetchTabs = async () => {
    try {
      const response = await fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (Array.isArray(data)) {
        setTabs(data);
        return data;
      }
      setTabs([]);
      return [];
    } catch (err) {
      console.error('Error fetching tabs:', err);
      setTabs([]);
      return [];
    }
  };

  const handleSwitchTab = async (tabId) => {
    setActiveTabId(tabId);
    localStorage.setItem('activeTabId', String(tabId));
    setSelectedMonth(null);
    setMonthTransactions([]);
    setUploadedData(null);
    setSearchTerm('');
    setDescriptionFilter('');
    setTypeFilter('all');

    await fetchSavedMonths(tabId);
    await fetchAllDescriptions();
    await fetchTransactionStats(tabId);
    await fetchAllTransactions(tabId);
  };

  const handleCreateFirstTab = async () => {
    if (!newTabName.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/transaction-tabs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newTabName.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setNewTabName('');
        await fetchTabs();
        setActiveTabId(data.id);
        localStorage.setItem('activeTabId', String(data.id));
        setMonthTransactions([]);
        setSavedMonths([]);
        setSelectedMonth(null);
        await fetchSavedMonths(data.id);
        await fetchTransactionStats(data.id);
        await fetchAllTransactions(data.id);
      } else {
        setError(data.error || 'Failed to create tab');
      }
    } catch (err) {
      setError('Failed to create tab - server may be unavailable');
    }
  };

  const checkOrphanedTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/transaction-tabs/orphaned`, { headers: getAuthHeaders() });
      const data = await response.json();
      setOrphanedCount(data.count || 0);
    } catch (err) {
      console.error('Error checking orphaned transactions:', err);
    }
  };

  const adoptOrphanedTransactions = async (tabId) => {
    try {
      const response = await fetch(`${API_BASE}/transaction-tabs/${tabId}/adopt`, { method: 'POST', headers: getAuthHeaders() });
      if (response.ok) {
        setOrphanedCount(0);
        // Refresh data for the current tab
        await fetchSavedMonths(tabId);
        await fetchTransactionStats(tabId);
        await fetchAllTransactions(tabId);
      }
    } catch (err) {
      setError('Failed to assign transactions');
    }
  };

  // ==================== DATA FUNCTIONS ====================

  useEffect(() => {
    const initializeData = async () => {
      const fetchedTabs = await fetchTabs();
      await checkOrphanedTransactions();

      if (!fetchedTabs || fetchedTabs.length === 0) {
        // No tabs yet - don't load any transactions
        setActiveTabId(null);
        return;
      }

      // Restore last active tab, or pick the first tab
      const savedTabId = localStorage.getItem('activeTabId');
      let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;

      // Make sure the saved tab still exists
      if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) {
        tabIdToUse = fetchedTabs[0].id;
      }

      setActiveTabId(tabIdToUse);
      localStorage.setItem('activeTabId', String(tabIdToUse));

      const fetchedMonths = await fetchSavedMonths(tabIdToUse);
      await fetchAllDescriptions();
      await fetchTransactionStats(tabIdToUse);

      // Restore last selected month from localStorage, but validate it exists for this tab
      const savedMonth = localStorage.getItem('selectedMonth');
      const monthList = fetchedMonths || savedMonths || [];
      if (savedMonth && savedMonth !== 'all' && monthList.includes(savedMonth)) {
        await fetchMonthTransactions(savedMonth, tabIdToUse);
      } else {
        await fetchAllTransactions(tabIdToUse);
      }
    };

    initializeData();
  }, []);

  const fetchAllDescriptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/descriptions`, { headers: getAuthHeaders() });
      const data = await response.json();
      setAllDescriptions(data);
    } catch (err) {
      console.error('Error fetching descriptions:', err);
    }
  };

  const fetchTransactionStats = async (tabId) => {
    try {
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `?tab_id=${tid}` : '';
      const url = `${API_BASE}/transactions/stats${tabParam}`;
      console.log('[BankTransactions] Fetching stats from:', url, 'tabId:', tid);
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      console.log('[BankTransactions] Stats response:', data);

      if (!data.by_type || data.by_type.length === 0) {
        console.warn('[BankTransactions] WARNING: No stats returned for tab', tid);
        console.warn('[BankTransactions] This might mean:',
          '\n  1. No transactions exist for this tab',
          '\n  2. Transactions exist but have different tab_id',
          '\n  3. Backend filtering is incorrect');
      }

      setTransactionStats(data);
    } catch (err) {
      console.error('[BankTransactions] Error fetching stats:', err);
    }
  };

  const fetchSavedMonths = async (tabId) => {
    try {
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `?tab_id=${tid}` : '';
      const response = await fetch(`${API_BASE}/transactions/months${tabParam}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setSavedMonths(data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching months:', err);
      return [];
    }
  };

  const fetchAllTransactions = async (tabId) => {
    try {
      setLoading(true);
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `?tab_id=${tid}` : '';
      const response = await fetch(`${API_BASE}/transactions/all${tabParam}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || 'Failed to fetch transactions');
      }
      setMonthTransactions(data);
      setSelectedMonth('all');
      setVisibleTransactions(50);
      localStorage.setItem('selectedMonth', 'all');
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions');
      setSelectedMonth('all');
      setMonthTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthTransactions = async (monthYear, tabId) => {
    try {
      setLoading(true);
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `?tab_id=${tid}` : '';
      const response = await fetch(`${API_BASE}/transactions/${monthYear}${tabParam}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || 'Failed to fetch month transactions');
      }
      setMonthTransactions(data);
      setSelectedMonth(monthYear);
      setVisibleTransactions(50);
      localStorage.setItem('selectedMonth', monthYear);
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions');
      // Fallback: show all transactions so the UI doesn't go blank
      try {
        await fetchAllTransactions(tabId);
      } catch {
        setSelectedMonth('all');
        setMonthTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('transaction_type', transactionType);

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE}/transactions/upload`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formData
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        console.error(`Server error: Expected JSON but got ${contentType}`);
        throw new Error(`Server error: Expected JSON but got ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to save task');
      }

      setUploadedData(data);
      setPreviewFilter('all');
      const typeLabel = transactionType === 'cash' ? 'cash' : 'credit card';
      setSuccess(`Successfully parsed ${data.transaction_count} ${typeLabel} transactions.`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransactions = async () => {
    if (!uploadedData) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          transactions: uploadedData.transactions,
          tab_id: activeTabId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save transactions');
        return;
      }

      setSuccess(data.message);
      setUploadedData(null);
      await fetchSavedMonths(activeTabId);
      await fetchTransactionStats(activeTabId);
      await fetchAllTransactions(activeTabId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/manual`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...newTransaction, tab_id: activeTabId })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(data.error || 'Failed to add transaction');
      }

      setSuccess('Transaction added successfully');
      setShowAddForm(false);
      setNewTransaction({
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        account_number: '',
        month_year: new Date().toISOString().slice(0, 7),
        transaction_type: 'credit'
      });
      
      await fetchSavedMonths(activeTabId);
      await fetchAllDescriptions();
      await fetchTransactionStats(activeTabId);
      if (selectedMonth === 'all') {
        await fetchAllTransactions(activeTabId);
      } else if (selectedMonth) {
        await fetchMonthTransactions(selectedMonth, activeTabId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (transactionId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingTransaction)
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(data.error || 'Failed to update transaction');
      }

      setSuccess('Transaction updated successfully');
      setEditingTransaction(null);
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions(activeTabId);
      } else {
        await fetchMonthTransactions(selectedMonth, activeTabId);
      }
      await fetchAllDescriptions();
      await fetchTransactionStats(activeTabId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Failed to delete transaction');
      }

      setSuccess('Transaction deleted successfully');
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions(activeTabId);
      } else {
        await fetchMonthTransactions(selectedMonth, activeTabId);
      }
      await fetchSavedMonths(activeTabId);
      await fetchTransactionStats(activeTabId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonth = async (monthYear) => {
    if (!window.confirm(`Delete all transactions for ${formatMonthYear(monthYear)}?`)) return;

    try {
      setLoading(true);
      const tabParam = activeTabId ? `?tab_id=${activeTabId}` : '';
      const response = await fetch(`${API_BASE}/transactions/month/${monthYear}${tabParam}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Delete failed');
      }

      setSuccess('Transactions deleted successfully');
      if (selectedMonth === monthYear) {
        setSelectedMonth(null);
        setMonthTransactions([]);
      }
      await fetchSavedMonths(activeTabId);
      await fetchTransactionStats(activeTabId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMonthYear = (monthYear) => {
    if (!monthYear || monthYear === 'all') return 'All Transactions';
    const [year, month] = monthYear.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const exportToPDF = () => {
    const filtered = getFilteredTransactions();
    const printWindow = window.open('', '_blank');
    
    const totalCredit = filtered.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalCash = filtered.filter(t => t.transaction_type === 'cash').reduce((sum, t) => sum + t.amount, 0);
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);

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
            ${sortedCategories.map(([cat, data]) => `
              <tr>
                <td>${cat}</td>
                <td>${data.count}</td>
                <td class="amount credit">${formatCurrency(data.credit)}</td>
                <td class="amount cash">${formatCurrency(data.cash)}</td>
                <td class="amount" style="font-weight: bold;">${formatCurrency(data.total)}</td>
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
  };

  const getFilteredTransactions = () => {
    if (!Array.isArray(monthTransactions)) return [];
    return monthTransactions.filter(t => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return !(descriptionFilter && t.description !== descriptionFilter);
    });
  };

  // Helper function to aggregate transactions by category with credit/cash breakdown
  const aggregateByCategory = (transactions) => {
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
  };

  const getFilteredPreview = () => {
    if (!uploadedData?.transactions) return [];
    return uploadedData.transactions.filter(t => {
      if (previewFilter === 'positive' && t.amount < 0) return false;
      return !(previewFilter === 'negative' && t.amount >= 0);

    });
  };

  // PERFORMANCE OPTIMIZATION: Memoize expensive calculations
  // These computations only run when their dependencies change, not on every render
  const filteredTransactions = useMemo(() => getFilteredTransactions(), 
    [monthTransactions, typeFilter, searchTerm, descriptionFilter]);
  
  // PERFORMANCE OPTIMIZATION: Single pass through array to calculate all totals
  // Instead of filtering twice, we compute all values in one reduce operation
  const { totalFiltered, creditTotal, cashTotal } = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => ({
      totalFiltered: acc.totalFiltered + t.amount,
      creditTotal: acc.creditTotal + (t.transaction_type === 'credit' ? t.amount : 0),
      cashTotal: acc.cashTotal + (t.transaction_type === 'cash' ? t.amount : 0)
    }), { totalFiltered: 0, creditTotal: 0, cashTotal: 0 });
  }, [filteredTransactions]);

  // PERFORMANCE OPTIMIZATION: Memoize chart data computation
  // The pie chart aggregation is expensive and only needs to recalculate when transactions change
  const chartData = useMemo(() => {
    if (monthTransactions.length === 0) return null;
    const categoryData = aggregateByCategory(filteredTransactions);
    const sortedCategories = Object.entries(categoryData)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    // Reuse totalFiltered instead of recalculating
    return { sortedCategories, totalAmount: totalFiltered };
  }, [filteredTransactions, monthTransactions.length, totalFiltered]);

  // Get other transactions with the same description (for description history)
  const getDescriptionHistory = (transaction) => {
    return monthTransactions
      .filter(t => t.id !== transaction.id && t.description === transaction.description)
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      .slice(0, 5);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif',
      fontSize: '16px',
      color: colors.text
    }}>
      {/* Mobile Responsive Styles */}
      <style>{`
        .tab-bar::-webkit-scrollbar {
          height: 3px;
        }
        .tab-bar::-webkit-scrollbar-thumb {
          background: #ccc;
        }
        @media (max-width: 768px) {
          .bank-header {
            flex-direction: column !important;
            padding: 1rem !important;
            text-align: center;
          }
          .bank-header h1 {
            font-size: 1.3rem !important;
          }
          .bank-header-buttons {
            width: 100%;
            justify-content: center !important;
          }
          .bank-header-buttons button {
            flex: 1;
            padding: 0.6rem 0.8rem !important;
            font-size: 0.85rem !important;
          }
          .bank-main {
            padding: 1rem !important;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.75rem !important;
          }
          .stats-card {
            padding: 1rem !important;
          }
          .stats-card .stat-icon {
            width: 30px !important;
            height: 30px !important;
          }
          .stats-card .stat-value {
            font-size: 1.3rem !important;
          }
          .stats-card .stat-label {
            font-size: 0.7rem !important;
          }
          .upload-section {
            padding: 1rem !important;
          }
          .type-selector {
            flex-direction: column !important;
          }
          .type-selector button {
            width: 100% !important;
          }
          .filter-section {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .filter-section input,
          .filter-section select {
            width: 100% !important;
            font-size: 16px !important;
          }
          .transactions-table {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .transactions-table th,
          .transactions-table td {
            padding: 8px !important;
            font-size: 0.8rem !important;
            white-space: nowrap;
          }
          .modal-content {
            width: 95% !important;
            max-height: 90vh !important;
            margin: auto;
          }
          .modal-body {
            padding: 1rem !important;
          }
          .modal-body input,
          .modal-body select {
            font-size: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .bank-header h1 {
            font-size: 1.1rem !important;
          }
          .transactions-table th,
          .transactions-table td {
            padding: 6px !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="bank-header" style={{
        background: '#fff',
        color: '#000',
        padding: '1.5rem 2rem',
        borderBottom: `4px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBackToTasks}
            style={{
              background: '#fff',
              border: `3px solid ${colors.border}`,
              color: colors.text,
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              fontFamily: '"Inter", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            💰 BANK TRANSACTIONS
          </h1>
        </div>
        <div className="bank-header-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: colors.secondary,
              border: `3px solid ${colors.border}`,
              color: colors.text,
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: '"Inter", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <Plus size={20} /> Add Transaction
          </button>
          <button
            onClick={exportToPDF}
            disabled={filteredTransactions.length === 0}
            style={{
              background: colors.accent,
              border: `3px solid ${colors.border}`,
              color: '#fff',
              padding: '0.75rem 1.5rem',
              cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: filteredTransactions.length === 0 ? 0.5 : 1,
              fontFamily: '"Inter", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <FileDown size={20} /> Export PDF
          </button>
        </div>
      </header>

      {/* Transaction Tabs Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        apiBase={API_BASE}
        tabEndpoint="transaction-tabs"
        authUser={authUser}
        authRole={authRole}
        colors={colors}
        deleteConfirmMessage={(name) => `Delete "${name}" and all its transactions?`}
        onTabsChanged={(updatedTabs) => setTabs(updatedTabs)}
        onTabCreated={async (newTabId) => {
          setActiveTabId(newTabId);
          localStorage.setItem('activeTabId', String(newTabId));
          setMonthTransactions([]);
          setSavedMonths([]);
          setSelectedMonth(null);
          await fetchSavedMonths(newTabId);
          await fetchTransactionStats(newTabId);
          await fetchAllTransactions(newTabId);
        }}
        onTabDeleted={async (deletedTabId, updatedTabs) => {
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
        }}
        onTabSwitched={(tabId) => handleSwitchTab(tabId)}
        onError={(msg) => setError(msg)}
      />

      {/* Messages */}
      {error && (
        <div style={{
          background: colors.accent,
          color: '#fff',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '1.05rem',
          borderBottom: `3px solid ${colors.border}`
        }}>
          <AlertCircle size={22} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: colors.secondary,
          color: colors.text,
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '1.05rem',
          borderBottom: `3px solid ${colors.border}`
        }}>
          <CheckCircle size={22} />
          {success}
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Orphaned transactions banner */}
      {orphanedCount > 0 && activeTabId && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#FFF3CD',
          border: `3px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.95rem' }}>
            <strong>{orphanedCount}</strong> transaction{orphanedCount !== 1 ? 's' : ''} from before tabs were added {orphanedCount !== 1 ? 'are' : 'is'} not assigned to any tab.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => adoptOrphanedTransactions(tab.id)}
                style={{
                  padding: '0.4rem 1rem',
                  background: colors.primary,
                  color: '#fff',
                  border: `2px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                Assign to "{tab.name}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No tabs - prompt to create first tab */}
      {tabs.length === 0 && (
        <div style={{
          maxWidth: '500px',
          margin: '4rem auto',
          textAlign: 'center',
          padding: '3rem 2rem',
          border: `3px solid ${colors.border}`,
          background: colors.card
        }}>
          <Users size={48} style={{ color: colors.primary, marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem' }}>
            Create Your First Tab
          </h2>
          <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>
            Each tab has its own separate bank transactions. Create a tab to get started.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFirstTab(); }}
              placeholder="Tab name..."
              style={{
                padding: '0.7rem 1rem',
                border: `3px solid ${colors.border}`,
                fontSize: '1rem',
                fontFamily: '"Inter", sans-serif',
                width: '200px'
              }}
            />
            <button
              onClick={handleCreateFirstTab}
              disabled={!newTabName.trim()}
              style={{
                padding: '0.7rem 1.5rem',
                background: newTabName.trim() ? colors.primary : '#ccc',
                color: '#fff',
                border: `3px solid ${colors.border}`,
                cursor: newTabName.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '700',
                fontSize: '1rem',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {activeTabId && (
      <div className="bank-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats Cards */}
        {transactionStats && transactionStats.by_type && transactionStats.by_type.length > 0 && (
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            {transactionStats.by_type.map(stat => (
              <div key={stat.transaction_type} style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  {stat.transaction_type === 'cash' ? 
                    <Banknote size={40} color={colors.success} /> : 
                    <CreditCard size={40} color={colors.primary} />
                  }
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: stat.transaction_type === 'cash' ? colors.success : colors.primary
                }}>
                  {formatCurrency(stat.total_amount || 0)}
                </div>
                <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                  {stat.transaction_type === 'cash' ? '💵 Cash Total' : '💳 Credit Total'}
                </div>
                <div style={{ color: colors.textLight, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  {stat.transaction_count} Transactions
                </div>
              </div>
            ))}
            <div style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <PieChart size={40} color={colors.text} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.text }}>
                {formatCurrency(transactionStats.by_type.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
              </div>
              <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                📊 Grand Total
              </div>
              <div style={{ color: colors.textLight, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {transactionStats.by_type.reduce((sum, s) => sum + (s.transaction_count || 0), 0)} Transactions
              </div>
            </div>
          </div>
        )}

        {/* Debug message when stats are empty */}
        {transactionStats && (!transactionStats.by_type || transactionStats.by_type.length === 0) && (
          <div style={{
            background: '#fff3cd',
            border: `2px solid ${colors.border}`,
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '1rem', color: colors.text }}>
              ℹ️ No transaction statistics available for this tab. Add transactions to see stats.
            </p>
          </div>
        )}

        {/* Expense Distribution Chart */}
        {/* PERFORMANCE OPTIMIZATION: Use memoized chartData instead of computing on every render */}
        {chartData && chartData.sortedCategories.length > 0 && (() => {
          const { sortedCategories, totalAmount } = chartData;
          
          // Generate distinct colors for pie chart segments
          const pieColors = [
            '#0000FF', // Blue
            '#FF0000', // Red
            '#FFD500', // Yellow
            '#00AA00', // Green
            '#FF6B35', // Orange
            '#7B2CBF', // Purple
            '#06D6A0', // Teal
            '#F72585', // Pink
            '#4361EE', // Royal Blue
            '#F77F00'  // Dark Orange
          ];

          return (
            <div style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                margin: '0 0 1.25rem 0',
                fontSize: '1.5rem',
                fontWeight: '800',
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <PieChart size={28} color={colors.primary} />
                Expense Distribution
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: colors.textLight,
                  textTransform: 'none',
                  marginLeft: '0.25rem'
                }}>
                  (Top 5 Categories)
                </span>
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '2rem',
                alignItems: 'start'
              }}>
                {/* Pie Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '300px', height: 'auto' }}>
                    {(() => {
                      let currentAngle = 0;
                      return sortedCategories.map(([category, data], idx) => {
                        const percentage = (data.total / totalAmount) * 100;
                        const angle = (percentage / 100) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle = endAngle;

                        // Convert angles to radians
                        const startRad = (startAngle - 90) * (Math.PI / 180);
                        const endRad = (endAngle - 90) * (Math.PI / 180);

                        // Calculate arc path
                        const x1 = 100 + 90 * Math.cos(startRad);
                        const y1 = 100 + 90 * Math.sin(startRad);
                        const x2 = 100 + 90 * Math.cos(endRad);
                        const y2 = 100 + 90 * Math.sin(endRad);
                        const largeArc = angle > 180 ? 1 : 0;

                        const pathData = [
                          `M 100 100`,
                          `L ${x1} ${y1}`,
                          `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ');

                        return (
                          <g key={category}>
                            <path
                              d={pathData}
                              fill={pieColors[idx % pieColors.length]}
                              stroke="#000"
                              strokeWidth="2"
                            />
                            {/* Percentage label inside slice if space allows */}
                            {percentage > 5 && (() => {
                              const midAngle = (startAngle + endAngle) / 2;
                              const midRad = (midAngle - 90) * (Math.PI / 180);
                              const labelX = 100 + 60 * Math.cos(midRad);
                              const labelY = 100 + 60 * Math.sin(midRad);
                              return (
                                <text
                                  x={labelX}
                                  y={labelY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#fff"
                                  fontSize="12"
                                  fontWeight="800"
                                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                >
                                  {percentage.toFixed(1)}%
                                </text>
                              );
                            })()}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Legend with breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sortedCategories.map(([category, data], idx) => {
                    const percentage = (data.total / totalAmount) * 100;
                    return (
                      <div key={category} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: `2px solid ${colors.border}`,
                        background: '#f8f8f8'
                      }}>
                        <div style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          background: pieColors[idx % pieColors.length],
                          border: `2px solid ${colors.border}`,
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            color: colors.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {category}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            {data.credit > 0 && (
                              <span style={{ color: colors.accent, fontWeight: '600' }}>
                                💳 {formatCurrency(data.credit)}
                              </span>
                            )}
                            {data.cash > 0 && (
                              <span style={{ color: colors.success, fontWeight: '600' }}>
                                💵 {formatCurrency(data.cash)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '800',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.05em',
                            color: colors.text
                          }}>
                            {formatCurrency(data.total)}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: colors.textLight,
                            fontWeight: '600'
                          }}>
                            {percentage.toFixed(1)}% • {data.count} transaction{data.count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Upload Preview */}
        {uploadedData && (
          <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: colors.text, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem' }}>
              <CheckCircle size={28} /> Preview: {uploadedData.transaction_count} transactions ready
              <span style={{
                marginLeft: 'auto',
                padding: '0.5rem 1rem',
                background: uploadedData.transaction_type === 'cash' ? colors.success : colors.primary,
                color: uploadedData.transaction_type === 'cash' ? '#fff' : '#fff',
                fontSize: '0.9rem',
                fontWeight: '700',
                border: `2px solid ${colors.border}`
              }}>
                {uploadedData.transaction_type === 'cash' ? '💵 CASH' : '💳 CREDIT'}
              </span>
            </h2>
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Filter:</span>
              {['all', 'positive', 'negative'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPreviewFilter(filter)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: `2px solid ${colors.border}`,
                    background: previewFilter === filter ? colors.primary : colors.card,
                    color: previewFilter === filter ? '#fff' : colors.text,
                    cursor: 'pointer',
                    fontWeight: previewFilter === filter ? '700' : '600',
                    fontSize: '0.9rem',
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '350px', overflow: 'auto', border: `2px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.primary }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Description</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontSize: '1.05rem' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPreview().slice(0, 50).map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{t.transaction_date}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{t.description}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: t.amount < 0 ? colors.accent : colors.text, fontWeight: '700', fontSize: '1.05rem' }}>
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleSaveTransactions}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: colors.success,
                  color: '#fff',
                  border: `2px solid ${colors.border}`,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '1rem',
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}
              >
                {loading ? 'Saving...' : `Save ${uploadedData.transaction_count} Transactions`}
              </button>
              <button
                onClick={() => setUploadedData(null)}
                style={{
                  padding: '1rem 1.5rem',
                  background: colors.card,
                  border: `2px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: colors.text,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 18rem) 1fr', gap: '1.5rem' }}>
          {/* Sidebar - Upload & Months */}
          <div>
            {/* Upload Section - Compact */}
            <div style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 0.75rem 0',
                fontSize: '1rem',
                fontWeight: '700',
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                <Upload size={18} color={colors.primary} />
                Upload
              </h3>

              {/* Transaction Type Selector - Compact */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setTransactionType('credit')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.25rem',
                      border: `2px solid ${colors.border}`,
                      background: transactionType === 'credit' ? colors.primary : colors.card,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      fontWeight: transactionType === 'credit' ? '700' : '600',
                      fontSize: '0.75rem',
                      color: transactionType === 'credit' ? '#fff' : colors.text,
                      fontFamily: '"Inter", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}
                  >
                    <CreditCard size={14} color={transactionType === 'credit' ? '#fff' : colors.textLight} />
                    Card
                  </button>
                  <button
                    onClick={() => setTransactionType('cash')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.25rem',
                      border: `2px solid ${transactionType === 'cash' ? colors.success : colors.border}`,
                      background: transactionType === 'cash' ? '#ecfdf5' : colors.card,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      fontWeight: transactionType === 'cash' ? '700' : '600',
                      fontSize: '0.75rem',
                      color: transactionType === 'cash' ? colors.success : colors.text,
                      fontFamily: '"Inter", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}
                  >
                    <Banknote size={14} color={transactionType === 'cash' ? colors.success : colors.textLight} />
                    Cash
                  </button>
                </div>
              </div>

              <div style={{
                border: `2px dashed ${colors.border}`,
                padding: '1rem',
                textAlign: 'center',
                background: '#f8f8f8'
              }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FileText size={32} color={colors.text} />
                  <span style={{ fontWeight: '700', fontSize: '0.8rem', color: colors.text, textAlign: 'center', lineHeight: '1.3' }}>
                    Click to upload
                  </span>
                  <span style={{ color: colors.textLight, fontSize: '0.7rem' }}>
                    CSV or Excel
                  </span>
                </label>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: colors.text, fontSize: '0.85rem', fontWeight: '600' }}>
                  ⏳ Processing...
                </div>
              )}
            </div>

            <div style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1.25rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: '700', fontSize: '1.1rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Saved Months
              </h3>
              
              <button
                onClick={fetchAllTransactions}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  border: `2px solid ${colors.border}`,
                  background: selectedMonth === 'all' ? colors.accent : colors.card,
                  color: selectedMonth === 'all' ? '#fff' : colors.text,
                  cursor: 'pointer',
                  fontWeight: selectedMonth === 'all' ? '700' : '600',
                  fontSize: '0.95rem',
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}
              >
                All Transactions
              </button>

              {savedMonths.map(month => (
                <div key={month.month_year} style={{
                  border: `2px solid ${colors.border}`,
                  background: selectedMonth === month.month_year ? colors.accent : colors.card,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => fetchMonthTransactions(month.month_year)}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      border: 'none',
                      background: 'transparent',
                      color: selectedMonth === month.month_year ? '#fff' : colors.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: selectedMonth === month.month_year ? '700' : '600',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    <div style={{ fontSize: '0.95rem', marginBottom: '0.15rem' }}>{formatMonthYear(month.month_year)}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                      {month.transaction_count} transactions • {formatCurrency(month.total_amount)}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteMonth(month.month_year); }}
                    style={{
                      padding: '0.65rem 0.75rem',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: `1px solid ${selectedMonth === month.month_year ? 'rgba(255,255,255,0.2)' : colors.border}`,
                      cursor: 'pointer',
                      color: selectedMonth === month.month_year ? '#fff' : colors.textLight,
                      fontFamily: '"Inter", sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete month"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {savedMonths.length === 0 && (
                <p style={{ color: colors.textLight, textAlign: 'center', padding: '1rem', fontSize: '0.9rem' }}>
                  No months saved yet
                </p>
              )}
            </div>
          </div>

          {/* Main Content - Transactions */}
          <div>
            {selectedMonth && (
              <div style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.2rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth)}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: colors.accent, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      Credit {formatCurrency(creditTotal)}
                    </span>
                    <span style={{ background: colors.success, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      Cash {formatCurrency(cashTotal)}
                    </span>
                    <span style={{ background: colors.secondary, padding: '0.4rem 0.8rem', color: colors.text, fontWeight: '700', fontSize: '0.95rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      Total: {formatCurrency(totalFiltered)}
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  padding: '1rem',
                  background: '#f8f8f8',
                  border: `2px solid ${colors.border}`
                }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    >
                      <option value="all">All Types</option>
                      <option value="credit">Credit Only</option>
                      <option value="cash">Cash Only</option>
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search descriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Category
                    </label>
                    <select
                      value={descriptionFilter}
                      onChange={(e) => setDescriptionFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    >
                      <option value="">All Categories</option>
                      {allDescriptions.map(desc => (
                        <option key={desc} value={desc}>{desc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transactions Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                    <thead>
                      <tr style={{ background: colors.primary }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Type</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem', width: '110px', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice(0, visibleTransactions).map(t => (
                        <React.Fragment key={t.id}>
                        <tr style={{ borderBottom: expandedDescriptionId === t.id ? 'none' : `1px solid ${colors.border}` }}>
                          {editingTransaction?.id === t.id ? (
                            <>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="date"
                                  value={editingTransaction.transaction_date.split('T')[0]}
                                  onChange={(e) => setEditingTransaction({
                                    ...editingTransaction,
                                    transaction_date: e.target.value,
                                    month_year: e.target.value.slice(0, 7)
                                  })}
                                  style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="text"
                                  value={editingTransaction.description}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                  style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <select
                                  value={editingTransaction.transaction_type}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, transaction_type: e.target.value})}
                                  style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <option value="credit">Credit</option>
                                  <option value="cash">Cash</option>
                                </select>
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingTransaction.amount}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                                  style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', textAlign: 'right', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleUpdateTransaction(t.id)}
                                  style={{ padding: '0.4rem 0.6rem', background: colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', marginRight: '0.4rem', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingTransaction(null)}
                                  style={{ padding: '0.4rem 0.6rem', background: colors.card, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.text }}>
                                {new Date(t.transaction_date).toLocaleDateString('he-IL')}
                              </td>
                              <td
                                onClick={() => setExpandedDescriptionId(expandedDescriptionId === t.id ? null : t.id)}
                                style={{
                                  padding: '0.65rem 0.75rem',
                                  fontSize: '0.9rem',
                                  color: colors.text,
                                  cursor: 'pointer',
                                  position: 'relative'
                                }}
                              >
                                <span style={{
                                  borderBottom: `1px dashed ${colors.textLight}`,
                                  paddingBottom: '1px'
                                }}>
                                  {t.description}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.3rem 0.6rem',
                                  background: t.transaction_type === 'cash' ? colors.success : colors.accent,
                                  color: '#fff',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: `2px solid ${colors.border}`,
                                  fontFamily: '"Inter", sans-serif',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px'
                                }}>
                                  {t.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                                </span>
                              </td>
                              <td style={{
                                padding: '0.65rem 0.75rem',
                                textAlign: 'right',
                                fontWeight: '700',
                                fontFamily: 'Consolas, "Courier New", monospace',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '0.05em',
                                fontSize: '0.95rem',
                                color: t.amount < 0 ? colors.accent : colors.text
                              }}>
                                {formatCurrency(t.amount)}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => setEditingTransaction({...t})}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `2px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    marginRight: '0.4rem',
                                    fontFamily: '"Inter", sans-serif'
                                  }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `2px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    fontFamily: '"Inter", sans-serif'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                        {/* Expanded description history */}
                        {expandedDescriptionId === t.id && (() => {
                          const history = getDescriptionHistory(t);
                          if (history.length === 0) return null;
                          return history.map(h => (
                            <tr key={h.id} style={{ borderBottom: `1px solid ${colors.border}`, background: '#f9f9f9' }}>
                              <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                                {new Date(h.transaction_date).toLocaleDateString('he-IL')}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                                {h.description}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.3rem 0.6rem',
                                  background: h.transaction_type === 'cash' ? colors.success : colors.accent,
                                  color: '#fff',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: `2px solid ${colors.border}`,
                                  fontFamily: '"Inter", sans-serif',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px'
                                }}>
                                  {h.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                                </span>
                              </td>
                              <td style={{
                                padding: '0.65rem 0.75rem',
                                textAlign: 'right',
                                fontWeight: '700',
                                fontFamily: 'Consolas, "Courier New", monospace',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '0.05em',
                                fontSize: '0.95rem',
                                color: h.amount < 0 ? colors.accent : colors.textLight
                              }}>
                                {formatCurrency(h.amount)}
                              </td>
                              <td style={{ padding: '0.65rem 0.75rem' }}></td>
                            </tr>
                          ));
                        })()}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Show More Button */}
                {filteredTransactions.length > visibleTransactions && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      onClick={() => setVisibleTransactions(prev => prev + 50)}
                      style={{
                        padding: '0.75rem 2rem',
                        background: colors.primary,
                        color: '#fff',
                        border: `2px solid ${colors.border}`,
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}
                    >
                      Show More ({filteredTransactions.length - visibleTransactions} remaining)
                    </button>
                  </div>
                )}

                {filteredTransactions.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    border: '3px solid #000',
                    background: '#f8f8f8',
                    margin: '2rem 0'
                  }}>
                    {monthTransactions.length === 0 ? (
                      <>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#0066cc' }}>
                          💰 Add Your First Transaction
                        </p>
                        <p style={{ color: '#666', fontSize: '1rem' }}>
                          Click the "Add Transaction" button above to get started
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>
                          No transactions found
                        </p>
                        <p style={{ color: '#666', fontSize: '1rem' }}>
                          Try adjusting your filters or search term
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Add Transaction Modal */}
      {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
          <div style={{
            background: colors.card,
            padding: '2.5rem',
            width: '100%',
            maxWidth: '550px',
            border: `4px solid ${colors.border}`,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '8px 8px 0px #000'
          }}>
            <h2 style={{ margin: '0 0 2rem 0', fontWeight: '800', fontSize: '1.6rem', color: colors.text }}>
              ➕ Add Transaction
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1.1rem', color: colors.text }}>Type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setNewTransaction({...newTransaction, transaction_type: 'credit'})}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    background: newTransaction.transaction_type === 'credit' ? colors.accent : colors.card,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '1.05rem',
                    fontWeight: newTransaction.transaction_type === 'credit' ? '700' : '500',
                    color: newTransaction.transaction_type === 'credit' ? '#fff' : colors.text,
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <CreditCard size={20} /> 💳 Credit
                </button>
                <button
                  type="button"
                  onClick={() => setNewTransaction({...newTransaction, transaction_type: 'cash'})}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    background: newTransaction.transaction_type === 'cash' ? colors.success : colors.card,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '1.05rem',
                    fontWeight: newTransaction.transaction_type === 'cash' ? '700' : '500',
                    color: newTransaction.transaction_type === 'cash' ? '#fff' : colors.text,
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <Banknote size={20} /> 💵 Cash
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📅 Date</label>
              <input
                type="date"
                value={newTransaction.transaction_date}
                onChange={(e) => setNewTransaction({
                  ...newTransaction,
                  transaction_date: e.target.value,
                  month_year: e.target.value.slice(0, 7)
                })}
                style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📝 Description</label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="Transaction description"
                list="descriptions-list"
                style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
              />
              <datalist id="descriptions-list">
                {allDescriptions.map(desc => (
                  <option key={desc} value={desc} />
                ))}
              </datalist>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>💰 Amount (₪)</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                placeholder="0.00"
                style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>🏦 Account Number (optional)</label>
              <input
                type="text"
                value={newTransaction.account_number}
                onChange={(e) => setNewTransaction({...newTransaction, account_number: e.target.value})}
                placeholder="Account number"
                style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAddTransaction}
                disabled={!newTransaction.description || !newTransaction.amount || loading}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  background: newTransaction.transaction_type === 'cash' ? colors.success : colors.primary,
                  color: '#fff',
                  border: `3px solid ${colors.border}`,
                  cursor: (!newTransaction.description || !newTransaction.amount || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '1.15rem',
                  opacity: (!newTransaction.description || !newTransaction.amount || loading) ? 0.5 : 1,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {loading ? '⏳ Adding...' : '✅ Add Transaction'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '1.25rem 2rem',
                  background: colors.card,
                  border: `3px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  color: colors.text,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransactions;
