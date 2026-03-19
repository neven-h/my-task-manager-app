import { useState, useCallback, useEffect } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const STORAGE_KEY = (tabId) => `balance_start:${tabId}`;

/**
 * @param {number|null} activeTabId
 * @param {number|null} tabLastKnownBalance  – last_known_balance from the tab record (DB source of truth)
 */
const useTransactionBalanceForecast = (activeTabId, tabLastKnownBalance = null) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Starting balance: DB value takes priority; fall back to localStorage
    const [startingBalance, _setStartingBalance] = useState(() => {
        if (!activeTabId) return null;
        if (tabLastKnownBalance != null) return tabLastKnownBalance;
        const v = localStorage.getItem(STORAGE_KEY(activeTabId));
        return v !== null ? parseFloat(v) : null;
    });

    // Reload when tab changes — prefer DB value over localStorage
    useEffect(() => {
        if (!activeTabId) return;
        if (tabLastKnownBalance != null) {
            _setStartingBalance(tabLastKnownBalance);
        } else {
            const v = localStorage.getItem(STORAGE_KEY(activeTabId));
            _setStartingBalance(v !== null ? parseFloat(v) : null);
        }
        setData(null);
    }, [activeTabId, tabLastKnownBalance]);

    const setStartingBalance = useCallback((value) => {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            localStorage.setItem(STORAGE_KEY(activeTabId), String(num));
            _setStartingBalance(num);
        }
    }, [activeTabId]);

    const clearStartingBalance = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY(activeTabId));
        _setStartingBalance(null);
    }, [activeTabId]);

    const fetchForecast = useCallback(async (months = 3) => {
        if (!activeTabId) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ tab_id: activeTabId, months });
            const res = await fetch(`${API_BASE}/transactions/balance-forecast?${params}`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
            setData(await res.json());
        } catch (err) {
            setError(err.message);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [activeTabId]);

    return {
        data, loading, error,
        startingBalance, setStartingBalance, clearStartingBalance,
        fetchForecast,
    };
};

export default useTransactionBalanceForecast;
