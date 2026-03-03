import React, { useState, useEffect } from 'react';
import { Users, Plus, ArrowLeft } from 'lucide-react';
import API_BASE from './config';
import { getAuthHeaders } from './api.js';
import storage, { STORAGE_KEYS } from './utils/storage';
import AddClientForm from './components/clients/AddClientForm';
import ClientCard from './components/clients/ClientCard';
import ClientTaskList from './components/clients/ClientTaskList';

const FONT_STACK = '"Inter", "Helvetica Neue", Calibri, sans-serif';

const colors = {
    bg: '#fff', surface: '#ffffff', primary: '#0000FF', secondary: '#FFD500',
    text: '#000', muted: '#666', success: '#00AA00', border: '#000', accent: '#FF0000'
};

const ClientsManagement = ({ onBackToTasks }) => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientTasks, setClientTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [newClientName, setNewClientName] = useState('');

    useEffect(() => { fetchClients(); }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/clients/manage`, { headers: getAuthHeaders() });
            if (!response.ok) {
                if (response.status === 401) throw new Error('Authentication required. Please log in.');
                if (response.status === 403) throw new Error('Access denied. Admin privileges required.');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setClients((await response.json()) || []);
        } catch (err) {
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
            const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}/tasks`, { headers: getAuthHeaders() });
            if (!response.ok) {
                if (response.status === 401) throw new Error('Authentication required. Please log in.');
                if (response.status === 403) throw new Error('Access denied. Admin privileges required.');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setClientTasks((await response.json()) || []);
            setSelectedClient(clientName);
        } catch (err) {
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
                method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ new_name: newClientName })
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
                method: 'DELETE', headers: getAuthHeaders()
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

    const handleCreateClient = async (newClient) => {
        const username = storage.get(STORAGE_KEYS.AUTH_USER);
        if (!username) { setError('User not authenticated. Please log in again.'); return; }
        const response = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name: newClient.name.trim(),
                email: newClient.email?.trim() || '',
                phone: newClient.phone?.trim() || '',
                notes: newClient.notes?.trim() || '',
                owner: username
            })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create client');
        }
        setShowAddForm(false);
        setSuccessMessage('Client created successfully!');
        await fetchClients();
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: FONT_STACK }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
                .btn { transition: all 0.15s ease; cursor: pointer; border: 3px solid #000; font-family: ${FONT_STACK}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.85rem; padding: 14px 28px; background: #fff; color: #000; }
                .btn:hover:not(:disabled) { box-shadow: 4px 4px 0px #000; transform: translate(-2px, -2px); }
                .btn:active { box-shadow: none; transform: translate(0, 0); }
                .btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .btn-primary { background: ${colors.primary}; color: #fff; border-color: #000; }
                .btn-secondary { background: ${colors.secondary}; color: ${colors.text}; border-color: #000; }
                .btn-outline { background: #fff; color: #000; border-color: #000; }
            `}</style>

            <header style={{ background: '#fff', color: '#000', padding: '2rem 3rem', borderBottom: `4px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-1px', textTransform: 'uppercase' }}>
                            Clients Management
                        </h1>
                        <p style={{ fontSize: '1.1rem', margin: 0, fontWeight: 400, color: colors.muted }}>
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
                <div style={{ background: colors.accent, color: '#fff', padding: '1rem 3rem', fontWeight: 600, borderBottom: `3px solid ${colors.border}` }}>
                    {error}
                </div>
            )}
            {successMessage && (
                <div style={{ background: colors.success, color: '#fff', padding: '1rem 3rem', fontWeight: 600, borderBottom: `3px solid ${colors.border}` }}>
                    {successMessage}
                </div>
            )}

            <div style={{ padding: '3rem', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, textTransform: 'UPPERCASE', color: colors.text, letterSpacing: '-0.5px' }}>
                            All Clients
                        </h2>
                        <button
                            className="btn btn-primary"
                            onClick={() => { setShowAddForm(!showAddForm); setError(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} />
                            {showAddForm ? 'Cancel' : 'Add New Client'}
                        </button>
                    </div>

                    {showAddForm && (
                        <AddClientForm
                            colors={colors}
                            onSubmit={handleCreateClient}
                            onCancel={() => { setShowAddForm(false); setError(null); }}
                        />
                    )}

                    {loading ? (
                        <div style={{ border: `3px solid ${colors.border}`, padding: '3rem', textAlign: 'center', background: colors.surface, boxShadow: '4px 4px 0px #000' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: colors.muted }}>Loading clients...</p>
                        </div>
                    ) : clients.length === 0 ? (
                        <div style={{ border: `3px solid ${colors.border}`, padding: '3rem', textAlign: 'center', background: colors.surface, boxShadow: '4px 4px 0px #000' }}>
                            <Users size={48} style={{ marginBottom: '16px', opacity: 0.3, color: colors.text }} />
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: colors.muted }}>No clients yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {clients.map(client => (
                                <ClientCard
                                    key={client.client}
                                    client={client}
                                    isSelected={selectedClient === client.client}
                                    editingClient={editingClient}
                                    newClientName={newClientName}
                                    colors={colors}
                                    onSelect={fetchClientTasks}
                                    onStartEdit={(name) => { setEditingClient(name); setNewClientName(name); }}
                                    onCancelEdit={() => { setEditingClient(null); setNewClientName(''); }}
                                    onNameChange={setNewClientName}
                                    onRename={handleRenameClient}
                                    onDelete={handleDeleteClient}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {selectedClient && clientTasks.length > 0 && (
                    <ClientTaskList clientName={selectedClient} tasks={clientTasks} colors={colors} />
                )}
            </div>
        </div>
    );
};

export default ClientsManagement;
