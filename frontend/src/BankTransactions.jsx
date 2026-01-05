import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, Calendar, TrendingUp, Trash2, Download, FileText, AlertCircle, CheckCircle, ArrowLeft, Plus, Edit2, Save, X, FileDown, Banknote, CreditCard, PieChart, Filter } from 'lucide-react';
import API_BASE from './config';

const BankTransactions = ({ onBackToTasks }) => {
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

  useEffect(() => {
    fetchSavedMonths();
    fetchAllDescriptions();
    fetchAllTransactions();
    fetchTransactionStats();
  }, []);

  const fetchAllDescriptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/descriptions`);
      const data = await response.json();
      setAllDescriptions(data);
    } catch (err) {
      console.error('Error fetching descriptions:', err);
    }
  };

  const fetchTransactionStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/stats`);
      const data = await response.json();
      setTransactionStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSavedMonths = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/months`);
      const data = await response.json();
      setSavedMonths(data);
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/transactions/all`);
      const data = await response.json();
      setMonthTransactions(data);
      setSelectedMonth('all');
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthTransactions = async (monthYear) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/transactions/${monthYear}`);
      const data = await response.json();
      setMonthTransactions(data);
      setSelectedMonth(monthYear);
    } catch (err) {
      setError('Failed to fetch transactions');
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
        body: formData
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: Expected JSON but got ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: uploadedData.transactions })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Save failed');
      }

      setSuccess(data.message);
      setUploadedData(null);
      await fetchSavedMonths();
      await fetchTransactionStats();
      await fetchAllTransactions();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add transaction');

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
      
      await fetchSavedMonths();
      await fetchAllDescriptions();
      await fetchTransactionStats();
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else if (selectedMonth) {
        await fetchMonthTransactions(selectedMonth);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTransaction)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update transaction');

      setSuccess('Transaction updated successfully');
      setEditingTransaction(null);
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchAllDescriptions();
      await fetchTransactionStats();
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
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      setSuccess('Transaction deleted successfully');
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchSavedMonths();
      await fetchTransactionStats();
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
      const response = await fetch(`${API_BASE}/transactions/month/${monthYear}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      setSuccess('Transactions deleted successfully');
      if (selectedMonth === monthYear) {
        setSelectedMonth(null);
        setMonthTransactions([]);
      }
      await fetchSavedMonths();
      await fetchTransactionStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2
    }).format(amount);
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

    const categories = {};
    filtered.forEach(t => {
      const desc = t.description || 'Other';
      if (!categories[desc]) {
        categories[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
      }
      categories[desc].count++;
      categories[desc].total += t.amount;
      if (t.transaction_type === 'cash') {
        categories[desc].cash += t.amount;
      } else {
        categories[desc].credit += t.amount;
      }
    });

    const sortedCategories = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);

    printWindow.document.write(`
      <html>
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
    return monthTransactions.filter(t => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (descriptionFilter && t.description !== descriptionFilter) return false;
      return true;
    });
  };

  const getFilteredPreview = () => {
    if (!uploadedData?.transactions) return [];
    return uploadedData.transactions.filter(t => {
      if (previewFilter === 'positive' && t.amount < 0) return false;
      if (previewFilter === 'negative' && t.amount >= 0) return false;
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  const totalFiltered = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const creditTotal = filteredTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const cashTotal = filteredTransactions.filter(t => t.transaction_type === 'cash').reduce((sum, t) => sum + t.amount, 0);

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

      <div className="bank-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats Cards */}
        {transactionStats && transactionStats.by_type && (
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            {transactionStats.by_type.map(stat => (
              <div key={stat.transaction_type} style={{
                background: colors.card,
                border: `3px solid ${colors.border}`,
                padding: '1.75rem',
                textAlign: 'center',
                boxShadow: '4px 4px 0px #000'
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
                  {stat.transaction_count} transactions
                </div>
              </div>
            ))}
            <div style={{
              background: colors.card,
              border: `3px solid ${colors.border}`,
              padding: '1.75rem',
              textAlign: 'center',
              boxShadow: '4px 4px 0px #000'
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
                {transactionStats.by_type.reduce((sum, s) => sum + (s.transaction_count || 0), 0)} transactions
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div style={{
          background: colors.card,
          border: `3px solid ${colors.border}`,
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '4px 4px 0px #000'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', color: colors.text }}>
            <Upload size={28} color={colors.primary} /> Upload Transactions
          </h2>
          
          {/* Transaction Type Selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1.1rem', color: colors.text }}>
              Transaction Type:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setTransactionType('credit')}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  border: `3px solid ${colors.border}`,
                  background: transactionType === 'credit' ? colors.primary : colors.card,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontWeight: transactionType === 'credit' ? '700' : '500',
                  fontSize: '1.1rem',
                  color: transactionType === 'credit' ? '#fff' : colors.text,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <CreditCard size={24} color={transactionType === 'credit' ? '#fff' : colors.textLight} />
                💳 Credit Card
              </button>
              <button
                onClick={() => setTransactionType('cash')}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  border: `3px solid ${transactionType === 'cash' ? colors.success : colors.border}`,
                  background: transactionType === 'cash' ? '#ecfdf5' : colors.card,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontWeight: transactionType === 'cash' ? '700' : '500',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  color: transactionType === 'cash' ? colors.success : colors.text
                }}
              >
                <Banknote size={24} color={transactionType === 'cash' ? colors.success : colors.textLight} />
                💵 Cash
              </button>
            </div>
          </div>

          <div style={{
            border: `3px dashed ${colors.border}`,
            padding: '2.5rem',
            textAlign: 'center',
            background: '#f8f8f8',
            boxShadow: '4px 4px 0px #000'
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
              gap: '0.75rem'
            }}>
              <FileText size={56} color={colors.text} />
              <span style={{ fontWeight: '700', fontSize: '1.2rem', color: colors.text }}>
                Click to upload {transactionType === 'cash' ? '💵 cash' : '💳 credit card'} transactions
              </span>
              <span style={{ color: colors.textLight, fontSize: '1rem' }}>
                CSV or Excel files supported
              </span>
            </label>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.text, fontSize: '1.1rem', fontWeight: '600' }}>
              ⏳ Processing...
            </div>
          )}
        </div>

        {/* Upload Preview */}
        {uploadedData && (
          <div style={{
            background: colors.card,
            border: `3px solid ${colors.border}`,
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '4px 4px 0px #000'
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
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>Filter:</span>
              {['all', 'positive', 'negative'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPreviewFilter(filter)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    border: `3px solid ${colors.border}`,
                    background: previewFilter === filter ? colors.primary : colors.card,
                    color: previewFilter === filter ? '#fff' : colors.text,
                    cursor: 'pointer',
                    fontWeight: previewFilter === filter ? '700' : '500',
                    fontSize: '1rem',
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '350px', overflow: 'auto', border: `3px solid ${colors.border}` }}>
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
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: t.amount < 0 ? colors.accent : colors.success, fontWeight: '700', fontSize: '1.05rem' }}>
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveTransactions}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  background: colors.success,
                  color: '#fff',
                  border: `3px solid ${colors.border}`,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '1.2rem',
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {loading ? '⏳ Saving...' : `✅ Save ${uploadedData.transaction_count} Transactions`}
              </button>
              <button
                onClick={() => setUploadedData(null)}
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
        )}

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
          {/* Sidebar - Months */}
          <div>
            <div style={{
              background: colors.card,
              border: `3px solid ${colors.border}`,
              padding: '1.75rem',
              boxShadow: '4px 4px 0px #000'
            }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontWeight: '800', fontSize: '1.3rem', color: colors.text }}>
                <Calendar size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                📅 Saved Months
              </h3>
              
              <button
                onClick={fetchAllTransactions}
                style={{
                  width: '100%',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  border: `3px solid ${colors.border}`,
                  background: selectedMonth === 'all' ? colors.accent : colors.card,
                  color: selectedMonth === 'all' ? '#fff' : colors.text,
                  cursor: 'pointer',
                  fontWeight: selectedMonth === 'all' ? '700' : '500',
                  fontSize: '1.05rem',
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                📊 All Transactions
              </button>

              {savedMonths.map(month => (
                <div key={month.month_year} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <button
                    onClick={() => fetchMonthTransactions(month.month_year)}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      border: `3px solid ${colors.border}`,
                      background: selectedMonth === month.month_year ? colors.accent : colors.card,
                      color: selectedMonth === month.month_year ? '#fff' : colors.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: selectedMonth === month.month_year ? '700' : '500',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    <div style={{ fontSize: '1.05rem' }}>{formatMonthYear(month.month_year)}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>
                      {month.transaction_count} • {formatCurrency(month.total_amount)}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteMonth(month.month_year)}
                    style={{
                      padding: '0.75rem',
                      background: colors.card,
                      border: `3px solid ${colors.border}`,
                      cursor: 'pointer',
                      color: colors.text,
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {savedMonths.length === 0 && (
                <p style={{ color: colors.textLight, textAlign: 'center', padding: '1.5rem', fontSize: '1.05rem' }}>
                  No transactions saved yet
                </p>
              )}
            </div>
          </div>

          {/* Main Content - Transactions */}
          <div>
            {selectedMonth && (
              <div style={{
                background: colors.card,
                border: `3px solid ${colors.border}`,
                padding: '1.75rem',
                boxShadow: '4px 4px 0px #000'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem', color: colors.text }}>
                    {selectedMonth === 'all' ? '📊 ALL TRANSACTIONS' : `📅 ${formatMonthYear(selectedMonth)}`}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: colors.accent, padding: '0.6rem 1.2rem', color: '#fff', fontWeight: '700', fontSize: '1.05rem', border: `3px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      💳 {formatCurrency(creditTotal)}
                    </span>
                    <span style={{ background: colors.success, padding: '0.6rem 1.2rem', color: '#fff', fontWeight: '700', fontSize: '1.05rem', border: `3px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      💵 {formatCurrency(cashTotal)}
                    </span>
                    <span style={{ background: colors.secondary, padding: '0.6rem 1.2rem', color: colors.text, fontWeight: '800', fontSize: '1.1rem', border: `3px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                      Total: {formatCurrency(totalFiltered)}
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  padding: '1.25rem',
                  background: '#f8f8f8',
                  border: `3px solid ${colors.border}`
                }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '700', color: colors.text }}>
                      <Filter size={16} style={{ verticalAlign: 'middle' }} /> Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                    >
                      <option value="all">All Types</option>
                      <option value="credit">💳 Credit Only</option>
                      <option value="cash">💵 Cash Only</option>
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '700', color: colors.text }}>
                      🔍 Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search descriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '700', color: colors.text }}>
                      📁 Category
                    </label>
                    <select
                      value={descriptionFilter}
                      onChange={(e) => setDescriptionFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `3px solid ${colors.border}` }}>
                    <thead>
                      <tr style={{ background: colors.primary }}>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Date</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Description</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: '#fff', fontSize: '1.05rem' }}>Type</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontSize: '1.05rem' }}>Amount</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: '#fff', fontSize: '1.05rem', width: '120px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map(t => (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          {editingTransaction?.id === t.id ? (
                            <>
                              <td style={{ padding: '0.75rem' }}>
                                <input
                                  type="date"
                                  value={editingTransaction.transaction_date.split('T')[0]}
                                  onChange={(e) => setEditingTransaction({
                                    ...editingTransaction,
                                    transaction_date: e.target.value,
                                    month_year: e.target.value.slice(0, 7)
                                  })}
                                  style={{ padding: '0.5rem', border: `3px solid ${colors.border}`, width: '100%', fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                <input
                                  type="text"
                                  value={editingTransaction.description}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                  style={{ padding: '0.5rem', border: `3px solid ${colors.border}`, width: '100%', fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <select
                                  value={editingTransaction.transaction_type}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, transaction_type: e.target.value})}
                                  style={{ padding: '0.5rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <option value="credit">Credit</option>
                                  <option value="cash">Cash</option>
                                </select>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingTransaction.amount}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                                  style={{ padding: '0.5rem', border: `3px solid ${colors.border}`, width: '100%', textAlign: 'right', fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleUpdateTransaction(t.id)}
                                  style={{ padding: '0.5rem 0.75rem', background: colors.success, color: '#fff', border: `3px solid ${colors.border}`, cursor: 'pointer', marginRight: '0.5rem', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingTransaction(null)}
                                  style={{ padding: '0.5rem 0.75rem', background: colors.card, color: colors.text, border: `3px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '1rem', fontSize: '1.05rem', color: colors.text }}>
                                {new Date(t.transaction_date).toLocaleDateString('he-IL')}
                              </td>
                              <td style={{ padding: '1rem', fontSize: '1.05rem', color: colors.text }}>{t.description}</td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.4rem 0.75rem',
                                  background: t.transaction_type === 'cash' ? colors.success : colors.accent,
                                  color: '#fff',
                                  fontSize: '0.9rem',
                                  fontWeight: '700',
                                  border: `3px solid ${colors.border}`,
                                  fontFamily: '"Inter", sans-serif',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  {t.transaction_type === 'cash' ? '💵 Cash' : '💳 Credit'}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem',
                                textAlign: 'right',
                                fontWeight: '700',
                                fontFamily: 'monospace',
                                fontSize: '1.1rem',
                                color: t.amount < 0 ? colors.accent : colors.success
                              }}>
                                {formatCurrency(t.amount)}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => setEditingTransaction({...t})}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `3px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    marginRight: '0.5rem',
                                    fontFamily: '"Inter", sans-serif'
                                  }}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `3px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    fontFamily: '"Inter", sans-serif'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredTransactions.length === 0 && (
                  <p style={{ textAlign: 'center', color: colors.textLight, padding: '3rem', fontSize: '1.1rem' }}>
                    No transactions found
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
