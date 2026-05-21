import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * useBalanceForecast — fetches the unified balance forecast (budget + bank).
 *
 * Returns:
 *   forecast   – { current_balance, budget_income, budget_expense, bank_expense,
 *                  as_of, linked_tab, timeline[], forecast_end_balance } | null
 *   loading    – bool
 *   fetchForecast(tabId, months)  – GET /api/budget/balance-forecast
 *   clearForecast()               – reset to null
 */
const useBalanceForecast = () => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // opts: { months, start, end, refresh }. `start`/`end` are the date
    // window applied to the historical sums on the backend so linked-bank
    // totals respect the same filter as the rest of the page (filter-sync).
    const fetchForecast = useCallback(async (tabId, opts = {}) => {
        // Back-compat: previous callers passed (tabId, monthsNumber).
        if (typeof opts === 'number') opts = { months: opts };
        const { months = 3, start, end, refresh = false } = opts;
        if (!tabId) { setForecast(null); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ tab_id: tabId, months: String(months) });
            if (start) params.set('start', start);
            if (end) params.set('end', end);
            if (refresh) params.set('refresh', '1');
            const res = await fetch(`${API_BASE}/budget/balance-forecast?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch balance forecast');
            setForecast(await res.json());
            setLastUpdated(new Date());
        } catch {
            setForecast(null);
        } finally { setLoading(false); }
    }, []);

    const refresh = useCallback((tabId, opts = {}) => {
        if (typeof opts === 'number') opts = { months: opts };
        return fetchForecast(tabId, { ...opts, refresh: true });
    }, [fetchForecast]);

    const clearForecast = useCallback(() => { setForecast(null); setLastUpdated(null); }, []);

    return { forecast, loading, fetchForecast, clearForecast, lastUpdated, refresh };
};

export default useBalanceForecast;
