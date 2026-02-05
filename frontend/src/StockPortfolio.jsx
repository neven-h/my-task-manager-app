import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import API_BASE from './config';

const StockPortfolio = ({ onBackToTasks }) => {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    percentage: '',
    value_ils: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const authUser = localStorage.getItem('authUser');
  const authRole = localStorage.getItem('authRole');

  // Color scheme - matching BankTransactions & TaskTracker theme
  const colors = {
    primary: '#0000FF',      // Blue
    secondary: '#FFD500',    // Yellow
    accent: '#FF0000',       // Red
    success: '#00AA00',      // Green
    background: '#fff',
    text: '#000',
    textLight: '#666',
    border: '#000'
  };

  // Fetch all entries
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/portfolio?username=${authUser}&role=${authRole}`
      );
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError('Failed to load portfolio entries');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/portfolio/summary?username=${authUser}&role=${authRole}`
      );
      const data = await response.json();
      if (data && typeof data.total_value !== 'number') {
        data.total_value = 0;
      }
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setSummary({ total_value: 0, entries: [], count: 0 });
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchSummary();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const url = editingEntry
        ? `${API_BASE}/portfolio/${editingEntry.id}`
        : `${API_BASE}/portfolio`;

      const method = editingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          username: authUser
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }

      setShowForm(false);
      setEditingEntry(null);
      setFormData({
        name: '',
        percentage: '',
        value_ils: '',
        entry_date: new Date().toISOString().split('T')[0]
      });

      fetchEntries();
      fetchSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name,
      percentage: entry.percentage || '',
      value_ils: entry.value_ils,
      entry_date: entry.entry_date
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`${API_BASE}/portfolio/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete entry');

      fetchEntries();
      fetchSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(numAmount);
  };

  // Group entries by stock name
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.name]) {
      acc[entry.name] = [];
    }
    acc[entry.name].push(entry);
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: colors.background,
        borderBottom: `4px solid ${colors.border}`,
        padding: '1.5rem 2rem',
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
              background: colors.primary,
              border: `3px solid ${colors.border}`,
              color: '#fff',
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
            <ArrowLeft size={20} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            📈 STOCK PORTFOLIO
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingEntry(null);
            setFormData({
              name: '',
              percentage: '',
              value_ils: '',
              entry_date: new Date().toISOString().split('T')[0]
            });
            setShowForm(true);
          }}
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
          <Plus size={20} /> Add Entry
        </button>
      </header>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {/* Error Alert */}
        {error && (
          <div style={{
            background: colors.accent,
            color: '#fff',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: `3px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>{error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <div style={{
            background: colors.secondary,
            border: `4px solid ${colors.border}`,
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Portfolio Summary
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Total Value
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
                  {formatCurrency(summary.total_value)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Total Stocks
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
                  {summary.count}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: colors.textLight, fontSize: '1.125rem' }}>
            Loading...
          </div>
        )}

        {/* Empty State */}
        {!loading && Object.keys(groupedEntries).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#f8f8f8',
            border: `3px solid ${colors.border}`
          }}>
            <TrendingUp size={64} style={{ color: colors.textLight, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              No portfolio entries yet
            </p>
            <p style={{ color: colors.textLight }}>
              Click "Add Entry" to start tracking your investments!
            </p>
          </div>
        )}

        {/* Entries List */}
        {Object.entries(groupedEntries).map(([stockName, stockEntries]) => (
          <div key={stockName} style={{
            border: `4px solid ${colors.border}`,
            marginBottom: '2rem',
            background: '#fff'
          }}>
            <div style={{
              background: colors.primary,
              color: '#fff',
              padding: '1rem 1.5rem',
              fontWeight: '900',
              fontSize: '1.25rem',
              borderBottom: `4px solid ${colors.border}`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {stockName}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f8f8', borderBottom: `3px solid ${colors.border}` }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.875rem' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.875rem' }}>Value (ILS)</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.875rem' }}>Percentage</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.875rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockEntries
                  .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
                  .map(entry => (
                    <tr key={entry.id} style={{ borderBottom: `2px solid #e0e0e0` }}>
                      <td style={{ padding: '1rem' }}>
                        {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '1.125rem' }}>
                        {formatCurrency(entry.value_ils)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {entry.percentage ? `${entry.percentage}%` : '-'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(entry)}
                          style={{
                            background: colors.primary,
                            border: `2px solid ${colors.border}`,
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            marginRight: '0.5rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            background: colors.accent,
                            border: `2px solid ${colors.border}`,
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: '#fff',
            border: `4px solid ${colors.border}`,
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              background: colors.primary,
              color: '#fff',
              padding: '1.5rem',
              borderBottom: `4px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {editingEntry ? 'Edit Entry' : 'Add Portfolio Entry'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.875rem',
                    letterSpacing: '0.5px'
                  }}>
                    Stock/Asset Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Apple, Bitcoin, Real Estate"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `3px solid ${colors.border}`,
                      fontSize: '1rem',
                      fontFamily: '"Inter", sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.875rem',
                    letterSpacing: '0.5px'
                  }}>
                    Value (ILS) *
                  </label>
                  <input
                    type="number"
                    name="value_ils"
                    value={formData.value_ils}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `3px solid ${colors.border}`,
                      fontSize: '1rem',
                      fontFamily: '"Inter", sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.875rem',
                    letterSpacing: '0.5px'
                  }}>
                    Percentage of Portfolio
                  </label>
                  <input
                    type="number"
                    name="percentage"
                    value={formData.percentage}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `3px solid ${colors.border}`,
                      fontSize: '1rem',
                      fontFamily: '"Inter", sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: colors.textLight, fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    Optional: What percentage of your total portfolio?
                  </small>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.875rem',
                    letterSpacing: '0.5px'
                  }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    name="entry_date"
                    value={formData.entry_date}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `3px solid ${colors.border}`,
                      fontSize: '1rem',
                      fontFamily: '"Inter", sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: colors.success,
                      border: `3px solid ${colors.border}`,
                      color: '#fff',
                      padding: '1rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Saving...' : editingEntry ? 'Update Entry' : 'Add Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      flex: 1,
                      background: colors.accent,
                      border: `3px solid ${colors.border}`,
                      color: '#fff',
                      padding: '1rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPortfolio;
