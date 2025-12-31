import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, Calendar, TrendingUp, Trash2, Download, FileText, AlertCircle, CheckCircle, ArrowLeft, Plus, Edit2, Save, X } from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

const BankTransactions = ({ onBackToTasks }) => {
  const [uploadedData, setUploadedData] = useState(null);
  const [savedMonths, setSavedMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all');
  const [encodingPreviews, setEncodingPreviews] = useState(null);
  const [tempFilename, setTempFilename] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [allDescriptions, setAllDescriptions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    month_year: new Date().toISOString().slice(0, 7)
  });
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 1day, 3days, 7days, 30days, 3months, 6months, all

  useEffect(() => {
    fetchSavedMonths();
    fetchAllDescriptions();
    fetchAllTransactions(); // Load all transactions on mount
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
      setSelectedMonth('all'); // Indicate we're showing all transactions
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
      setSuccess(`Successfully parsed ${data.transaction_count} transactions. NOTE: If Hebrew text shows as ????, please export the file as Excel (.xlsx) from your bank or use the original unedited CSV file.`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEncodingSelect = async (encoding) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/upload-with-encoding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_filename: tempFilename,
          encoding: encoding
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse with selected encoding');
      }

      setUploadedData(data);
      setPreviewFilter('all');
      setEncodingPreviews(null);
      setTempFilename(null);
      setSuccess(`Successfully parsed ${data.transaction_count} transactions using ${encoding} encoding`);

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
        month_year: new Date().toISOString().slice(0, 7)
      });
      await fetchSavedMonths();
      await fetchAllDescriptions();
      // Refresh current view
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
      // Refresh current view
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchAllDescriptions();
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
      // Refresh current view
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchSavedMonths();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonth = async (monthYear) => {
    if (!window.confirm(`Delete all transactions for ${monthYear}?`)) return;

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatMonthYear = (monthYear) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      color: '#000'
    }}>
      <style>{`
        .btn {
          transition: all 0.15s ease;
          cursor: pointer;
          border: 3px solid #000;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.85rem;
          padding: 14px 28px;
          background: #fff;
          color: #000;
        }

        .btn:hover:not(:disabled) {
          box-shadow: 4px 4px 0px #000;
          transform: translate(-2px, -2px);
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-red {
          background: #FF0000;
          color: #fff;
          border-color: #000;
        }

        .btn-yellow {
          background: #FFD500;
          color: #000;
          border-color: #000;
        }

        .btn-blue {
          background: #0000FF;
          color: #fff;
          border-color: #000;
        }

        .btn-white {
          background: #fff;
          color: #000;
          border-color: #000;
        }

        .transaction-card {
          transition: all 0.2s ease;
          border: 3px solid #000;
        }

        .transaction-card:hover {
          box-shadow: 6px 6px 0px #000;
          transform: translate(-3px, -3px);
        }

        .month-card {
          transition: all 0.2s ease;
          border: 3px solid #000;
          cursor: pointer;
        }

        .month-card:hover {
          box-shadow: 6px 6px 0px #000;
          transform: translate(-3px, -3px);
        }

        .month-card.selected {
          background: #FFD500;
        }
      `}</style>

      {/* Color Bar */}
      <div style={{
        height: '12px',
        width: '100%',
        background: 'linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%)'
      }}></div>

      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '4px solid #000',
        padding: '32px 48px'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '3rem',
              fontWeight: 900,
              margin: '0 0 8px 0',
              letterSpacing: '-1px',
              textTransform: 'uppercase'
            }}>
              Bank Transactions
            </h1>
            <p style={{
              fontSize: '1rem',
              margin: 0,
              fontWeight: 400,
              color: '#666'
            }}>
              Upload, manage and compare monthly bank transactions
            </p>
          </div>
          {onBackToTasks && (
            <button className="btn btn-white" onClick={onBackToTasks}>
              <ArrowLeft size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Back to Tasks
            </button>
          )}
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div style={{
          background: '#FF0000',
          color: '#fff',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '3px solid #000'
        }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          background: '#00FF00',
          color: '#000',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '3px solid #000'
        }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 600 }}>{success}</span>
        </div>
      )}

      <div style={{ padding: '48px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Upload Section */}
        <div style={{
          border: '4px solid #000',
          padding: '32px',
          marginBottom: '48px',
          background: '#f8f8f8'
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 900,
            marginBottom: '24px',
            textTransform: 'uppercase'
          }}>
            Upload New Transactions
          </h2>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label className="btn btn-blue" style={{ display: 'inline-block', margin: 0 }}>
              <Upload size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Choose File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              Accepted formats: CSV, Excel (.xlsx, .xls)
            </span>
          </div>

          {uploadedData && (
            <div style={{ marginTop: '32px' }}>
              <div style={{
                border: '3px solid #000',
                padding: '24px',
                background: '#fff',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '24px',
                  marginBottom: '24px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
                      Total Amount
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FF0000' }}>
                      {formatCurrency(uploadedData.total_amount)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
                      Transactions
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {uploadedData.transaction_count}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
                      Month
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {uploadedData.month_year ? formatMonthYear(uploadedData.month_year) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-yellow"
                    onClick={handleSaveTransactions}
                    disabled={loading}
                  >
                    Save to Database
                  </button>
                  <button
                    className="btn btn-white"
                    onClick={() => setUploadedData(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 700,
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase'
                }}>
                  Search Transactions
                </label>
                <input
                  type="text"
                  placeholder="Search by description or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '3px solid #000',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                />
                {(searchTerm || descriptionFilter) && (
                  <button
                    className="btn btn-white"
                    onClick={() => {
                      setSearchTerm('');
                      setDescriptionFilter('');
                    }}
                    style={{ marginTop: '8px', width: '100%' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Month Filter for Preview */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 700,
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase'
                }}>
                  Filter by Month
                </label>
                <select
                  value={previewFilter}
                  onChange={(e) => setPreviewFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '3px solid #000',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  <option value="all">All Transactions</option>
                  {/* Get unique months from uploaded transactions */}
                  {[...new Set(uploadedData.transactions.map(t => t.month_year))].sort().reverse().map(month => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Preview */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '3px solid #000',
                background: '#fff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#000', color: '#fff' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedData.transactions
                      .filter(trans => previewFilter === 'all' || trans.month_year === previewFilter)
                      .filter(trans => {
                        // Search filter
                        if (searchTerm) {
                          const search = searchTerm.toLowerCase();
                          return trans.description.toLowerCase().includes(search) ||
                                 trans.amount.toString().includes(search);
                        }
                        return true;
                      })
                      .filter(trans => {
                        // Description filter (when clicking a description)
                        if (descriptionFilter) {
                          return trans.description === descriptionFilter;
                        }
                        return true;
                      })
                      .map((trans, idx) => (
                        <tr key={idx} style={{ borderBottom: '2px solid #e0e0e0' }}>
                          <td style={{ padding: '12px', fontWeight: 600, fontSize: '0.9rem' }}>
                            {new Date(trans.transaction_date).toLocaleDateString('en-GB')}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              textDecoration: descriptionFilter === trans.description ? 'underline' : 'none',
                              fontWeight: descriptionFilter === trans.description ? 700 : 400
                            }}
                            onClick={() => {
                              if (descriptionFilter === trans.description) {
                                setDescriptionFilter('');
                              } else {
                                setDescriptionFilter(trans.description);
                              }
                            }}
                            title="Click to filter by this description"
                          >
                            {trans.description}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>
                            {formatCurrency(trans.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Saved Months Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              margin: 0
            }}>
              Saved Transactions by Month
            </h2>
            <button
              className="btn btn-yellow"
              onClick={() => setShowAddForm(true)}
              disabled={loading}
            >
              <Plus size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Add Transaction
            </button>
          </div>

          {/* Add Transaction Form Modal */}
          {showAddForm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#fff',
                border: '4px solid #000',
                padding: '32px',
                maxWidth: '600px',
                width: '90%'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px', textTransform: 'uppercase' }}>
                  Add New Transaction
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Date</label>
                  <input
                    type="date"
                    value={newTransaction.transaction_date}
                    onChange={(e) => {
                      const date = e.target.value;
                      setNewTransaction({
                        ...newTransaction,
                        transaction_date: date,
                        month_year: date.slice(0, 7)
                      });
                    }}
                    style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Description</label>
                  <input
                    type="text"
                    list="descriptions"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="Enter or select description"
                    style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem', fontWeight: 600 }}
                  />
                  <datalist id="descriptions">
                    {allDescriptions.map(desc => (
                      <option key={desc} value={desc} />
                    ))}
                  </datalist>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Account Number (Optional)</label>
                  <input
                    type="text"
                    value={newTransaction.account_number}
                    onChange={(e) => setNewTransaction({ ...newTransaction, account_number: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-yellow"
                    onClick={handleAddTransaction}
                    disabled={loading || !newTransaction.description || !newTransaction.amount}
                    style={{ flex: 1 }}
                  >
                    <Save size={18} style={{ marginRight: '8px' }} />
                    Save Transaction
                  </button>
                  <button
                    className="btn btn-white"
                    onClick={() => setShowAddForm(false)}
                    style={{ flex: 1 }}
                  >
                    <X size={18} style={{ marginRight: '8px' }} />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {savedMonths.length === 0 ? (
            <div style={{
              border: '3px solid #000',
              padding: '48px',
              textAlign: 'center',
              background: '#f8f8f8'
            }}>
              <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#666' }}>
                No saved transactions yet
              </p>
              <p style={{ color: '#999' }}>Upload a file to get started</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                {/* All Transactions Card */}
                <div
                  className={`month-card ${selectedMonth === 'all' ? 'selected' : ''}`}
                  onClick={() => fetchAllTransactions()}
                  style={{
                    padding: '24px',
                    background: selectedMonth === 'all' ? '#0000FF' : '#fff',
                    color: selectedMonth === 'all' ? '#fff' : '#000',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>
                    ALL TRANSACTIONS
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    View all transactions across all months
                  </div>
                </div>

                {savedMonths.map(month => (
                  <div
                    key={month.month_year}
                    className={`month-card ${selectedMonth === month.month_year ? 'selected' : ''}`}
                    onClick={() => fetchMonthTransactions(month.month_year)}
                    style={{
                      padding: '24px',
                      background: selectedMonth === month.month_year ? '#FFD500' : '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>
                          {formatMonthYear(month.month_year)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          {month.transaction_count} transactions
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ padding: '8px', minWidth: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMonth(month.month_year);
                        }}
                        title="Delete month"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF0000' }}>
                      {formatCurrency(month.total_amount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Month Transactions */}
              {selectedMonth && monthTransactions.length > 0 && (() => {
                // Filter transactions by date range
                const filterByDateRange = (transactions) => {
                  if (dateRangeFilter === 'all') return transactions;

                  const now = new Date();
                  const startDate = new Date();

                  switch(dateRangeFilter) {
                    case '1day':
                      startDate.setDate(now.getDate() - 1);
                      break;
                    case '3days':
                      startDate.setDate(now.getDate() - 3);
                      break;
                    case '7days':
                      startDate.setDate(now.getDate() - 7);
                      break;
                    case '30days':
                      startDate.setDate(now.getDate() - 30);
                      break;
                    case '3months':
                      startDate.setMonth(now.getMonth() - 3);
                      break;
                    case '6months':
                      startDate.setMonth(now.getMonth() - 6);
                      break;
                    default:
                      return transactions;
                  }

                  return transactions.filter(trans => {
                    const transDate = new Date(trans.transaction_date);
                    return transDate >= startDate && transDate <= now;
                  });
                };

                const filteredTransactions = filterByDateRange(monthTransactions);

                // Calculate top 5 spending by description
                const spendingByDescription = {};
                filteredTransactions.forEach(trans => {
                  if (!spendingByDescription[trans.description]) {
                    spendingByDescription[trans.description] = {
                      total: 0,
                      count: 0,
                      transactions: []
                    };
                  }
                  spendingByDescription[trans.description].total += trans.amount;
                  spendingByDescription[trans.description].count += 1;
                  spendingByDescription[trans.description].transactions.push(trans);
                });

                const top5 = Object.entries(spendingByDescription)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 5);

                const totalSpending = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
                const maxSpending = top5[0] ? top5[0][1].total : 0;

                return (
                  <div style={{
                    border: '4px solid #000',
                    background: '#fff',
                    padding: '32px'
                  }}>
                    <h3 style={{
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      marginBottom: '24px',
                      textTransform: 'UPPERCASE'
                    }}>
                      {selectedMonth === 'all' ? 'ALL TRANSACTIONS' : formatMonthYear(selectedMonth)}
                    </h3>

                    {/* Date Range Filters */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '32px',
                      flexWrap: 'wrap'
                    }}>
                      {[
                        { value: 'all', label: 'All Time' },
                        { value: '1day', label: '1 Day' },
                        { value: '3days', label: '3 Days' },
                        { value: '7days', label: '7 Days' },
                        { value: '30days', label: '30 Days' },
                        { value: '3months', label: '3 Months' },
                        { value: '6months', label: '6 Months' }
                      ].map(range => (
                        <button
                          key={range.value}
                          className="btn"
                          onClick={() => setDateRangeFilter(range.value)}
                          style={{
                            padding: '8px 16px',
                            background: dateRangeFilter === range.value ? '#FFD500' : '#fff',
                            border: '3px solid #000',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>

                    {/* Summary Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '20px',
                      marginBottom: '40px'
                    }}>
                      <div style={{
                        padding: '24px',
                        background: '#f8f8f8',
                        border: '3px solid #000'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#666', marginBottom: '8px' }}>
                          TOTAL SPENDING
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FF0000' }}>
                          {formatCurrency(totalSpending)}
                        </div>
                      </div>
                      <div style={{
                        padding: '24px',
                        background: '#f8f8f8',
                        border: '3px solid #000'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#666', marginBottom: '8px' }}>
                          TRANSACTIONS
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>
                          {filteredTransactions.length}
                        </div>
                      </div>
                      <div style={{
                        padding: '24px',
                        background: '#f8f8f8',
                        border: '3px solid #000'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#666', marginBottom: '8px' }}>
                          CATEGORIES
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>
                          {Object.keys(spendingByDescription).length}
                        </div>
                      </div>
                    </div>

                    {/* Top 5 Spending Chart */}
                    <div style={{
                      marginBottom: '40px',
                      padding: '24px',
                      background: '#fff',
                      border: '3px solid #000'
                    }}>
                      <h4 style={{
                        fontSize: '1.3rem',
                        fontWeight: 900,
                        marginBottom: '24px',
                        textTransform: 'uppercase'
                      }}>
                        Top 5 Spending
                      </h4>
                      {top5.map(([description, data], idx) => {
                        const percentage = (data.total / maxSpending) * 100;
                        const colors = ['#FFD500', '#FF0000', '#00FF00', '#0000FF', '#FF00FF'];
                        return (
                          <div key={description} style={{ marginBottom: '20px' }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{description}</span>
                              <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#FF0000' }}>
                                {formatCurrency(data.total)}
                              </span>
                            </div>
                            <div style={{
                              height: '40px',
                              background: '#e0e0e0',
                              border: '2px solid #000',
                              position: 'relative'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: colors[idx],
                                border: '2px solid #000',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '12px',
                                fontWeight: 700
                              }}>
                                {data.count} transaction{data.count > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grouped Transactions */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '1.3rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          margin: 0
                        }}>
                          All Transactions
                        </h4>
                        <input
                          type="text"
                          placeholder="Search by description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{
                            padding: '10px',
                            border: '3px solid #000',
                            fontWeight: 600,
                            width: '300px',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      {Object.entries(spendingByDescription)
                        .filter(([description]) => {
                          if (!searchTerm) return true;
                          return description.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([description, data]) => (
                          <div key={description} style={{
                            marginBottom: '16px',
                            border: '3px solid #000',
                            background: '#fff'
                          }}>
                            <div
                              onClick={() => {
                                const elem = document.getElementById(`group-${description}`);
                                elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
                              }}
                              style={{
                                padding: '20px',
                                cursor: 'pointer',
                                background: '#f8f8f8',
                                borderBottom: '3px solid #000'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '4px' }}>
                                    {description}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    {data.count} transaction{data.count > 1 ? 's' : ''}
                                  </div>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF0000' }}>
                                  {formatCurrency(data.total)}
                                </div>
                              </div>
                            </div>
                            <div id={`group-${description}`} style={{ display: 'none' }}>
                              {data.transactions.map((trans) => (
                                <div key={trans.id} style={{
                                  padding: '16px 20px',
                                  borderBottom: '2px solid #e0e0e0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  {editingTransaction && editingTransaction.id === trans.id ? (
                                    <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                                      <input
                                        type="date"
                                        value={editingTransaction.transaction_date}
                                        onChange={(e) => setEditingTransaction({
                                          ...editingTransaction,
                                          transaction_date: e.target.value,
                                          month_year: e.target.value.slice(0, 7)
                                        })}
                                        style={{ padding: '8px', border: '2px solid #000', fontWeight: 600, flex: 1 }}
                                      />
                                      <input
                                        type="text"
                                        list="descriptions-edit"
                                        value={editingTransaction.description}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                                        style={{ padding: '8px', border: '2px solid #000', fontWeight: 600, flex: 2 }}
                                      />
                                      <datalist id="descriptions-edit">
                                        {allDescriptions.map(desc => (
                                          <option key={desc} value={desc} />
                                        ))}
                                      </datalist>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editingTransaction.amount}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                                        style={{ padding: '8px', border: '2px solid #000', fontWeight: 600, width: '120px' }}
                                      />
                                      <button
                                        className="btn btn-yellow"
                                        onClick={() => handleUpdateTransaction(trans.id)}
                                        style={{ padding: '8px' }}
                                      >
                                        <Save size={16} />
                                      </button>
                                      <button
                                        className="btn btn-white"
                                        onClick={() => setEditingTransaction(null)}
                                        style={{ padding: '8px' }}
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                                        {new Date(trans.transaction_date).toLocaleDateString('en-GB')}
                                      </div>
                                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>
                                          {formatCurrency(trans.amount)}
                                        </div>
                                        <button
                                          className="btn btn-white"
                                          onClick={() => setEditingTransaction({
                                            id: trans.id,
                                            transaction_date: trans.transaction_date,
                                            description: trans.description,
                                            amount: trans.amount,
                                            account_number: trans.account_number || '',
                                            month_year: trans.month_year
                                          })}
                                          style={{ padding: '8px' }}
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          className="btn"
                                          onClick={() => handleDeleteTransaction(trans.id)}
                                          style={{ padding: '8px' }}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankTransactions;
