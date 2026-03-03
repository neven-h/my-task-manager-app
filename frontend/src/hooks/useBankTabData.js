import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useBankTabData = (setError) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [orphanedCount, setOrphanedCount] = useState(0);

    const fetchTabs = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            const result = Array.isArray(data) ? data : [];
            setTabs(result);
            return result;
        } catch (err) {
            console.error('Error fetching tabs:', err);
            setTabs([]);
            return [];
        }
    }, []);

    const checkOrphanedTransactions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs/orphaned`, { headers: getAuthHeaders() });
            const data = await response.json();
            setOrphanedCount(data.count || 0);
        } catch (err) {
            console.error('Error checking orphaned transactions:', err);
        }
    }, []);

    const adoptOrphanedTransactions = useCallback(async (tabId) => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs/${tabId}/adopt`, { method: 'POST', headers: getAuthHeaders() });
            if (response.ok) setOrphanedCount(0);
            return response.ok;
        } catch {
            setError('Failed to assign transactions');
            return false;
        }
    }, [setError]);

    const handleCreateFirstTab = useCallback(async (tabName) => {
        if (!tabName.trim()) return null;
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: tabName.trim() })
            });
            const data = await response.json();
            if (response.ok) return data;
            setError(data.error || 'Failed to create tab');
            return null;
        } catch {
            setError('Failed to create tab - server may be unavailable');
            return null;
        }
    }, [setError]);

    return {
        tabs, setTabs,
        activeTabId, setActiveTabId,
        orphanedCount, setOrphanedCount,
        fetchTabs, checkOrphanedTransactions, adoptOrphanedTransactions, handleCreateFirstTab,
    };
};

export default useBankTabData;
