import React, { useState } from 'react';
import { CreditCard, Banknote, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const getDefaultTransaction = () => ({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    month_year: new Date().toISOString().slice(0, 7),
    transaction_type: 'credit'
});

const AddTransactionModal = () => {
    const {
        showAddForm, setShowAddForm,
        loading, colors,
        allDescriptions,
        handleAddTransaction,
    } = useBankTransactionContext();

    const [newTransaction, setNewTransaction] = useState(getDefaultTransaction);

    if (!showAddForm) return null;

    const onAdd = async () => {
        const ok = await handleAddTransaction(newTransaction);
        if (ok) {
            setNewTransaction(getDefaultTransaction());
        }
    };

    const onClose = () => {
        setShowAddForm(false);
        setNewTransaction(getDefaultTransaction());
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: colors.card,
                padding: '2.5rem',
                width: '100%',
                maxWidth: '550px',
                border: `4px solid ${colors.border}`,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '8px 8px 0px #000'
            }}>
                <h2 style={{ margin: '0 0 2rem 0', fontWeight: '800', fontSize: '1.6rem', color: colors.text }}>
                    ➕ Add Transaction
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1.1rem', color: colors.text }}>Type</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {[
                            { value: 'credit', label: 'Credit', icon: <CreditCard size={18} />, bg: colors.accent },
                            { value: 'cash', label: 'Cash', icon: <Banknote size={18} />, bg: colors.success },
                            { value: 'transfer_out', label: 'Transfer Out', icon: <ArrowUpRight size={18} />, bg: '#FF3B30' },
                            { value: 'transfer_in', label: 'Transfer In', icon: <ArrowDownLeft size={18} />, bg: '#34C759' },
                        ].map(({ value, label, icon, bg }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setNewTransaction({...newTransaction, transaction_type: value})}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: `3px solid ${colors.border}`,
                                    background: newTransaction.transaction_type === value ? bg : colors.card,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.9rem',
                                    fontWeight: newTransaction.transaction_type === value ? '700' : '500',
                                    color: newTransaction.transaction_type === value ? '#fff' : colors.text,
                                    fontFamily: '"Inter", sans-serif',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    minWidth: '100px',
                                }}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📅 Date</label>
                    <input
                        type="date"
                        value={newTransaction.transaction_date}
                        onChange={(e) => setNewTransaction({
                            ...newTransaction,
                            transaction_date: e.target.value,
                            month_year: e.target.value.slice(0, 7)
                        })}
                        style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📝 Description</label>
                    <input
                        type="text"
                        value={newTransaction.description}
                        onChange={(e) => {
                            const desc = e.target.value;
                            const lower = desc.toLowerCase();
                            const isBitPaybox = lower.includes('ביט') || lower.includes('bit') ||
                                                lower.includes('פייבוקס') || lower.includes('paybox') ||
                                                lower.includes('pay box') || lower.includes('העברה');
                            const update = { ...newTransaction, description: desc };
                            if (isBitPaybox && newTransaction.transaction_type === 'credit') {
                                update.transaction_type = 'transfer_out';
                            }
                            setNewTransaction(update);
                        }}
                        placeholder="Transaction description"
                        list="descriptions-list"
                        style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
                    />
                    <datalist id="descriptions-list">
                        {allDescriptions.map(desc => (
                            <option key={desc} value={desc} />
                        ))}
                    </datalist>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>💰 Amount (₪)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                        placeholder="0.00"
                        style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
                    />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>🏦 Account Number (optional)</label>
                    <input
                        type="text"
                        value={newTransaction.account_number}
                        onChange={(e) => setNewTransaction({...newTransaction, account_number: e.target.value})}
                        placeholder="Account number"
                        style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onAdd}
                        disabled={!newTransaction.description || !newTransaction.amount || loading}
                        style={{
                            flex: 1,
                            padding: '1.25rem',
                            background: newTransaction.transaction_type === 'cash' ? colors.success : newTransaction.transaction_type === 'transfer_in' ? '#34C759' : newTransaction.transaction_type === 'transfer_out' ? '#FF3B30' : colors.primary,
                            color: '#fff',
                            border: `3px solid ${colors.border}`,
                            cursor: (!newTransaction.description || !newTransaction.amount || loading) ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            fontSize: '1.15rem',
                            opacity: (!newTransaction.description || !newTransaction.amount || loading) ? 0.5 : 1,
                            fontFamily: '"Inter", sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {loading ? '⏳ Adding...' : '✅ Add Transaction'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '1.25rem 2rem',
                            background: colors.card,
                            border: `3px solid ${colors.border}`,
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '1.1rem',
                            color: colors.text,
                            fontFamily: '"Inter", sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTransactionModal;
