import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useRenovation = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/renovation/items`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createItem = useCallback(async (fields) => {
        const res = await fetch(`${API_BASE}/renovation/items`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create item');
        setItems(prev => [...prev, data]);
        return data;
    }, []);

    const updateItem = useCallback(async (itemId, fields) => {
        const res = await fetch(`${API_BASE}/renovation/items/${itemId}`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update item');
        setItems(prev => prev.map(i => i.id === itemId ? data : i));
        return data;
    }, []);

    const deleteItem = useCallback(async (itemId) => {
        const res = await fetch(`${API_BASE}/renovation/items/${itemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete item');
        setItems(prev => prev.filter(i => i.id !== itemId));
    }, []);

    const addPayment = useCallback(async (itemId, fields) => {
        const res = await fetch(`${API_BASE}/renovation/items/${itemId}/payments`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add payment');
        setItems(prev => prev.map(i => {
            if (i.id !== itemId) return i;
            return { ...i, total_paid: (i.total_paid || 0) + data.amount };
        }));
        return data;
    }, []);

    // ── Attachments ──────────────────────────────────────────────────────────

    const fetchAttachments = useCallback(async (itemId) => {
        const res = await fetch(`${API_BASE}/renovation/items/${itemId}/attachments`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch attachments');
        return Array.isArray(data) ? data : [];
    }, []);

    const uploadAttachment = useCallback(async (itemId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/renovation/items/${itemId}/attachments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload attachment');
        return data;
    }, []);

    const deleteAttachment = useCallback(async (attachmentId) => {
        const res = await fetch(`${API_BASE}/renovation/attachments/${attachmentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete attachment');
    }, []);

    // ── CSV Export ───────────────────────────────────────────────────────────

    const exportCSV = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/renovation/export/csv`, { headers: getAuthHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `renovation_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    return {
        items,
        loading,
        error,
        fetchItems,
        createItem,
        updateItem,
        deleteItem,
        addPayment,
        fetchAttachments,
        uploadAttachment,
        deleteAttachment,
        exportCSV,
    };
};

export default useRenovation;
