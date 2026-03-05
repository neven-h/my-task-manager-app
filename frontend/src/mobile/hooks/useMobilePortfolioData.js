import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobilePortfolioData = (activeTabId) => {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [stockNames, setStockNames] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTabId !== null) {
            fetchEntries();
            fetchSummary();
            fetchStockNames();
        }
    }, [activeTabId]);

    const fetchEntries = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch(`${API_BASE}/portfolio?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const raw = Array.isArray(data) ? data : [];
            const normalized = raw.map(entry => ({ ...entry, name: entry.name ?? '' }));
            setEntries(normalized);
        } catch (err) {
            console.error('Error fetching entries:', err);
            setEntries([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/summary?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const isValid = response.ok && data && !data.error &&
                (typeof data.total_value_ils === 'number' || Array.isArray(data.entries));
            setSummary(isValid ? data : null);
        } catch (err) {
            console.error('Error fetching summary:', err);
            setSummary(null);
        }
    };

    const fetchStockNames = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/names?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !data || data.error) { setStockNames([]); return; }
            const names = Array.isArray(data)
                ? data.map(s => typeof s === 'string' ? s : (s && s.name) ?? '')
                : [];
            setStockNames(names);
        } catch (err) {
            console.error('Error fetching stock names:', err);
            setStockNames([]);
        }
    };

    return { entries, setEntries, summary, setSummary, stockNames, loading, setLoading, fetchEntries, fetchSummary };
};

export default useMobilePortfolioData;
