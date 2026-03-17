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
    const [linkError, setLinkError] = useState(null);

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
        setLinkError(null);
        try {
            const res = await fetch(`${API_BASE}/budget-tabs/${budgetTabId}/link`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transaction_tab_id: transactionTabId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLinkError(data.error || 'Failed to link tabs');
                return false;
            }
            setLinkedTab(data || null);
            return true;
        } catch {
            setLinkError('Failed to link tabs — server may be unavailable');
            return false;
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

    return { linkedTab, loading, linkError, fetchLink, setLink, removeLink };
};

export default useBudgetLinks;
