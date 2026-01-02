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
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-box { background: #f5f5f5; padding: 15px 25px; border-radius: 8px; }
          .summary-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
          .summary-box p { margin: 0; font-size: 24px; font-weight: bold; }
          .credit { color: #2563eb; }
          .cash { color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .amount { text-align: right; font-family: monospace; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Bank Transactions Report</h1>
        <p><strong>Period:</strong> ${selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth)}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        
        <div class="summary">
          <div class="summary-box">
            <h3>Total Spending</h3>
            <p>${formatCurrency(total)}</p>
          </div>
          <div class="summary-box">
            <h3 class="credit">Credit Card</h3>
            <p class="credit">${formatCurrency(totalCredit)}</p>
          </div>
          <div class="summary-box">
            <h3 class="cash">Cash</h3>
            <p class="cash">${formatCurrency(totalCash)}</p>
          </div>
          <div class="summary-box">
            <h3>Transaction Count</h3>
            <p>${filtered.length}</p>
          </div>
        </div>

        <h2>By Category</h2>
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
                <td class="amount">${formatCurrency(data.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>All Transactions</h2>
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
                <td class="amount">${formatCurrency(t.amount)}</td>
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
      background: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: '#000',
        color: '#fff',
        padding: '1.5rem 2rem',
        borderBottom: '4px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBackToTasks}
            style={{
              background: 'transparent',
              border: '2px solid #FFD700',
              color: '#FFD700',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>
            BANK TRANSACTIONS
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: '#FFD700',
              border: 'none',
              color: '#000',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={18} /> Add Transaction
          </button>
          <button
            onClick={exportToPDF}
            disabled={filteredTransactions.length === 0}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: filteredTransactions.length === 0 ? 0.5 : 1
            }}
          >
            <FileDown size={18} /> Export PDF
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: '#d1fae5',
          color: '#059669',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={20} />
          {success}
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats Cards */}
        {transactionStats && transactionStats.by_type && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {transactionStats.by_type.map(stat => (
              <div key={stat.transaction_type} style={{
                background: '#fff',
                border: `3px solid ${stat.transaction_type === 'cash' ? '#059669' : '#2563eb'}`,
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  {stat.transaction_type === 'cash' ? 
                    <Banknote size={32} color="#059669" /> : 
                    <CreditCard size={32} color="#2563eb" />
                  }
                </div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: '800',
                  color: stat.transaction_type === 'cash' ? '#059669' : '#2563eb'
                }}>
                  {formatCurrency(stat.total_amount || 0)}
                </div>
                <div style={{ color: '#666', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '600' }}>
                  {stat.transaction_type === 'cash' ? 'Cash Total' : 'Credit Total'}
                </div>
                <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {stat.transaction_count} transactions
                </div>
              </div>
            ))}
            <div style={{
              background: '#fff',
              border: '3px solid #000',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <PieChart size={32} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                {formatCurrency(transactionStats.by_type.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
              </div>
              <div style={{ color: '#666', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '600' }}>
                Grand Total
              </div>
              <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {transactionStats.by_type.reduce((sum, s) => sum + (s.transaction_count || 0), 0)} transactions
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div style={{
          background: '#fff',
          border: '3px solid #000',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={24} /> Upload Transactions
          </h2>
          
          {/* Transaction Type Selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Transaction Type:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setTransactionType('credit')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: `3px solid ${transactionType === 'credit' ? '#2563eb' : '#ddd'}`,
                  background: transactionType === 'credit' ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: transactionType === 'credit' ? '700' : '400'
                }}
              >
                <CreditCard size={20} color={transactionType === 'credit' ? '#2563eb' : '#666'} />
                Credit Card
              </button>
              <button
                onClick={() => setTransactionType('cash')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: `3px solid ${transactionType === 'cash' ? '#059669' : '#ddd'}`,
                  background: transactionType === 'cash' ? '#ecfdf5' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: transactionType === 'cash' ? '700' : '400'
                }}
              >
                <Banknote size={20} color={transactionType === 'cash' ? '#059669' : '#666'} />
                Cash
              </button>
            </div>
          </div>

          <div style={{
            border: '2px dashed #ccc',
            padding: '2rem',
            textAlign: 'center',
            background: '#fafafa'
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
              <FileText size={48} color="#666" />
              <span style={{ fontWeight: '600' }}>
                Click to upload {transactionType === 'cash' ? 'cash' : 'credit card'} transactions
              </span>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>
                CSV or Excel files supported
              </span>
            </label>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Processing...
            </div>
          )}
        </div>

        {/* Upload Preview */}
        {uploadedData && (
          <div style={{
            background: '#fff',
            border: '3px solid #059669',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={24} /> Preview: {uploadedData.transaction_count} transactions ready
              <span style={{
                marginLeft: 'auto',
                padding: '0.25rem 0.75rem',
                background: uploadedData.transaction_type === 'cash' ? '#059669' : '#2563eb',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {uploadedData.transaction_type === 'cash' ? 'CASH' : 'CREDIT'}
              </span>
            </h2>
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>Filter:</span>
              {['all', 'positive', 'negative'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPreviewFilter(filter)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '2px solid',
                    borderColor: previewFilter === filter ? '#000' : '#ddd',
                    background: previewFilter === filter ? '#000' : '#fff',
                    color: previewFilter === filter ? '#fff' : '#000',
                    cursor: 'pointer',
                    fontWeight: previewFilter === filter ? '600' : '400'
                  }}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #000' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #000' }}>Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #000' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPreview().slice(0, 50).map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{t.transaction_date}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{t.description}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: t.amount < 0 ? '#dc2626' : '#059669' }}>
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveTransactions}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'Saving...' : `Save ${uploadedData.transaction_count} Transactions`}
              </button>
              <button
                onClick={() => setUploadedData(null)}
                style={{
                  padding: '1rem 2rem',
                  background: '#fff',
                  border: '2px solid #000',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
          {/* Sidebar - Months */}
          <div>
            <div style={{
              background: '#fff',
              border: '3px solid #000',
              padding: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: '700' }}>
                <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Saved Months
              </h3>
              
              <button
                onClick={fetchAllTransactions}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  border: `2px solid ${selectedMonth === 'all' ? '#000' : '#ddd'}`,
                  background: selectedMonth === 'all' ? '#000' : '#fff',
                  color: selectedMonth === 'all' ? '#fff' : '#000',
                  cursor: 'pointer',
                  fontWeight: selectedMonth === 'all' ? '700' : '400'
                }}
              >
                All Transactions
              </button>

              {savedMonths.map(month => (
                <div key={month.month_year} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <button
                    onClick={() => fetchMonthTransactions(month.month_year)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: `2px solid ${selectedMonth === month.month_year ? '#000' : '#ddd'}`,
                      background: selectedMonth === month.month_year ? '#000' : '#fff',
                      color: selectedMonth === month.month_year ? '#fff' : '#000',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: selectedMonth === month.month_year ? '600' : '400'
                    }}
                  >
                    <div>{formatMonthYear(month.month_year)}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {month.transaction_count} • {formatCurrency(month.total_amount)}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteMonth(month.month_year)}
                    style={{
                      padding: '0.5rem',
                      background: '#fee2e2',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {savedMonths.length === 0 && (
                <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>
                  No transactions saved yet
                </p>
              )}
            </div>
          </div>

          {/* Main Content - Transactions */}
          <div>
            {selectedMonth && (
              <div style={{
                background: '#fff',
                border: '3px solid #000',
                padding: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.3rem' }}>
                    {selectedMonth === 'all' ? 'ALL TRANSACTIONS' : formatMonthYear(selectedMonth)}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ background: '#eff6ff', padding: '0.5rem 1rem', color: '#2563eb', fontWeight: '600' }}>
                      💳 {formatCurrency(creditTotal)}
                    </span>
                    <span style={{ background: '#ecfdf5', padding: '0.5rem 1rem', color: '#059669', fontWeight: '600' }}>
                      💵 {formatCurrency(cashTotal)}
                    </span>
                    <span style={{ background: '#000', padding: '0.5rem 1rem', color: '#FFD700', fontWeight: '700' }}>
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
                  padding: '1rem',
                  background: '#f9f9f9',
                  border: '1px solid #eee'
                }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                      <Filter size={14} style={{ verticalAlign: 'middle' }} /> Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd' }}
                    >
                      <option value="all">All Types</option>
                      <option value="credit">💳 Credit Only</option>
                      <option value="cash">💵 Cash Only</option>
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search descriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd' }}
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                      Category
                    </label>
                    <select
                      value={descriptionFilter}
                      onChange={(e) => setDescriptionFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd' }}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#000', color: '#fff' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Type</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
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
                                  style={{ padding: '0.25rem', border: '1px solid #ddd', width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="text"
                                  value={editingTransaction.description}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                  style={{ padding: '0.25rem', border: '1px solid #ddd', width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <select
                                  value={editingTransaction.transaction_type}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, transaction_type: e.target.value})}
                                  style={{ padding: '0.25rem', border: '1px solid #ddd' }}
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
                                  style={{ padding: '0.25rem', border: '1px solid #ddd', width: '100%', textAlign: 'right' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleUpdateTransaction(t.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', marginRight: '0.25rem' }}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingTransaction(null)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#666', color: '#fff', border: 'none', cursor: 'pointer' }}
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '0.75rem' }}>
                                {new Date(t.transaction_date).toLocaleDateString('he-IL')}
                              </td>
                              <td style={{ padding: '0.75rem' }}>{t.description}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: t.transaction_type === 'cash' ? '#ecfdf5' : '#eff6ff',
                                  color: t.transaction_type === 'cash' ? '#059669' : '#2563eb',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  {t.transaction_type === 'cash' ? '💵 Cash' : '💳 Credit'}
                                </span>
                              </td>
                              <td style={{
                                padding: '0.75rem',
                                textAlign: 'right',
                                fontWeight: '600',
                                fontFamily: 'monospace',
                                color: t.amount < 0 ? '#dc2626' : '#059669'
                              }}>
                                {formatCurrency(t.amount)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => setEditingTransaction({...t})}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginRight: '0.25rem'
                                  }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={14} />
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
                  <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
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
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            border: '3px solid #000'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontWeight: '700' }}>Add Transaction</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setNewTransaction({...newTransaction, transaction_type: 'credit'})}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `2px solid ${newTransaction.transaction_type === 'credit' ? '#2563eb' : '#ddd'}`,
                    background: newTransaction.transaction_type === 'credit' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CreditCard size={18} /> Credit
                </button>
                <button
                  type="button"
                  onClick={() => setNewTransaction({...newTransaction, transaction_type: 'cash'})}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `2px solid ${newTransaction.transaction_type === 'cash' ? '#059669' : '#ddd'}`,
                    background: newTransaction.transaction_type === 'cash' ? '#ecfdf5' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Banknote size={18} /> Cash
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Date</label>
              <input
                type="date"
                value={newTransaction.transaction_date}
                onChange={(e) => setNewTransaction({
                  ...newTransaction,
                  transaction_date: e.target.value,
                  month_year: e.target.value.slice(0, 7)
                })}
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description</label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="Transaction description"
                list="descriptions-list"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #ddd' }}
              />
              <datalist id="descriptions-list">
                {allDescriptions.map(desc => (
                  <option key={desc} value={desc} />
                ))}
              </datalist>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Amount (₪)</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Account Number (optional)</label>
              <input
                type="text"
                value={newTransaction.account_number}
                onChange={(e) => setNewTransaction({...newTransaction, account_number: e.target.value})}
                placeholder="Account number"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAddTransaction}
                disabled={!newTransaction.description || !newTransaction.amount || loading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: newTransaction.transaction_type === 'cash' ? '#059669' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  cursor: (!newTransaction.description || !newTransaction.amount || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  opacity: (!newTransaction.description || !newTransaction.amount || loading) ? 0.5 : 1
                }}
              >
                {loading ? 'Adding...' : 'Add Transaction'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '1rem 2rem',
                  background: '#fff',
                  border: '2px solid #000',
                  cursor: 'pointer',
                  fontWeight: '600'
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
