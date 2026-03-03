import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';
import useBankTabData from './useBankTabData';
import useBankCRUD from './useBankCRUD';

const useBankTransactionData = () => {
    // Core transaction state
    const [uploadedData, setUploadedData] = useState(null);
    const [savedMonths, setSavedMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [monthTransactions, setMonthTransactions] = useState([]);
    const [allDescriptions, setAllDescriptions] = useState([]);
    const [transactionStats, setTransactionStats] = useState(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Tab sub-hook
    const tabData = useBankTabData(setError);

    // CRUD sub-hook
    const crud = useBankCRUD({ uploadedData, setUploadedData, selectedMonth, setSelectedMonth, setMonthTransactions, setLoading, setError, setSuccess });

    // ==================== DATA FETCHERS ====================

    const fetchAllDescriptions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/descriptions`, { headers: getAuthHeaders() });
            setAllDescriptions(await response.json());
        } catch (err) {
            console.error('Error fetching descriptions:', err);
        }
    }, []);

    const fetchTransactionStats = useCallback(async (tabId) => {
        try {
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/stats${tabParam}`, { headers: getAuthHeaders() });
            setTransactionStats(await response.json());
        } catch (err) {
            console.error('[BankTransactions] Error fetching stats:', err);
        }
    }, []);

    const fetchSavedMonths = useCallback(async (tabId) => {
        try {
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/months${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            setSavedMonths(data);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Error fetching months:', err);
            return [];
        }
    }, []);

    const fetchAllTransactions = useCallback(async (tabId) => {
        try {
            setLoading(true);
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/all${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || 'Failed to fetch transactions');
            setMonthTransactions(data);
            setSelectedMonth('all');
            storage.set(STORAGE_KEYS.SELECTED_MONTH, 'all');
            return data;
        } catch (err) {
            setError(err.message || 'Failed to fetch transactions');
            setSelectedMonth('all');
            setMonthTransactions([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMonthTransactions = useCallback(async (monthYear, tabId) => {
        try {
            setLoading(true);
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/${monthYear}${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || 'Failed to fetch month transactions');
            setMonthTransactions(data);
            setSelectedMonth(monthYear);
            storage.set(STORAGE_KEYS.SELECTED_MONTH, monthYear);
        } catch (err) {
            setError(err.message || 'Failed to fetch transactions');
            try { await fetchAllTransactions(tabId); } catch { setSelectedMonth('all'); setMonthTransactions([]); }
        } finally {
            setLoading(false);
        }
    }, [fetchAllTransactions]);

    return {
        // Core data
        uploadedData, setUploadedData,
        savedMonths, setSavedMonths,
        selectedMonth, setSelectedMonth,
        monthTransactions, setMonthTransactions,
        allDescriptions,
        transactionStats,

        // UI state
        loading, setLoading,
        error, setError,
        success, setSuccess,

        // Tab state + functions (from useBankTabData)
        ...tabData,

        // Data fetchers
        fetchAllDescriptions,
        fetchTransactionStats,
        fetchSavedMonths,
        fetchAllTransactions,
        fetchMonthTransactions,

        // CRUD (from useBankCRUD)
        ...crud,
    };
};

export default useBankTransactionData;
