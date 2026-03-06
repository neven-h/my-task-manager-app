import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobileBankTabs = (authUser, authRole) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [tabsLoading, setTabsLoading] = useState(true);

    useEffect(() => {
        fetchTabs();
    }, [authUser, authRole]);

    const fetchTabs = async () => {
        try {
            setTabsLoading(true);
            const response = await fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (Array.isArray(data)) {
                const normalized = data.map(t => ({ ...t, id: Number(t.id) }));
                setTabs(normalized);
                if (normalized.length > 0) {
                    setActiveTabId(prev => (prev === null ? normalized[0].id : prev));
                } else {
                    setActiveTabId(null);
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        } finally {
            setTabsLoading(false);
        }
    };

    const handleCreateTab = async () => {
        const name = window.prompt('New tab name:', '');
        if (!name || !name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/transaction-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: name.trim() })
            });
            if (!res.ok) return;
            const newTab = await res.json();
            const id = Number(newTab.id);
            if (id) {
                setTabs(prev => [...prev, { id, name: newTab.name || name.trim() }]);
                setActiveTabId(id);
            }
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    return { tabs, activeTabId, setActiveTabId, tabsLoading, handleCreateTab };
};

export default useMobileBankTabs;
