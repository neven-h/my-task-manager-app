import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * useBudgetLinks — manages the link between a budget tab and a bank transaction tab.
 *
 * Returns:
 *   linkedTab        – { transaction_tab_id, transaction_tab_name } | null
 *   loading          – bool
 *   fetchLink(budgetTabId)                    – GET
 *   setLink(budgetTabId, transactionTabId)    – PUT
 *   removeLink(budgetTabId)                   – DELETE
 */
const useBudgetLinks = () => {
    const [linkedTab, setLinkedTab] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchLink = useCallback(async (budgetTabId) => {
        if (!budgetTabId) { setLinkedTab(null); return; }
        setLinkedTab(null); // clear immediately so stale link doesn't trigger auto-fetch for new tab
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/budget-tabs/${budgetTabId}/link`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch link');
            const data = await res.json();
            setLinkedTab(data || null);
        } catch {
            setLinkedTab(null);
        } finally { setLoading(false); }
    }, []);

    const setLink = useCallback(async (budgetTabId, transactionTabId) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/budget-tabs/${budgetTabId}/link`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transaction_tab_id: transactionTabId }),
            });
            if (!res.ok) throw new Error('Failed to set link');
            const data = await res.json();
            setLinkedTab(data || null);
        } catch {
            setLinkedTab(null);
        } finally { setLoading(false); }
    }, []);

    const removeLink = useCallback(async (budgetTabId) => {
        setLoading(true);
        try {
            await fetch(`${API_BASE}/budget-tabs/${budgetTabId}/link`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            setLinkedTab(null);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    return { linkedTab, loading, fetchLink, setLink, removeLink };
};

export default useBudgetLinks;
