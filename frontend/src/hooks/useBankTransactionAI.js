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
    const [aiAdvisor,       setAiAdvisor]       = useState(null);
    const [aiAdvisorLoading, setAiAdvisorLoading] = useState(false);

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

    const fetchAIAdvisor = useCallback(async (forceRefresh = false) => {
        if (!activeTabId) return;
        setAiAdvisorLoading(true);
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            if (forceRefresh) params.set('refresh', '1');
            const res = await fetch(`${API_BASE}/ai/financial-advisor?${params}`, { headers: getAuthHeaders() });
            if (res.status === 503) {
                // AI unavailable — surface gracefully without a global error toast
                setAiAdvisor(await res.json());
                return;
            }
            if (!res.ok) throw new Error('AI advisor request failed');
            setAiAdvisor(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setAiAdvisorLoading(false);
        }
    }, [activeTabId, setError]);

    const clearAIAdvisor = useCallback(() => setAiAdvisor(null), []);

    return {
        txPredictions, spendingInsights, insightsLoading, fetchTransactionPredictions, fetchSpendingInsights,
        aiAdvisor, aiAdvisorLoading, fetchAIAdvisor, clearAIAdvisor,
    };
};

export default useBankTransactionAI;
