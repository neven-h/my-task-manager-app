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

    const fetchForecast = useCallback(async (tabId, months = 3, refresh = false) => {
        if (!tabId) { setForecast(null); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ tab_id: tabId, months: String(months) });
            if (refresh) params.set('refresh', '1');
            const res = await fetch(`${API_BASE}/budget/balance-forecast?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch balance forecast');
            setForecast(await res.json());
            setLastUpdated(new Date());
        } catch {
            setForecast(null);
        } finally { setLoading(false); }
    }, []);

    const refresh = useCallback((tabId, months = 3) => {
        return fetchForecast(tabId, months, true);
    }, [fetchForecast]);

    const clearForecast = useCallback(() => { setForecast(null); setLastUpdated(null); }, []);

    return { forecast, loading, fetchForecast, clearForecast, lastUpdated, refresh };
};

export default useBalanceForecast;
