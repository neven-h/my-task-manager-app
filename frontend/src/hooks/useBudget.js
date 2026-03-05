import { useState, useCallback, useMemo } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const BASE = `${API_BASE}/budget`;

/**
 * useBudget — manages budget entries (incomes + outcomes).
 *
 * Returns:
 *   entries[]        – all entries sorted by entry_date ASC
 *   loading          – bool
 *   error            – string | null
 *   fetchEntries()   – reload from API
 *   createEntry(data) – POST; data: {type,description,amount,entry_date,category?,notes?}
 *   updateEntry(id, data) – PUT
 *   deleteEntry(id)  – DELETE
 *
 * Computed helpers (need a cutoffDate string 'YYYY-MM-DD'):
 *   totalIncome(cutoff)  – sum of income entries on/before cutoff
 *   totalOutcome(cutoff) – sum of outcome entries on/before cutoff
 *   balance(cutoff)      – totalIncome(cutoff) - totalOutcome(cutoff)
 */
const useBudget = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(BASE, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createEntry = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(BASE, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create entry');
            setEntries(prev => [...prev, json].sort((a, b) =>
                a.entry_date < b.entry_date ? -1 : a.entry_date > b.entry_date ? 1 : a.id - b.id
            ));
            return json;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateEntry = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to update entry');
            setEntries(prev => prev.map(e => e.id === id ? json : e).sort((a, b) =>
                a.entry_date < b.entry_date ? -1 : a.entry_date > b.entry_date ? 1 : a.id - b.id
            ));
            return json;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteEntry = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BASE}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed to delete entry');
            }
            setEntries(prev => prev.filter(e => e.id !== id));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── computed helpers ────────────────────────────────────────────────────
    const totalIncome = useCallback((cutoff) =>
        entries
            .filter(e => e.type === 'income' && e.entry_date <= cutoff)
            .reduce((s, e) => s + e.amount, 0),
        [entries]);

    const totalOutcome = useCallback((cutoff) =>
        entries
            .filter(e => e.type === 'outcome' && e.entry_date <= cutoff)
            .reduce((s, e) => s + e.amount, 0),
        [entries]);

    const balance = useCallback((cutoff) => totalIncome(cutoff) - totalOutcome(cutoff), [totalIncome, totalOutcome]);

    return {
        entries,
        loading,
        error,
        fetchEntries,
        createEntry,
        updateEntry,
        deleteEntry,
        totalIncome,
        totalOutcome,
        balance,
    };
};

export default useBudget;
