import { useEffect, useState } from 'react';
import storage from '../utils/storage';

const BUDGET_TAB_KEY = 'activeBudgetTabId';

const useBudgetActiveTab = (tabs) => {
    const [activeTabId, setActiveTabId] = useState(null);

    useEffect(() => {
        if (!Array.isArray(tabs) || tabs.length === 0) {
            if (activeTabId !== null) setActiveTabId(null);
            storage.remove(BUDGET_TAB_KEY);
            return;
        }
        if (activeTabId && tabs.some(t => t.id === activeTabId)) return;
        const raw = storage.get(BUDGET_TAB_KEY);
        const savedId = raw ? parseInt(raw, 10) : null;
        if (savedId && tabs.some(t => t.id === savedId)) {
            setActiveTabId(savedId);
            return;
        }
        setActiveTabId(tabs[0].id);
    }, [tabs, activeTabId]);

    useEffect(() => {
        if (activeTabId === null) storage.remove(BUDGET_TAB_KEY);
        else storage.set(BUDGET_TAB_KEY, String(activeTabId));
    }, [activeTabId]);

    return { activeTabId, setActiveTabId };
};

export default useBudgetActiveTab;
