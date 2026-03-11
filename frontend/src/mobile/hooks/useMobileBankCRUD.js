import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const EMPTY_TRANSACTION = {
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    transaction_type: 'credit'
};

const useMobileBankCRUD = ({
    activeTabId,
    editingTransaction,
    newTransaction,
    setLoading,
    setError,
    setShowAddForm,
    setEditingTransaction,
    setNewTransaction,
    fetchTransactions,
    fetchStats
}) => {
    const handleSaveTransaction = async () => {
        try {
            setLoading(true);
            const url = editingTransaction
                ? `${API_BASE}/transactions/${editingTransaction.id}`
                : `${API_BASE}/transactions`;
            const method = editingTransaction ? 'PUT' : 'POST';

            const body = {
                ...newTransaction,
                tab_id: Number(activeTabId),
                amount: parseFloat(newTransaction.amount)
            };

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchTransactions();
                await fetchStats();
                setShowAddForm(false);
                setEditingTransaction(null);
                setNewTransaction({ ...EMPTY_TRANSACTION, transaction_date: new Date().toISOString().split('T')[0] });
            }
        } catch (err) {
            setError('Failed to save transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await fetch(`${API_BASE}/transactions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchTransactions();
            await fetchStats();
        } catch (err) {
            setError('Failed to delete transaction');
        }
    };

    const handleBatchRename = async (oldDesc, newDesc) => {
        if (!activeTabId || !oldDesc || !newDesc) return;
        try {
            const res = await fetch(`${API_BASE}/transactions/batch/rename`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: activeTabId, old_description: oldDesc, new_description: newDesc }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Rename failed');
            await fetchTransactions();
            await fetchStats();
        } catch (err) {
            setError(err.message);
        }
    };

    return { handleSaveTransaction, handleDeleteTransaction, handleBatchRename, EMPTY_TRANSACTION };
};

export default useMobileBankCRUD;
