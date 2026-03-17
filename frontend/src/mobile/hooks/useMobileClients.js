import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobileClients = (authUser) => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientTasks, setClientTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
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
                setNewClient({ name: '', email: '', phone: '', notes: '' });
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

    return {
        clients, selectedClient, setSelectedClient, clientTasks,
        loading, showAddForm, setShowAddForm,
        newClient, setNewClient, createLoading,
        fetchClientTasks, handleCreateClient, handleDeleteClient
    };
};

export default useMobileClients;
