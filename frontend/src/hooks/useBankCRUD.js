import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useBankCRUD = ({ uploadedData, setUploadedData, selectedMonth, setSelectedMonth, setMonthTransactions, setLoading, setError, setSuccess }) => {
    const handleFileUpload = useCallback(async (event, transactionType) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const fileResults = [];
            const errors = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setSuccess(`Uploading file ${i + 1} of ${files.length}: ${file.name}…`);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('transaction_type', transactionType);

                const response = await fetch(`${API_BASE}/transactions/upload`, { method: 'POST', headers: getAuthHeaders(false), body: formData });
                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    errors.push(`${file.name}: unexpected server response`);
                    continue;
                }
                const data = await response.json();
                if (!response.ok) { errors.push(`${file.name}: ${data.error || 'upload failed'}`); continue; }
                fileResults.push(data);
            }

            if (fileResults.length === 0) { setError(errors.join(' | ') || 'All files failed to upload.'); return; }

            const allTransactions = fileResults.flatMap(d => d.transactions);
            const types = [...new Set(fileResults.map(d => d.transaction_type))];
            const merged = {
                success: true,
                transactions: allTransactions,
                transaction_count: allTransactions.length,
                total_amount: allTransactions.reduce((sum, t) => sum + t.amount, 0),
                transaction_type: types.length === 1 ? types[0] : 'mixed',
                month_year: fileResults[0].month_year,
                normalizer_profile: fileResults[fileResults.length - 1].normalizer_profile,
                normalizer_confidence: fileResults[fileResults.length - 1].normalizer_confidence,
            };
            setUploadedData(merged);

            const typeLabel = merged.transaction_type === 'cash' ? 'cash' : merged.transaction_type === 'mixed' ? 'mixed' : 'credit card';
            const fileWord = fileResults.length === 1 ? '1 file' : `${fileResults.length} files`;
            let msg = `Successfully parsed ${allTransactions.length} ${typeLabel} transactions from ${fileWord}.`;
            if (errors.length) msg += ` (${errors.length} file(s) failed: ${errors.join(', ')})`;
            setSuccess(msg);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    }, [uploadedData, setUploadedData, setLoading, setError, setSuccess]);

    const handleSaveTransactions = useCallback(async (activeTabId) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/transactions/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transactions: uploadedData.transactions, tab_id: activeTabId })
            });
            const data = await response.json();
            if (!response.ok) { setError(data.error || 'Failed to save transactions'); return false; }
            setSuccess(data.message);
            setUploadedData(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [uploadedData, setUploadedData, setLoading, setError, setSuccess]);

    const handleAddTransaction = useCallback(async (newTransaction, activeTabId) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/transactions/manual`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...newTransaction, tab_id: activeTabId })
            });
            const data = await response.json();
            if (!response.ok) console.error(data.error || 'Failed to add transaction');
            setSuccess('Transaction added successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError, setSuccess]);

    const handleUpdateTransaction = useCallback(async (transactionId, editingData) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(editingData)
            });
            const data = await response.json();
            if (!response.ok) console.error(data.error || 'Failed to update transaction');
            setSuccess('Transaction updated successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError, setSuccess]);

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        if (!window.confirm('Delete this transaction?')) return false;
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/transactions/${transactionId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!response.ok) console.error('Failed to delete transaction');
            setSuccess('Transaction deleted successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError, setSuccess]);

    const handleDeleteMonth = useCallback(async (monthYear, activeTabId) => {
        try {
            setLoading(true);
            const tabParam = activeTabId ? `?tab_id=${activeTabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/month/${monthYear}${tabParam}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!response.ok) console.error('Delete failed');
            setSuccess('Transactions deleted successfully');
            if (selectedMonth === monthYear) { setSelectedMonth(null); setMonthTransactions([]); }
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, setSelectedMonth, setMonthTransactions, setLoading, setError, setSuccess]);

    return { handleFileUpload, handleSaveTransactions, handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth };
};

export default useBankCRUD;
