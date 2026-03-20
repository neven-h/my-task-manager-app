import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import useBudgetEntries from './useBudgetEntries';

/**
 * useBudget — wraps useBudgetEntries and adds computed helpers,
 * AI predictions, and CSV export.
 */
const useBudget = () => {
    const crudHook = useBudgetEntries();
    const { entries, setError } = crudHook;
    const [predictions, setPredictions] = useState([]);
    const [monthBalances, setMonthBalances] = useState({});

    // ── computed helpers ─────────────────────────────────────────────────
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

    const balance = useCallback(
        (cutoff) => totalIncome(cutoff) - totalOutcome(cutoff),
        [totalIncome, totalOutcome],
    );

    // ── AI predictions ───────────────────────────────────────────────────
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

    // ── Monthly balances (last יתרה per month) ───────────────────────────
    const fetchMonthlyBalances = useCallback(async (tabId) => {
        if (!tabId) { setMonthBalances({}); return; }
        try {
            const res = await fetch(`${API_BASE}/budget/monthly-balances?tab_id=${tabId}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setMonthBalances(data && typeof data === 'object' ? data : {});
        } catch (err) {
            console.error('Failed to fetch monthly balances:', err);
            setMonthBalances({});
        }
    }, []);

    // ── CSV export ───────────────────────────────────────────────────────
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
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
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
        ...crudHook,
        totalIncome,
        totalOutcome,
        balance,
        predictions,
        fetchPredictions,
        monthBalances,
        fetchMonthlyBalances,
        exportBudgetCSV,
    };
};

export default useBudget;
