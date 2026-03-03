import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

const usePortfolioTabs = ({ setTabs, setActiveTabId, setEntries, setSummary, setError, fetchEntries, fetchSummary, fetchStockNames }) => {
    const fetchTabs = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (Array.isArray(data)) {
                setTabs(data);
                return data;
            }
            setTabs([]);
            return [];
        } catch (err) {
            console.error('Error fetching tabs:', err);
            setTabs([]);
            return [];
        }
    }, [setTabs]);

    const handleSwitchTab = useCallback(async (tabId) => {
        setActiveTabId(tabId);
        storage.set(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB, String(tabId));
        await fetchEntries(tabId);
        await fetchSummary(tabId);
        await fetchStockNames(tabId);
    }, [setActiveTabId, fetchEntries, fetchSummary, fetchStockNames]);

    const handleCreateFirstTab = useCallback(async (newTabName, setNewTabName) => {
        if (!newTabName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/portfolio-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: newTabName.trim() })
            });
            const data = await response.json();
            if (response.ok) {
                setNewTabName('');
                const updatedTabs = await fetchTabs();
                setActiveTabId(data.id);
                storage.set(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB, String(data.id));
                await fetchEntries(data.id);
                await fetchSummary(data.id);
                await fetchStockNames(data.id);
                return updatedTabs;
            } else {
                setError(data.error || 'Failed to create tab');
            }
        } catch (err) {
            setError('Failed to create tab - server may be unavailable');
        }
    }, [fetchTabs, setActiveTabId, setError, fetchEntries, fetchSummary, fetchStockNames]);

    const initializeTabs = useCallback(async () => {
        const fetchedTabs = await fetchTabs();

        if (!fetchedTabs || fetchedTabs.length === 0) {
            setActiveTabId(null);
            return;
        }

        const savedTabId = storage.get(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB);
        let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;

        if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) {
            tabIdToUse = fetchedTabs[0].id;
        }

        setActiveTabId(tabIdToUse);
        storage.set(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB, String(tabIdToUse));

        await fetchEntries(tabIdToUse);
        await fetchSummary(tabIdToUse);
        await fetchStockNames(tabIdToUse);
    }, [fetchTabs, setActiveTabId, fetchEntries, fetchSummary, fetchStockNames]);

    return { fetchTabs, handleSwitchTab, handleCreateFirstTab, initializeTabs };
};

export default usePortfolioTabs;
