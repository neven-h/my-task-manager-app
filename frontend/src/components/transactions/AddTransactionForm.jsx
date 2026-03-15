import React from 'react';
import { CreditCard, Banknote, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const TYPES = [
    { value: 'credit', label: 'Credit', icon: <CreditCard size={18} /> },
    { value: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
    { value: 'transfer_out', label: 'Transfer Out', icon: <ArrowUpRight size={18} />, bg: '#FF3B30' },
    { value: 'transfer_in', label: 'Transfer In', icon: <ArrowDownLeft size={18} />, bg: '#34C759' },
];

const AddTransactionForm = ({ newTransaction, setNewTransaction, allDescriptions, colors }) => {
    const handleDescChange = (e) => {
        const desc = e.target.value;
        const lower = desc.toLowerCase();
        const isBitPaybox = lower.includes('ביט') || lower.includes('bit') || lower.includes('פייבוקס') || lower.includes('paybox') || lower.includes('pay box') || lower.includes('העברה');
        const update = { ...newTransaction, description: desc };
        if (isBitPaybox && newTransaction.transaction_type === 'credit') update.transaction_type = 'transfer_out';
        setNewTransaction(update);
    };

    return (
        <>
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1.1rem', color: colors.text }}>Type</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {TYPES.map(({ value, label, icon, bg }) => (
                        <button key={value} type="button" onClick={() => setNewTransaction({ ...newTransaction, transaction_type: value })}
                            style={{
                                flex: 1, padding: '0.75rem', border: `3px solid ${colors.border}`,
                                background: newTransaction.transaction_type === value ? (bg || (value === 'cash' ? colors.success : colors.accent)) : colors.card,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                fontSize: '0.9rem', fontWeight: newTransaction.transaction_type === value ? '700' : '500',
                                color: newTransaction.transaction_type === value ? '#fff' : colors.text,
                                fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '100px',
                            }}>
                            {icon} {label}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📅 Date</label>
                <input type="date" value={newTransaction.transaction_date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, transaction_date: e.target.value, month_year: e.target.value.slice(0, 7) })}
                    style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>📝 Description</label>
                <input type="text" value={newTransaction.description} onChange={handleDescChange}
                    placeholder="Transaction description" list="descriptions-list"
                    style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }} />
                <datalist id="descriptions-list">
                    {allDescriptions.map(desc => <option key={desc} value={desc} />)}
                </datalist>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>💰 Amount (₪)</label>
                <input type="number" step="0.01" value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    placeholder="0.00" style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }} />
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>🏦 Account Number (optional)</label>
                <input type="text" value={newTransaction.account_number}
                    onChange={(e) => setNewTransaction({ ...newTransaction, account_number: e.target.value })}
                    placeholder="Account number" style={{ width: '100%', padding: '1rem', border: `3px solid ${colors.border}`, fontSize: '1.05rem', fontFamily: '"Inter", sans-serif' }} />
            </div>
        </>
    );
};

export default AddTransactionForm;
