import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobilePortfolioTabs = (authUser, authRole) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);

    useEffect(() => {
        fetchTabs();
    }, [authUser, authRole]);

    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (Array.isArray(data)) {
                const normalized = data.map(t => ({ ...t, id: Number(t.id) }));
                setTabs(normalized);
                if (normalized.length > 0) {
                    setActiveTabId(prev => (prev !== null ? prev : normalized[0].id));
                } else {
                    const createRes = await fetch(`${API_BASE}/portfolio-tabs`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ name: 'Default' })
                    });
                    if (createRes.ok) {
                        const newTab = await createRes.json();
                        const id = Number(newTab.id ?? newTab.tab_id);
                        if (id) {
                            setTabs([{ id, name: 'Default' }]);
                            setActiveTabId(id);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        }
    };

    const handleCreateTab = async () => {
        const name = window.prompt('New tab name:', '');
        if (!name || !name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/portfolio-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: name.trim() })
            });
            if (!res.ok) return;
            const newTab = await res.json();
            const id = Number(newTab.id ?? newTab.tab_id);
            if (id) {
                setTabs(prev => [...prev, { id, name: newTab.name || name.trim() }]);
                setActiveTabId(id);
            }
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    return { tabs, activeTabId, setActiveTabId, handleCreateTab };
};

export default useMobilePortfolioTabs;
