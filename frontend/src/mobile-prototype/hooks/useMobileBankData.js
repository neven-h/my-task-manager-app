import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobileBankData = (activeTabId) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (activeTabId === null) return;
        setSelectedMonth('all');
        fetchMonths();
        fetchStats();
    }, [activeTabId]);

    useEffect(() => {
        if (activeTabId === null) return;
        fetchTransactions();
    }, [activeTabId, selectedMonth]);

    const formatMonthYear = (monthYear) => {
        if (monthYear == null || monthYear === '' || monthYear === 'all') return 'All';
        const str = typeof monthYear === 'string' ? monthYear : (monthYear.month_year || '');
        if (!str || str === 'all') return 'All';
        const parts = str.split('-');
        if (parts.length < 2) return str;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const fetchMonths = async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/months?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const list = Array.isArray(data)
                ? data.map(m => (typeof m === 'string' ? m : (m && m.month_year) || '')).filter(Boolean)
                : [];
            setAvailableMonths(list);
            setSelectedMonth('all');
        } catch (err) {
            console.error('Error fetching months:', err);
            setAvailableMonths([]);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const path = selectedMonth === 'all'
                ? `${API_BASE}/transactions/all?tab_id=${activeTabId}`
                : `${API_BASE}/transactions/${selectedMonth}?tab_id=${activeTabId}`;
            const response = await fetch(path, { headers: getAuthHeaders() });
            const data = await response.json();
            setTransactions(Array.isArray(data) ? data : []);
            setError(!response.ok ? (data?.error || 'Failed to load transactions') : null);
        } catch (err) {
            setError('Failed to load transactions');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/stats?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    return {
        transactions, setTransactions,
        loading, setLoading,
        error, setError,
        availableMonths,
        selectedMonth, setSelectedMonth,
        stats, setStats,
        formatMonthYear,
        fetchTransactions,
        fetchStats
    };
};

export default useMobileBankData;
