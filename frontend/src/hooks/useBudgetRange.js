import { useState, useEffect, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * Extracts range-related state and logic for the Budget page.
 * Computes displayBal, incomeForSummary, expenseForSummary, balanceForSummary, balanceBadgeForSummary.
 */
const useBudgetRange = (activeTabId, cutoff, income, outcome, forecast, linkedTab) => {
    const [fileBalance, setFileBalance] = useState(null);
    const [fileBalanceEntryDate, setFileBalanceEntryDate] = useState(null);

    const [rangeOpen, setRangeOpen] = useState(false);
    const [rangeLoading, setRangeLoading] = useState(false);
    const [rangeResult, setRangeResult] = useState(null); // { income_total, expense_total, balance_as_of, ... }
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Clear rangeResult when tab or cutoff changes
    useEffect(() => { setRangeResult(null); }, [activeTabId]);
    useEffect(() => { setRangeResult(null); }, [cutoff]);

    // Fetch balance-as-of for the cutoff date
    useEffect(() => {
        if (!activeTabId || !cutoff) { setFileBalance(null); setFileBalanceEntryDate(null); return; }
        fetch(`${API_BASE}/budget/balance-as-of?${new URLSearchParams({ tab_id: String(activeTabId), date: cutoff })}`, {
            headers: getAuthHeaders(),
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const bal = d?.balance;
                setFileBalance(typeof bal === 'number' ? bal : null);
                setFileBalanceEntryDate(d?.entry_date || null);
            })
            .catch(() => { setFileBalance(null); setFileBalanceEntryDate(null); });
    }, [activeTabId, cutoff]);

    const net = income - outcome;
    const displayBal = fileBalance ?? (forecast ? forecast.current_balance : net);

    const rangeActive = rangeResult && !rangeResult.error;
    const incomeForSummary = rangeActive ? (rangeResult.income_total ?? income) : income;
    const expenseForSummary = rangeActive ? (rangeResult.expense_total ?? outcome) : outcome;
    const balanceForSummary = rangeActive && rangeResult.balance_as_of != null ? rangeResult.balance_as_of : displayBal;
    const balanceBadgeForSummary = rangeActive ? null : (fileBalance == null && forecast && linkedTab ? '＋bank' : null);

    const endMinusDays = useCallback((endDateStr, days) => {
        if (!endDateStr) return '';
        const parts = endDateStr.split('-').map(Number);
        if (parts.length !== 3) return '';
        const [y, m, d] = parts;
        const dt = new Date(Date.UTC(y, m - 1, d));
        dt.setUTCDate(dt.getUTCDate() - days);
        return dt.toISOString().slice(0, 10);
    }, []);

    const fetchRange = useCallback(async ({ start, end }) => {
        if (!activeTabId || !start || !end) return;
        setRangeLoading(true);
        setRangeResult(null);
        try {
            const params = new URLSearchParams({ tab_id: String(activeTabId), start, end });
            const res = await fetch(`${API_BASE}/budget/balance-range?${params}`, { headers: getAuthHeaders() });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setRangeResult({ error: data?.error || 'Failed to load range totals' }); return; }
            setRangeResult(data);
        } catch {
            setRangeResult({ error: 'Failed to load range totals' });
        } finally {
            setRangeLoading(false);
        }
    }, [activeTabId]);

    return {
        fileBalance,
        fileBalanceEntryDate,
        rangeOpen,
        setRangeOpen,
        rangeLoading,
        rangeResult,
        setRangeResult,
        customStart,
        setCustomStart,
        customEnd,
        setCustomEnd,
        endMinusDays,
        fetchRange,
        displayBal,
        incomeForSummary,
        expenseForSummary,
        balanceForSummary,
        balanceBadgeForSummary,
    };
};

export default useBudgetRange;
