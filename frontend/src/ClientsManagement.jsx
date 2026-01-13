import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import API_BASE from './config';

// Centralized theme + fonts - matching TaskTracker theme
const THEME = {
  bg: '#fff',
  surface: '#ffffff',
  primary: '#0000FF',      // Blue (primary actions)
  primaryDark: '#0000FF',
  secondary: '#FFD500',    // Yellow
  text: '#000',            // Black
  muted: '#666',
  info: '#0000FF',         // Blue
  success: '#00AA00',      // Green
  border: '#000',          // Black
  dangerBg: '#fff',
  successBg: '#f8f8f8',
  highlightBg: '#f8f8f8',
  accent: '#FF0000'        // Red (for errors only)
};

// Font stack matching TaskTracker
const FONT_STACK = '"Inter", "Helvetica Neue", Calibri, sans-serif';

const ClientsManagement = ({ onBackToTasks }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTasks, setClientTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [newClientName, setNewClientName] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientName, setAddClientName] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/clients/manage`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to fetch clients: ' + err.message);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTasks = async (clientName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setClientTasks(data || []);
      setSelectedClient(clientName);
    } catch (err) {
      console.error('Error fetching client tasks:', err);
      setError('Failed to fetch client tasks: ' + err.message);
      setClientTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameClient = async (oldName) => {
    if (!newClientName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newClientName })
      });

      if (!response.ok) throw new Error('Failed to rename client');

      setEditingClient(null);
      setNewClientName('');
      await fetchClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientName) => {
    if (!window.confirm(`Are you sure you want to delete all tasks for "${clientName}"?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setSelectedClient(null);
      setClientTasks([]);
      await fetchClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!addClientName.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addClientName.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add client');
      }

      setShowAddClient(false);
      setAddClientName('');
      await fetchClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: FONT_STACK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
        .btn {
          transition: all 0.15s ease;
          cursor: pointer;
          border: 3px solid #000;
          font-family: ${FONT_STACK};
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

        .btn:active {
          box-shadow: none;
          transform: translate(0, 0);
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-primary {
          background: ${THEME.primary};
          color: #fff;
          border-color: #000;
        }

        .btn-secondary {
          background: ${THEME.secondary};
          color: ${THEME.text};
          border-color: #000;
        }

        .btn-outline {
          background: #fff;
          color: #000;
          border-color: #000;
        }
      `}</style>
      {/* Header */}
      <header style={{
        background: '#fff',
        color: '#000',
        padding: '2rem 3rem',
        borderBottom: `4px solid ${THEME.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              margin: '0 0 8px 0',
              letterSpacing: '-1px',
              textTransform: 'uppercase'
            }}>
              Clients Management
            </h1>
            <p style={{
              fontSize: '1.1rem',
              margin: 0,
              fontWeight: 400,
              color: THEME.muted
            }}>
              Manage clients and track billable hours
            </p>
          </div>
          {onBackToTasks && (
            <button className="btn btn-outline" onClick={onBackToTasks}>
              <ArrowLeft size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Back to Tasks
            </button>
          )}
        </div>
      </header>

      {error && (
        <div style={{
          background: THEME.accent,
          color: '#fff',
          padding: '1rem 3rem',
          fontWeight: 600,
          borderBottom: `3px solid ${THEME.border}`
        }}>
          {error}
        </div>
      )}

      <div style={{ padding: '3rem', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Clients List */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 800,
              margin: 0,
              textTransform: 'UPPERCASE',
              color: THEME.text,
              letterSpacing: '-0.5px'
            }}>
              All Clients
            </h2>
            {!showAddClient && (
              <button
                className="btn btn-success"
                onClick={() => setShowAddClient(true)}
                style={{ background: THEME.success, color: '#fff', borderColor: THEME.border }}
              >
                <Plus size={18} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
                Add Client
              </button>
            )}
          </div>

          {/* Add Client Form */}
          {showAddClient && (
            <div style={{
              border: `3px solid ${THEME.border}`,
              background: THEME.surface,
              padding: '2rem',
              marginBottom: '1.5rem',
              boxShadow: '4px 4px 0px #000'
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', color: THEME.text }}>
                Add New Client
              </h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: THEME.text
                  }}>
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={addClientName}
                    onChange={(e) => setAddClientName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddClient();
                      }
                    }}
                    placeholder="Enter client name..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `3px solid ${THEME.border}`,
                      fontWeight: 600,
                      fontSize: '1rem',
                      fontFamily: FONT_STACK,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  className="btn btn-success"
                  onClick={handleAddClient}
                  disabled={loading || !addClientName.trim()}
                  style={{ background: THEME.success, color: '#fff', borderColor: THEME.border }}
                >
                  <Plus size={18} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
                  Add
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setShowAddClient(false);
                    setAddClientName('');
                    setError(null);
                  }}
                  style={{ background: THEME.surface, color: THEME.text, borderColor: THEME.border }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{
              border: `3px solid ${THEME.border}`,
              padding: '3rem',
              textAlign: 'center',
              background: THEME.surface,
              boxShadow: '4px 4px 0px #000'
            }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: THEME.muted }}>
                Loading clients...
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div style={{
              border: `3px solid ${THEME.border}`,
              padding: '3rem',
              textAlign: 'center',
              background: THEME.surface,
              boxShadow: '4px 4px 0px #000'
            }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.3, color: THEME.text }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: THEME.muted }}>
                No clients yet
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {clients.map(client => (
                <div
                  key={client.client}
                  style={{
                    border: `3px solid ${THEME.border}`,
                    background: selectedClient === client.client ? THEME.highlightBg : THEME.surface,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: '4px 4px 0px #000',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedClient !== client.client) {
                      e.currentTarget.style.transform = 'translate(-2px, -2px)';
                      e.currentTarget.style.boxShadow = '6px 6px 0px #000';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedClient !== client.client) {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = '4px 4px 0px #000';
                    }
                  }}
                >
                  <div
                    onClick={() => fetchClientTasks(client.client)}
                    style={{ padding: '1.5rem' }}
                  >
                    <div style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      marginBottom: '1rem',
                      color: THEME.text
                    }}>
                      {client.client}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Total Hours
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: THEME.info }}>
                          {(client.total_hours || 0).toFixed(1)}h
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Tasks
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: THEME.info }}>
                          {client.task_count}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: THEME.success, fontWeight: 600 }}>
                      ✓ {client.completed_tasks} completed
                    </div>
                  </div>

                  <div style={{
                    padding: '1rem 1.5rem',
                    background: '#f8f8f8',
                    borderTop: `3px solid ${THEME.border}`,
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    {editingClient === client.client ? (
                      <>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="New name"
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: `3px solid ${THEME.border}`,
                            fontWeight: 600,
                            fontSize: '1rem',
                            fontFamily: FONT_STACK
                          }}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleRenameClient(client.client)}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Save
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            setEditingClient(null);
                            setNewClientName('');
                          }}
                          style={{ padding: '0.5rem 1rem', background: THEME.surface, color: THEME.text, borderColor: THEME.border }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClient(client.client);
                            setNewClientName(client.client);
                          }}
                          style={{ flex: 1, background: THEME.surface, color: THEME.info, borderColor: THEME.info }}
                        >
                          <Edit2 size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                          Rename
                        </button>
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.client);
                          }}
                          style={{ padding: '0.5rem 0.75rem', background: THEME.accent, color: '#fff', borderColor: THEME.border }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Client Tasks */}
        {selectedClient && clientTasks.length > 0 && (
          <div style={{
            border: `3px solid ${THEME.border}`,
            background: THEME.surface,
            padding: '2rem',
            boxShadow: '4px 4px 0px #000'
          }}>
            <h3 style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              color: THEME.text,
              letterSpacing: '-0.5px'
            }}>
              Tasks for {selectedClient}
            </h3>

            <div style={{
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {clientTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    border: `3px solid ${THEME.border}`,
                    background: task.status === 'completed' ? THEME.successBg : THEME.surface,
                    boxShadow: '4px 4px 0px #000',
                    borderLeft: task.status === 'completed' ? `4px solid ${THEME.success}` : `4px solid ${THEME.info}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        marginBottom: '0.5rem',
                        color: THEME.text
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: THEME.muted, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span>{new Date(task.task_date).toLocaleDateString('en-GB')}</span>
                        {task.duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} />
                            {task.duration}h
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span style={{ color: THEME.success, display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <CheckCircle size={14} />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {task.description && (
                    <div style={{
                      fontSize: '0.9rem',
                      color: THEME.muted,
                      marginTop: '0.5rem',
                      lineHeight: '1.5'
                    }}>
                      {task.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsManagement;
