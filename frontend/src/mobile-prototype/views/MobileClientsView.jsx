import React, {useState, useEffect} from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const THEME = {
    bg: '#fff', primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    text: '#000', muted: '#666', success: '#00AA00', border: '#000'
};
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileClientsView = ({authUser, authRole, onBack}) => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientTasks, setClientTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newClient, setNewClient] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/clients/manage`, { headers: getAuthHeaders() });
            const data = await response.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientTasks = async (clientName) => {
        try {
            const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}/tasks`, { headers: getAuthHeaders() });
            const data = await response.json();
            setClientTasks(Array.isArray(data) ? data : []);
            setSelectedClient(clientName);
        } catch (err) {
            console.error('Error fetching client tasks:', err);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!newClient.name?.trim()) return;

        try {
            setCreateLoading(true);
            const response = await fetch(`${API_BASE}/clients`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: newClient.name.trim(),
                    email: newClient.email?.trim() || '',
                    phone: newClient.phone?.trim() || '',
                    notes: newClient.notes?.trim() || '',
                    owner: authUser
                })
            });

            if (response.ok) {
                setNewClient({name: '', email: '', phone: '', notes: ''});
                setShowAddForm(false);
                await fetchClients();
            }
        } catch (err) {
            console.error('Failed to create client:', err);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteClient = async (clientName) => {
        if (!window.confirm(`Delete all tasks for "${clientName}"?`)) return;
        try {
            await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            setSelectedClient(null);
            setClientTasks([]);
            await fetchClients();
        } catch (err) {
            console.error('Failed to delete client:', err);
        }
    };

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        CLIENTS
                    </h1>
                </div>
            </div>

            {/* Clients List */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : clients.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No clients yet
                    </div>
                ) : (
                    clients.map(client => (
                        <div
                            key={client.client}
                            onClick={() => fetchClientTasks(client.client)}
                            style={{
                                border: '3px solid #000',
                                padding: '16px',
                                marginBottom: '12px',
                                background: selectedClient === client.client ? '#f8f8f8' : '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px'}}>
                                {client.client}
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: THEME.muted}}>
                                <div>
                                    <div style={{fontWeight: 700}}>{(client.total_hours || 0).toFixed(1)}h</div>
                                    <div style={{fontSize: '0.75rem'}}>Total Hours</div>
                                </div>
                                <div>
                                    <div style={{fontWeight: 700}}>{client.task_count || 0}</div>
                                    <div style={{fontSize: '0.75rem'}}>Tasks</div>
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client.client);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: '2px solid #000',
                                        background: THEME.accent,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Client Tasks */}
            {selectedClient && clientTasks.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: '50vh',
                    background: '#fff',
                    borderTop: '3px solid #000',
                    padding: '16px',
                    overflowY: 'auto',
                    zIndex: 100
                }}>
                    <div style={{fontSize: '1.1rem', fontWeight: 900, marginBottom: '12px'}}>
                        Tasks for {selectedClient}
                    </div>
                    {clientTasks.map(task => (
                        <div
                            key={task.id}
                            style={{
                                border: '2px solid #000',
                                padding: '12px',
                                marginBottom: '8px',
                                background: task.status === 'completed' ? '#f8f8f8' : '#fff'
                            }}
                        >
                            <div style={{fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px'}}>
                                {task.title}
                            </div>
                            <div style={{fontSize: '0.8rem', color: THEME.muted}}>
                                {new Date(task.task_date).toLocaleDateString('en-GB')}
                                {task.duration && ` • ${task.duration}h`}
                                {task.status === 'completed' && ' • ✓ Completed'}
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setSelectedClient(null)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '3px solid #000',
                            background: THEME.primary,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            marginTop: '12px'
                        }}
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Add Client Button */}
            <button
                onClick={() => setShowAddForm(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            {/* Add Client Form Modal */}
            {showAddForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddForm(false);
                        }
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '80vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        padding: '20px',
                        overflowY: 'auto'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                New Client
                            </h2>
                            <button onClick={() => setShowAddForm(false)} style={{background: 'none', border: 'none', padding: '8px'}}>
                                <X size={28}/>
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient}>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                                        required
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={newClient.phone}
                                        onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Notes
                                    </label>
                                    <textarea
                                        value={newClient.notes}
                                        onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                                        rows={3}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            border: '3px solid #000',
                                            background: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createLoading || !newClient.name?.trim()}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            border: '3px solid #000',
                                            background: THEME.primary,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            opacity: (createLoading || !newClient.name?.trim()) ? 0.5 : 1
                                        }}
                                    >
                                        {createLoading ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileClientsView;
