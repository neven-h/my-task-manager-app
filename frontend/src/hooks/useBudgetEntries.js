import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const BASE = `${API_BASE}/budget`;

const sortByDate = (arr) =>
    arr.sort((a, b) => a.entry_date < b.entry_date ? -1 : a.entry_date > b.entry_date ? 1 : a.id - b.id);

/**
 * useBudgetEntries — manages budget entries state and all CRUD operations.
 * Returns entries, loading, error, setError, and mutating functions.
 */
const useBudgetEntries = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(BASE, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    const createEntry = useCallback(async (data) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(BASE, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create entry');
            setEntries(prev => sortByDate([...prev, json]));
            return json;
        } catch (err) { setError(err.message); return null; }
        finally { setLoading(false); }
    }, []);

    const updateEntry = useCallback(async (id, data) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to update entry');
            setEntries(prev => sortByDate(prev.map(e => e.id === id ? json : e)));
            return json;
        } catch (err) { setError(err.message); return null; }
        finally { setLoading(false); }
    }, []);

    const deleteEntry = useCallback(async (id) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete entry');
            setEntries(prev => prev.filter(e => e.id !== id));
            return true;
        } catch (err) { setError(err.message); return false; }
        finally { setLoading(false); }
    }, []);

    const batchDelete = useCallback(async (ids) => {
        if (!ids.length) return false;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${BASE}/batch`, { method: 'DELETE', headers: getAuthHeaders(), body: JSON.stringify({ ids }) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Batch delete failed');
            setEntries(prev => prev.filter(e => !ids.includes(e.id)));
            return true;
        } catch (err) { setError(err.message); return false; }
        finally { setLoading(false); }
    }, []);

    const batchUpdate = useCallback(async (ids, fields) => {
        if (!ids.length || !Object.keys(fields).length) return false;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${BASE}/batch`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, fields }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Batch update failed');
            setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, ...fields } : e));
            return true;
        } catch (err) { setError(err.message); return false; }
        finally { setLoading(false); }
    }, []);

    const getDescriptionHistory = useCallback((entry) =>
        entries
            .filter(e => e.id !== entry.id && e.description === entry.description)
            .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
            .slice(0, 5),
        [entries]);

    return {
        entries, loading, error, setError,
        fetchEntries, createEntry, updateEntry, deleteEntry,
        batchDelete, batchUpdate, getDescriptionHistory,
    };
};

export default useBudgetEntries;
