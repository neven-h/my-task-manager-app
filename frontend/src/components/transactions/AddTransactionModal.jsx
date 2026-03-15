import React, { useState } from 'react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import AddTransactionForm from './AddTransactionForm';

const getDefaultTransaction = () => ({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '', amount: '', account_number: '',
    month_year: new Date().toISOString().slice(0, 7),
    transaction_type: 'credit'
});

const AddTransactionModal = () => {
    const { showAddForm, setShowAddForm, loading, colors, allDescriptions, handleAddTransaction } = useBankTransactionContext();
    const [newTransaction, setNewTransaction] = useState(getDefaultTransaction);

    if (!showAddForm) return null;

    const onAdd = async () => {
        const ok = await handleAddTransaction(newTransaction);
        if (ok) setNewTransaction(getDefaultTransaction());
    };
    const onClose = () => { setShowAddForm(false); setNewTransaction(getDefaultTransaction()); };

    const canAdd = !!newTransaction.description && newTransaction.amount !== '' && !isNaN(parseFloat(newTransaction.amount)) && !loading;
    const typeColor = newTransaction.transaction_type === 'cash' ? colors.success
        : newTransaction.transaction_type === 'transfer_in' ? '#34C759'
        : newTransaction.transaction_type === 'transfer_out' ? '#FF3B30'
        : colors.primary;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: colors.card, padding: '2.5rem', width: '100%', maxWidth: '550px', border: `4px solid ${colors.border}`, maxHeight: '90vh', overflow: 'auto', boxShadow: '8px 8px 0px #000' }}>
                <h2 style={{ margin: '0 0 2rem 0', fontWeight: '800', fontSize: '1.6rem', color: colors.text }}>➕ Add Transaction</h2>
                <AddTransactionForm newTransaction={newTransaction} setNewTransaction={setNewTransaction} allDescriptions={allDescriptions} colors={colors} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onAdd} disabled={!canAdd}
                        style={{ flex: 1, padding: '1.25rem', background: typeColor, color: '#fff', border: `3px solid ${colors.border}`, cursor: canAdd ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '1.15rem', opacity: canAdd ? 1 : 0.5, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {loading ? '⏳ Adding...' : '✅ Add Transaction'}
                    </button>
                    <button onClick={onClose}
                        style={{ padding: '1.25rem 2rem', background: colors.card, border: `3px solid ${colors.border}`, cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', color: colors.text, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTransactionModal;
