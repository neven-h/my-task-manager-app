import { useCallback } from 'react';
import { exportBankTransactionsPDF } from '../utils/exportBankPDF';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

/**
 * Export helpers for bank transactions (PDF + CSV).
 *
 * @param {number|null} activeTabId
 * @param {string|null} selectedMonth
 * @param {Array}       filteredTransactions
 * @param {Function}    setError
 */
export const useBankTransactionExport = (activeTabId, selectedMonth, filteredTransactions, setError) => {
    const exportToPDF = useCallback(
        () => exportBankTransactionsPDF(filteredTransactions, selectedMonth),
        [filteredTransactions, selectedMonth],
    );

    const exportTransactionsCSV = useCallback(async () => {
        if (!activeTabId) return;
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
            const response = await fetch(`${API_BASE}/export/transactions/csv?${params}`, { headers: getAuthHeaders() });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${selectedMonth || 'all'}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    }, [activeTabId, selectedMonth, setError]);

    return { exportToPDF, exportTransactionsCSV };
};

export default useBankTransactionExport;
