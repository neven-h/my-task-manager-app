import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTransactionBudgetLink = () => {
    const [budgetLink, setBudgetLink] = useState(null);

    const fetchBudgetLink = useCallback(async (tabId) => {
        if (!tabId) { setBudgetLink(null); return; }
        try {
            const res = await fetch(`${API_BASE}/transaction-tabs/${tabId}/budget-link`, { headers: getAuthHeaders() });
            if (!res.ok) { setBudgetLink(null); return; }
            setBudgetLink(await res.json());
        } catch { setBudgetLink(null); }
    }, []);

    return { budgetLink, fetchBudgetLink };
};

export default useTransactionBudgetLink;
