import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import API_BASE from './config';

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
    <div style={{ minHeight: '100vh', background: '#fff' }}>
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

        .btn-white {
          background: #fff;
          color: #000;
          border-color: #000;
        }

        .btn-yellow {
          background: #FFD500;
          color: #000;
          border-color: #000;
        }
      `}</style>
      {/* Header */}
      <header style={{
        background: '#000',
        color: '#fff',
        padding: '24px 48px',
        borderBottom: '4px solid #000'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '3rem',
              fontWeight: 900,
              margin: '0 0 8px 0',
              letterSpacing: '-1px',
              textTransform: 'uppercase'
            }}>
              Clients Management
            </h1>
            <p style={{
              fontSize: '1rem',
              margin: 0,
              fontWeight: 400,
              color: '#ccc'
            }}>
              Manage clients and track billable hours
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

      {error && (
        <div style={{
          background: '#FF0000',
          color: '#fff',
          padding: '16px 48px',
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      <div style={{ padding: '48px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Clients List */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 900,
            marginBottom: '24px',
            textTransform: 'UPPERCASE'
          }}>
            All Clients
          </h2>

          {loading ? (
            <div style={{
              border: '3px solid #000',
              padding: '48px',
              textAlign: 'center',
              background: '#f8f8f8'
            }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#666' }}>
                Loading clients...
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div style={{
              border: '3px solid #000',
              padding: '48px',
              textAlign: 'center',
              background: '#f8f8f8'
            }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#666' }}>
                No clients yet
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {clients.map(client => (
                <div
                  key={client.client}
                  style={{
                    border: '3px solid #000',
                    background: selectedClient === client.client ? '#FFD500' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    onClick={() => fetchClientTasks(client.client)}
                    style={{ padding: '24px' }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      marginBottom: '12px'
                    }}>
                      {client.client}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>
                          TOTAL HOURS
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF0000' }}>
                          {(client.total_hours || 0).toFixed(1)}h
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>
                          TASKS
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                          {client.task_count}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {client.completed_tasks} completed
                    </div>
                  </div>

                  <div style={{
                    padding: '16px 24px',
                    background: '#f8f8f8',
                    borderTop: '3px solid #000',
                    display: 'flex',
                    gap: '8px'
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
                            padding: '8px',
                            border: '2px solid #000',
                            fontWeight: 600
                          }}
                        />
                        <button
                          className="btn btn-yellow"
                          onClick={() => handleRenameClient(client.client)}
                          style={{ padding: '8px 16px' }}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-white"
                          onClick={() => {
                            setEditingClient(null);
                            setNewClientName('');
                          }}
                          style={{ padding: '8px 16px' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClient(client.client);
                            setNewClientName(client.client);
                          }}
                          style={{ flex: 1 }}
                        >
                          <Edit2 size={14} style={{ marginRight: '6px' }} />
                          Rename
                        </button>
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.client);
                          }}
                          style={{ padding: '8px' }}
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
            border: '4px solid #000',
            background: '#fff',
            padding: '32px'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              marginBottom: '24px',
              textTransform: 'uppercase'
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
                    padding: '20px',
                    marginBottom: '12px',
                    border: '3px solid #000',
                    background: task.status === 'completed' ? '#f8f8f8' : '#fff'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        marginBottom: '4px'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {new Date(task.task_date).toLocaleDateString('en-GB')}
                        {task.duration && (
                          <span style={{ marginLeft: '12px' }}>
                            <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            {' '}{task.duration}h
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span style={{ marginLeft: '12px', color: '#00AA00' }}>
                            <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            {' '}Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {task.description && (
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      marginTop: '8px'
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
