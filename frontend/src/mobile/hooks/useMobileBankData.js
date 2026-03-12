import { useState, useEffect, useRef, useCallback } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobileBankData = (activeTabId) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [stats, setStats] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Cache per tabId to make tab switches instant
    const cacheRef = useRef({}); // { [tabId]: { transactions, months, stats } }

    const formatMonthYear = useCallback((monthYear) => {
        if (monthYear == null || monthYear === '' || monthYear === 'all') return 'All';
        const str = typeof monthYear === 'string' ? monthYear : (monthYear.month_year || '');
        if (!str || str === 'all') return 'All';
        const parts = str.split('-');
        if (parts.length < 2) return str;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }, []);

    const fetchTransactions = useCallback(async (month = selectedMonth) => {
        // Skip loading spinner if we already have cached data for this tab+month
        const isAllMonths = month === 'all';
        const hasCached = isAllMonths && !!cacheRef.current[activeTabId]?.transactions;
        if (!hasCached) setLoading(true);
        try {
            const path = isAllMonths
                ? `${API_BASE}/transactions/all?tab_id=${activeTabId}`
                : `${API_BASE}/transactions/${month}?tab_id=${activeTabId}`;
            const response = await fetch(path, { headers: getAuthHeaders() });
            const data = await response.json();
            const result = Array.isArray(data) ? data : [];
            setTransactions(result);
            setError(!response.ok ? (data?.error || 'Failed to load transactions') : null);
            // Update cache (covers both initial load and post-mutation refresh)
            if (isAllMonths) {
                cacheRef.current[activeTabId] = { ...cacheRef.current[activeTabId], transactions: result };
            }
        } catch (err) {
            setError('Failed to load transactions');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [activeTabId]);

    const fetchMonths = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/months?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const list = Array.isArray(data)
                ? data.map(m => (typeof m === 'string' ? m : (m && m.month_year) || '')).filter(Boolean)
                : [];
            setAvailableMonths(list);
            cacheRef.current[activeTabId] = { ...cacheRef.current[activeTabId], months: list };
        } catch (err) {
            console.error('Error fetching months:', err);
            setAvailableMonths([]);
        }
    }, [activeTabId]);

    const fetchTransactionPredictions = useCallback(async (months = 3) => {
        if (!activeTabId) return;
        setPredictionsLoading(true);
        try {
            const params = new URLSearchParams({ months, tab_id: activeTabId });
            const res = await fetch(`${API_BASE}/transactions/predict?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Prediction request failed');
            setPredictions(await res.json());
        } catch (err) {
            console.error('Failed to fetch predictions:', err);
            setPredictions([]);
        } finally {
            setPredictionsLoading(false);
        }
    }, [activeTabId]);

    const fetchInsights = useCallback(async () => {
        if (!activeTabId) return;
        setInsightsLoading(true);
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            const res = await fetch(`${API_BASE}/transactions/insights?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Insights request failed');
            setInsights(await res.json());
        } catch (err) {
            console.error('Failed to fetch insights:', err);
            setInsights(null);
        } finally {
            setInsightsLoading(false);
        }
    }, [activeTabId]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/stats?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            setStats(data);
            cacheRef.current[activeTabId] = { ...cacheRef.current[activeTabId], stats: data };
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }, [activeTabId]);

    useEffect(() => {
        if (activeTabId === null) return;
        setSelectedMonth('all');
        setPredictions([]);
        // Pre-populate from cache immediately so there's no blank/loading flash
        const cached = cacheRef.current[activeTabId];
        if (cached) {
            if (cached.transactions) setTransactions(cached.transactions);
            if (cached.months) setAvailableMonths(cached.months);
            if (cached.stats) setStats(cached.stats);
        } else {
            setTransactions([]);
            setAvailableMonths([]);
            setStats(null);
        }
        fetchMonths();
        fetchStats();
        fetchTransactions('all');
    }, [activeTabId, fetchMonths, fetchStats, fetchTransactions]);

    // Only fires when the user picks a different month (not on tab switch)
    useEffect(() => {
        if (activeTabId === null || selectedMonth === 'all') return;
        fetchTransactions(selectedMonth);
    }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        transactions, setTransactions,
        loading, setLoading,
        error, setError,
        availableMonths,
        selectedMonth, setSelectedMonth,
        stats, setStats,
        predictions, predictionsLoading,
        fetchTransactionPredictions,
        insights, insightsLoading, fetchInsights,
        formatMonthYear,
        fetchTransactions,
        fetchStats
    };
};

export default useMobileBankData;
