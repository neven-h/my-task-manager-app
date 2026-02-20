import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useBankTransactionData = () => {
    // Core data
    const [uploadedData, setUploadedData] = useState(null);
    const [savedMonths, setSavedMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [monthTransactions, setMonthTransactions] = useState([]);
    const [allDescriptions, setAllDescriptions] = useState([]);
    const [transactionStats, setTransactionStats] = useState(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Tab state
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [orphanedCount, setOrphanedCount] = useState(0);

    // ==================== TAB FUNCTIONS ====================

    const fetchTabs = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (Array.isArray(data)) {
                setTabs(data);
                return data;
            }
            setTabs([]);
            return [];
        } catch (err) {
            console.error('Error fetching tabs:', err);
            setTabs([]);
            return [];
        }
    }, []);

    const checkOrphanedTransactions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs/orphaned`, { headers: getAuthHeaders() });
            const data = await response.json();
            setOrphanedCount(data.count || 0);
        } catch (err) {
            console.error('Error checking orphaned transactions:', err);
        }
    }, []);

    const adoptOrphanedTransactions = useCallback(async (tabId) => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs/${tabId}/adopt`, { method: 'POST', headers: getAuthHeaders() });
            if (response.ok) {
                setOrphanedCount(0);
            }
            return response.ok;
        } catch (err) {
            setError('Failed to assign transactions');
            return false;
        }
    }, []);

    const handleCreateFirstTab = useCallback(async (tabName) => {
        if (!tabName.trim()) return null;
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: tabName.trim() })
            });
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                setError(data.error || 'Failed to create tab');
                return null;
            }
        } catch (err) {
            setError('Failed to create tab - server may be unavailable');
            return null;
        }
    }, []);

    // ==================== DATA FUNCTIONS ====================

    const fetchAllDescriptions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/descriptions`, { headers: getAuthHeaders() });
            const data = await response.json();
            setAllDescriptions(data);
        } catch (err) {
            console.error('Error fetching descriptions:', err);
        }
    }, []);

    const fetchTransactionStats = useCallback(async (tabId) => {
        try {
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const url = `${API_BASE}/transactions/stats${tabParam}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            const data = await response.json();
            setTransactionStats(data);
        } catch (err) {
            console.error('[BankTransactions] Error fetching stats:', err);
        }
    }, []);

    const fetchSavedMonths = useCallback(async (tabId) => {
        try {
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/months${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            setSavedMonths(data);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Error fetching months:', err);
            return [];
        }
    }, []);

    const fetchAllTransactions = useCallback(async (tabId) => {
        try {
            setLoading(true);
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/all${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data)) {
                throw new Error(data?.error || 'Failed to fetch transactions');
            }
            setMonthTransactions(data);
            setSelectedMonth('all');
            localStorage.setItem('selectedMonth', 'all');
            return data;
        } catch (err) {
            setError(err.message || 'Failed to fetch transactions');
            setSelectedMonth('all');
            setMonthTransactions([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMonthTransactions = useCallback(async (monthYear, tabId) => {
        try {
            setLoading(true);
            const tabParam = tabId ? `?tab_id=${tabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/${monthYear}${tabParam}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data)) {
                throw new Error(data?.error || 'Failed to fetch month transactions');
            }
            setMonthTransactions(data);
            setSelectedMonth(monthYear);
            localStorage.setItem('selectedMonth', monthYear);
        } catch (err) {
            setError(err.message || 'Failed to fetch transactions');
            // Fallback: show all transactions so the UI doesn't go blank
            try {
                await fetchAllTransactions(tabId);
            } catch {
                setSelectedMonth('all');
                setMonthTransactions([]);
            }
        } finally {
            setLoading(false);
        }
    }, [fetchAllTransactions]);

    // ==================== UPLOAD / CRUD ====================

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

                const response = await fetch(`${API_BASE}/transactions/upload`, {
                    method: 'POST',
                    headers: getAuthHeaders(false),
                    body: formData
                });

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    errors.push(`${file.name}: unexpected server response`);
                    console.error('Non-JSON response:', text);
                    continue;
                }

                const data = await response.json();

                if (!response.ok) {
                    errors.push(`${file.name}: ${data.error || 'upload failed'}`);
                    continue;
                }

                fileResults.push(data);
            }

            if (fileResults.length === 0) {
                setError(errors.join(' | ') || 'All files failed to upload.');
                return;
            }

            // Merge results from all successfully parsed files
            const allTransactions = fileResults.flatMap(d => d.transactions);
            const totalCount = allTransactions.length;
            const totalAmount = allTransactions.reduce((sum, t) => sum + t.amount, 0);
            const types = [...new Set(fileResults.map(d => d.transaction_type))];
            const mergedType = types.length === 1 ? types[0] : 'mixed';

            const merged = {
                success: true,
                transactions: allTransactions,
                transaction_count: totalCount,
                total_amount: totalAmount,
                transaction_type: mergedType,
                month_year: fileResults[0].month_year,
                normalizer_profile: fileResults[fileResults.length - 1].normalizer_profile,
                normalizer_confidence: fileResults[fileResults.length - 1].normalizer_confidence,
            };

            setUploadedData(merged);

            const typeLabel = mergedType === 'cash' ? 'cash' : mergedType === 'mixed' ? 'mixed' : 'credit card';
            const fileWord = fileResults.length === 1 ? '1 file' : `${fileResults.length} files`;
            let msg = `Successfully parsed ${totalCount} ${typeLabel} transactions from ${fileWord}.`;
            if (errors.length) msg += ` (${errors.length} file(s) failed: ${errors.join(', ')})`;
            setSuccess(msg);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    }, []);

    const handleSaveTransactions = useCallback(async (activeTabId) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE}/transactions/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    transactions: uploadedData.transactions,
                    tab_id: activeTabId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to save transactions');
                return false;
            }

            setSuccess(data.message);
            setUploadedData(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [uploadedData]);

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
            if (!response.ok) {
                console.error(data.error || 'Failed to add transaction');
            }

            setSuccess('Transaction added successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

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
            if (!response.ok) {
                console.error(data.error || 'Failed to update transaction');
            }

            setSuccess('Transaction updated successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        if (!window.confirm('Delete this transaction?')) return false;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                console.error('Failed to delete transaction');
            }

            setSuccess('Transaction deleted successfully');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteMonth = useCallback(async (monthYear, activeTabId) => {
        try {
            setLoading(true);
            const tabParam = activeTabId ? `?tab_id=${activeTabId}` : '';
            const response = await fetch(`${API_BASE}/transactions/month/${monthYear}${tabParam}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                console.error('Delete failed');
            }

            setSuccess('Transactions deleted successfully');
            if (selectedMonth === monthYear) {
                setSelectedMonth(null);
                setMonthTransactions([]);
            }
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    return {
        // Core data
        uploadedData, setUploadedData,
        savedMonths, setSavedMonths,
        selectedMonth, setSelectedMonth,
        monthTransactions, setMonthTransactions,
        allDescriptions,
        transactionStats,

        // UI state
        loading, setLoading,
        error, setError,
        success, setSuccess,

        // Tab state
        tabs, setTabs,
        activeTabId, setActiveTabId,
        orphanedCount, setOrphanedCount,

        // Tab functions
        fetchTabs,
        checkOrphanedTransactions,
        adoptOrphanedTransactions,
        handleCreateFirstTab,

        // Data functions
        fetchAllDescriptions,
        fetchTransactionStats,
        fetchSavedMonths,
        fetchAllTransactions,
        fetchMonthTransactions,

        // CRUD
        handleFileUpload,
        handleSaveTransactions,
        handleAddTransaction,
        handleUpdateTransaction,
        handleDeleteTransaction,
        handleDeleteMonth,
    };
};

export default useBankTransactionData;
