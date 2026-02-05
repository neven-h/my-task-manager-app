import React, { useState, useEffect } from 'react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api.drpitz.club/api'
    : 'http://localhost:5001/api');

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
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
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
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
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
    <div className="app-container">
      <div className="header">
        <div className="header-left">
          <button className="btn btn-blue" onClick={onBackToTasks}>
            ← Back to Tasks
          </button>
          <h1 style={{margin: 0}}>Stock Portfolio Tracker</h1>
        </div>
        <button
          className="btn btn-green"
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
        >
          + Add Entry
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{margin: '20px 0'}}>
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="portfolio-summary" style={{
          background: '#FFD500',
          border: '4px solid #000',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h2 style={{margin: '0 0 15px 0'}}>Portfolio Summary</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
            <div>
              <div style={{fontSize: '14px', fontWeight: 600}}>Total Value</div>
              <div style={{fontSize: '28px', fontWeight: 900}}>
                {formatCurrency(summary.total_value)}
              </div>
            </div>
            <div>
              <div style={{fontSize: '14px', fontWeight: 600}}>Total Stocks</div>
              <div style={{fontSize: '28px', fontWeight: 900}}>
                {summary.count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="portfolio-entries">
        {loading && <div>Loading...</div>}

        {!loading && Object.keys(groupedEntries).length === 0 && (
          <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            No portfolio entries yet. Click "Add Entry" to start tracking!
          </div>
        )}

        {Object.entries(groupedEntries).map(([stockName, stockEntries]) => (
          <div key={stockName} className="stock-group" style={{
            border: '4px solid #000',
            marginBottom: '20px',
            background: '#fff'
          }}>
            <div style={{
              background: '#0000FF',
              color: '#fff',
              padding: '15px',
              fontWeight: 900,
              fontSize: '18px',
              borderBottom: '4px solid #000'
            }}>
              {stockName}
            </div>

            <div className="entries-table">
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{background: '#f5f5f5', borderBottom: '2px solid #000'}}>
                    <th style={{padding: '12px', textAlign: 'left', fontWeight: 700}}>Date</th>
                    <th style={{padding: '12px', textAlign: 'right', fontWeight: 700}}>Value (ILS)</th>
                    <th style={{padding: '12px', textAlign: 'right', fontWeight: 700}}>Percentage</th>
                    <th style={{padding: '12px', textAlign: 'center', fontWeight: 700}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockEntries
                    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
                    .map(entry => (
                      <tr key={entry.id} style={{borderBottom: '1px solid #ddd'}}>
                        <td style={{padding: '12px'}}>
                          {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', fontWeight: 600}}>
                          {formatCurrency(entry.value_ils)}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right'}}>
                          {entry.percentage ? `${entry.percentage}%` : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          <button
                            className="btn btn-sm btn-blue"
                            onClick={() => handleEdit(entry)}
                            style={{marginRight: '5px', fontSize: '12px', padding: '5px 10px'}}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-red"
                            onClick={() => handleDelete(entry.id)}
                            style={{fontSize: '12px', padding: '5px 10px'}}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEntry ? 'Edit Entry' : 'Add Portfolio Entry'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Stock/Asset Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Apple, Bitcoin, Real Estate"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Value (ILS) *</label>
                  <input
                    type="number"
                    name="value_ils"
                    value={formData.value_ils}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Percentage of Portfolio</label>
                  <input
                    type="number"
                    name="percentage"
                    value={formData.percentage}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Optional"
                    className="form-control"
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    Optional: What percentage of your total portfolio does this represent?
                  </small>
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="entry_date"
                    value={formData.entry_date}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-actions" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                  <button type="submit" className="btn btn-green" disabled={loading}>
                    {loading ? 'Saving...' : editingEntry ? 'Update Entry' : 'Add Entry'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-red"
                    onClick={() => setShowForm(false)}
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
