import { useEffect, useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * useBudgetMonthlySummary — fetches per-month combined budget+bank totals
 * from `/api/budget/monthly-summary` using the SAME date window the page
 * already filters by. This is the root-cause fix for "wrong numbers when
 * a budget tab is linked to a bank tab" — previously bank totals were
 * summed all-time then merged with month-filtered budget data.
 *
 * Returns months: [{ month, budget_income, budget_expense, bank_income,
 *                    bank_expense, fixed_expense, variable_expense,
 *                    income, expense, net, end_balance }]
 */
const useBudgetMonthlySummary = (activeTabId, start, end) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey(k => k + 1), []);

    useEffect(() => {
        if (!activeTabId || !start || !end) {
            setData(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
            tab_id: String(activeTabId),
            start,
            end,
        });
        fetch(`${API_BASE}/budget/monthly-summary?${params}`, { headers: getAuthHeaders() })
            .then(async (r) => {
                const body = await r.json().catch(() => null);
                if (!r.ok) throw new Error(body?.error || 'Failed to load monthly summary');
                return body;
            })
            .then((body) => { if (!cancelled) setData(body); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [activeTabId, start, end, reloadKey]);

    return { data, months: data?.months || [], loading, error, reload };
};

export default useBudgetMonthlySummary;
