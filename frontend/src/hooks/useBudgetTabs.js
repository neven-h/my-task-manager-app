import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const BASE = `${API_BASE}/budget-tabs`;

/**
 * useBudgetTabs — manages named budget tabs.
 *
 * Returns:
 *   tabs[]           – [{id, name, owner, created_at}, ...]
 *   loading          – bool
 *   error            – string | null
 *   fetchTabs()      – reload from API
 *   createTab(name)  – POST; returns new tab or null
 *   renameTab(id, name) – PUT
 *   deleteTab(id)    – DELETE; entries become unassigned (tab_id = null)
 */
const useBudgetTabs = () => {
    const [tabs, setTabs]       = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    const fetchTabs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(BASE, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setTabs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTab = useCallback(async (name) => {
        setError(null);
        try {
            const res = await fetch(BASE, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create tab');
            setTabs(prev => [...prev, json]);
            return json;
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, []);

    const renameTab = useCallback(async (id, name) => {
        setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to rename tab');
            setTabs(prev => prev.map(t => t.id === id ? json : t));
            return json;
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, []);

    const deleteTab = useCallback(async (id) => {
        setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed to delete tab');
            }
            setTabs(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    return { tabs, loading, error, fetchTabs, createTab, renameTab, deleteTab };
};

export default useBudgetTabs;
