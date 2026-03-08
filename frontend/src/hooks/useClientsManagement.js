import { useState, useEffect } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

const useClientsManagement = () => {
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
            const response = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
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

    return {
        clients, selectedClient, clientTasks, loading, error, setError, successMessage,
        showAddForm, setShowAddForm, editingClient, setEditingClient,
        newClientName, setNewClientName,
        fetchClients, fetchClientTasks, handleRenameClient, handleDeleteClient, handleCreateClient
    };
};

export default useClientsManagement;
