import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const usePortfolioData = () => {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [stockNames, setStockNames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEntries = useCallback(async (tabId, activeTabId) => {
        try {
            setLoading(true);
            setError(null);
            const tid = tabId !== undefined ? tabId : activeTabId;
            const tabParam = tid ? `?tab_id=${tid}` : '';
            const response = await fetch(
                `${API_BASE}/portfolio${tabParam}`,
                { headers: getAuthHeaders() }
            );
            if (!response.ok) throw new Error('Failed to load portfolio entries');
            const data = await response.json();
            setEntries(data);
        } catch (err) {
            setError(err.message || 'Failed to load portfolio entries');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSummary = useCallback(async (tabId, activeTabId) => {
        try {
            const tid = tabId !== undefined ? tabId : activeTabId;
            const tabParam = tid ? `?tab_id=${tid}` : '';
            const response = await fetch(
                `${API_BASE}/portfolio/summary${tabParam}`,
                { headers: getAuthHeaders() }
            );
            if (!response.ok) throw new Error('Failed to load summary');
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            console.error('Failed to load summary:', err);
        }
    }, []);

    const fetchStockNames = useCallback(async (tabId, activeTabId) => {
        try {
            const tid = tabId !== undefined ? tabId : activeTabId;
            const tabParam = tid ? `?tab_id=${tid}` : '';
            const response = await fetch(
                `${API_BASE}/portfolio/names${tabParam}`,
                { headers: getAuthHeaders() }
            );
            if (response.ok) {
                const data = await response.json();
                setStockNames(data);
            }
        } catch (err) {
            console.error('Failed to load stock names:', err);
        }
    }, []);

    return {
        entries, setEntries,
        summary, setSummary,
        stockNames, setStockNames,
        loading, setLoading,
        error, setError,
        fetchEntries, fetchSummary, fetchStockNames
    };
};

export default usePortfolioData;
