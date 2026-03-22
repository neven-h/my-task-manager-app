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
        // Update the item's total_paid in local state
        setItems(prev => prev.map(i => {
            if (i.id !== itemId) return i;
            return { ...i, total_paid: (i.total_paid || 0) + data.amount };
        }));
        return data;
    }, []);

    const deletePayment = useCallback(async (paymentId, itemId, amount) => {
        const res = await fetch(`${API_BASE}/renovation/payments/${paymentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete payment');
        // Update the item's total_paid in local state
        if (itemId != null && amount != null) {
            setItems(prev => prev.map(i => {
                if (i.id !== itemId) return i;
                return { ...i, total_paid: Math.max(0, (i.total_paid || 0) - amount) };
            }));
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
        deletePayment,
    };
};

export default useRenovation;
