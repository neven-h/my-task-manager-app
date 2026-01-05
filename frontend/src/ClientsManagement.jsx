import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import API_BASE from './config';

// Centralized theme + fonts (edit these to change UI colors / typography)
const THEME = {
  bg: '#f8fafc',
  surface: '#ffffff',
  primary: '#dc3545',
  primaryDark: '#c82333',
  secondary: '#ffc107',
  text: '#1a1a1a',
  muted: '#64748b',
  info: '#0d6efd',
  success: '#059669',
  border: '#e2e8f0',
  dangerBg: '#fef2f2',
  successBg: '#f0fdf4',
  highlightBg: '#fffbeb'
};

// Hebrew-friendly font stack (Heebo is great for Hebrew; falls back to system fonts)
const FONT_STACK = '"Heebo", "Assistant", "Rubik", "Noto Sans Hebrew", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

const ClientsManagement = ({ onBackToTasks }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTasks, setClientTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [newClientName, setNewClientName] = useState('');

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

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: FONT_STACK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap');
        .btn {
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid;
          font-family: ${FONT_STACK};
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.9rem;
          padding: 12px 24px;
          border-radius: 8px;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: ${THEME.primary};
          color: #fff;
          border-color: ${THEME.primary};
        }

        .btn-secondary {
          background: ${THEME.secondary};
          color: ${THEME.text};
          border-color: ${THEME.secondary};
        }

        .btn-outline {
          background: transparent;
          color: #fff;
          border-color: #fff;
        }
      `}</style>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
        color: '#fff',
        padding: '2rem 3rem',
        borderBottom: `4px solid ${THEME.secondary}`,
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
              color: 'rgba(255, 255, 255, 0.9)'
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
          background: THEME.dangerBg,
          color: THEME.primary,
          padding: '1rem 3rem',
          fontWeight: 600,
          borderBottom: `2px solid ${THEME.primary}`
        }}>
          {error}
        </div>
      )}

      <div style={{ padding: '3rem', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Clients List */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            textTransform: 'UPPERCASE',
            color: THEME.text,
            letterSpacing: '-0.5px'
          }}>
            All Clients
          </h2>

          {loading ? (
            <div style={{
              border: `3px solid ${THEME.primary}`,
              padding: '3rem',
              textAlign: 'center',
              background: THEME.surface,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: THEME.muted }}>
                Loading clients...
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div style={{
              border: `3px solid ${THEME.primary}`,
              padding: '3rem',
              textAlign: 'center',
              background: THEME.surface,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.3, color: THEME.primary }} />
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
                    border: selectedClient === client.client ? `3px solid ${THEME.secondary}` : `3px solid ${THEME.border}`,
                    background: selectedClient === client.client ? THEME.highlightBg : THEME.surface,
                    cursor: 'pointer',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: selectedClient === client.client ? '0 8px 16px rgba(255, 193, 7, 0.2)' : '0 4px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedClient !== client.client) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedClient !== client.client) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
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
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: THEME.primary }}>
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
                    background: THEME.bg,
                    borderTop: `2px solid ${THEME.border}`,
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
                            border: `2px solid ${THEME.border}`,
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '1rem'
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
                          style={{ padding: '0.5rem 1rem', background: THEME.surface, color: THEME.muted, borderColor: THEME.border }}
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
                          style={{ padding: '0.5rem 0.75rem', background: THEME.dangerBg, color: THEME.primary, borderColor: THEME.primary }}
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
            border: `3px solid ${THEME.primary}`,
            background: THEME.surface,
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
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
                    border: `2px solid ${THEME.border}`,
                    background: task.status === 'completed' ? THEME.successBg : THEME.surface,
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
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
