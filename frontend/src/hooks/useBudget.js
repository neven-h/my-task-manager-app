import { useState, useCallback, useMemo } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const BASE = `${API_BASE}/budget`;

/**
 * useBudget — manages budget entries (incomes + outcomes).
 *
 * Returns:
 *   entries[]              – all entries sorted by entry_date ASC
 *   loading                – bool
 *   error                  – string | null
 *   fetchEntries()         – reload from API
 *   createEntry(data)      – POST; data: {type,description,amount,entry_date,category?,notes?}
 *   updateEntry(id, data)  – PUT
 *   deleteEntry(id)        – DELETE
 *   getDescriptionHistory(entry) – 5 most recent entries with same description
 *   predictions[]          – AI-predicted future entries
 *   fetchPredictions(months) – GET /api/budget/predict
 *   exportBudgetCSV(tabId) – download CSV
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
    const [predictions, setPredictions] = useState([]);

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

    // ── similar transactions (description history) ──────────────────────────
    const getDescriptionHistory = useCallback((entry) =>
        entries
            .filter(e => e.id !== entry.id && e.description === entry.description)
            .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
            .slice(0, 5),
        [entries]);

    // ── AI predictions ──────────────────────────────────────────────────────
    const fetchPredictions = useCallback(async (months = 3, tabId = null) => {
        try {
            const params = new URLSearchParams({ months: String(months) });
            if (tabId) params.set('tab_id', tabId);
            const res = await fetch(`${API_BASE}/budget/predict?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setPredictions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch predictions:', err);
            setPredictions([]);
        }
    }, []);

    // ── CSV export ──────────────────────────────────────────────────────────
    const exportBudgetCSV = useCallback(async (tabId = null) => {
        try {
            const params = new URLSearchParams();
            if (tabId) params.set('tab_id', tabId);
            const res = await fetch(`${API_BASE}/export/budget/csv?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `budget_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    }, [setError]);

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
        getDescriptionHistory,
        predictions,
        fetchPredictions,
        exportBudgetCSV,
    };
};

export default useBudget;
