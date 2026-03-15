import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * AI / spending-insights state and fetch functions for bank transactions.
 *
 * @param {number|null} activeTabId
 * @param {Function}    setError
 */
export const useBankTransactionAI = (activeTabId, setError) => {
    const [txPredictions,   setTxPredictions]   = useState([]);
    const [spendingInsights, setSpendingInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    const fetchTransactionPredictions = useCallback(async (months = 3) => {
        if (!activeTabId) return;
        try {
            const params = new URLSearchParams({ months, tab_id: activeTabId });
            const res = await fetch(`${API_BASE}/transactions/predict?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Prediction request failed');
            setTxPredictions(await res.json());
        } catch (err) {
            setError(err.message);
        }
    }, [activeTabId, setError]);

    const fetchSpendingInsights = useCallback(async () => {
        if (!activeTabId) return;
        setInsightsLoading(true);
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            const res = await fetch(`${API_BASE}/transactions/insights?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Insights request failed');
            setSpendingInsights(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setInsightsLoading(false);
        }
    }, [activeTabId, setError]);

    return { txPredictions, spendingInsights, insightsLoading, fetchTransactionPredictions, fetchSpendingInsights };
};

export default useBankTransactionAI;
