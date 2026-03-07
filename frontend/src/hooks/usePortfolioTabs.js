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
        await Promise.all([fetchEntries(tabId), fetchSummary(tabId), fetchStockNames(tabId)]);
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
                await Promise.all([fetchEntries(data.id), fetchSummary(data.id), fetchStockNames(data.id)]);
                return updatedTabs;
            } else {
                setError(data.error || 'Failed to create tab');
            }
        } catch (err) {
            setError('Failed to create tab - server may be unavailable');
        }
    }, [fetchTabs, setActiveTabId, setError, fetchEntries, fetchSummary, fetchStockNames]);

    const initializeTabs = useCallback(async () => {
        // Optimistic: start loading data for the cached tab ID immediately,
        // in parallel with fetching the tab list — eliminates 1 sequential round-trip
        const savedTabId = storage.get(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB);
        const cachedTabId = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;

        const parallelFetches = [fetchTabs()];
        if (cachedTabId) {
            setActiveTabId(cachedTabId);
            parallelFetches.push(
                fetchEntries(cachedTabId),
                fetchSummary(cachedTabId),
                fetchStockNames(cachedTabId),
            );
        }

        const [fetchedTabs] = await Promise.all(parallelFetches);

        if (!fetchedTabs || fetchedTabs.length === 0) {
            setActiveTabId(null);
            return;
        }

        // Confirm the cached tab is still valid; fall back to first tab if not
        const validTab = cachedTabId && fetchedTabs.find(t => t.id === cachedTabId);
        const tabIdToUse = validTab ? cachedTabId : fetchedTabs[0].id;

        setActiveTabId(tabIdToUse);
        storage.set(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB, String(tabIdToUse));

        // Only re-fetch if we had to switch to a different tab than what we pre-loaded
        if (tabIdToUse !== cachedTabId) {
            await Promise.all([fetchEntries(tabIdToUse), fetchSummary(tabIdToUse), fetchStockNames(tabIdToUse)]);
        }
    }, [fetchTabs, setActiveTabId, fetchEntries, fetchSummary, fetchStockNames]);

    return { fetchTabs, handleSwitchTab, handleCreateFirstTab, initializeTabs };
};

export default usePortfolioTabs;
