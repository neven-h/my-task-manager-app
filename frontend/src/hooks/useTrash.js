import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * useTrash — manages deleted items (budget tabs, transaction tabs, tasks)
 * with 30-day retention and restore capability.
 */
const useTrash = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTrash = useCallback(async (type = null) => {
        setLoading(true);
        setError(null);
        try {
            const url = type
                ? `${API_BASE}/trash?type=${type}`
                : `${API_BASE}/trash`;
            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const restoreItem = useCallback(async (trashId) => {
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/trash/${trashId}/restore`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to restore');
            setItems(prev => prev.filter(item => item.id !== trashId));
            return json;
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, []);

    const permanentlyDelete = useCallback(async (trashId) => {
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/trash/${trashId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed to delete');
            }
            setItems(prev => prev.filter(item => item.id !== trashId));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    const emptyTrash = useCallback(async () => {
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/trash/empty`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed to empty trash');
            }
            setItems([]);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    return {
        items,
        loading,
        error,
        fetchTrash,
        restoreItem,
        permanentlyDelete,
        emptyTrash,
    };
};

export default useTrash;
