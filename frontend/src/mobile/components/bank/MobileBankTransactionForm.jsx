import React from 'react';
import { X } from 'lucide-react';
import { THEME, BAUHAUS } from '../../theme';

const MobileBankTransactionForm = ({
    showAddForm,
    editingTransaction,
    newTransaction,
    setNewTransaction,
    loading,
    onSave,
    onClose
}) => {
    if (!showAddForm) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div style={{
                width: '100%',
                maxHeight: '90vh',
                background: '#fff',
                borderRadius: BAUHAUS.modalRadius,
                padding: BAUHAUS.spacing.xl,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: BAUHAUS.spacing.xl}}>
                    <h2 style={{fontSize: BAUHAUS.headingFontSize, fontWeight: BAUHAUS.headingWeight, margin: 0, textTransform: 'uppercase'}}>
                        {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
                    </h2>
                    <button onClick={onClose} style={{background: 'none', border: 'none', padding: '8px'}}>
                        <X size={28}/>
                    </button>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Date
                        </label>
                        <input
                            type="date"
                            value={newTransaction.transaction_date}
                            onChange={(e) => setNewTransaction({...newTransaction, transaction_date: e.target.value})}
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0, boxSizing: 'border-box'}}
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Description
                        </label>
                        <input
                            type="text" dir="auto"
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
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0, boxSizing: 'border-box'}}
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Amount
                        </label>
                        <div style={{display: 'flex', gap: '8px'}}>
                        <input
                            type="number"
                            step="0.01"
                            value={newTransaction.amount}
                            onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                            style={{flex: 1, padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0, boxSizing: 'border-box'}}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const val = parseFloat(newTransaction.amount);
                                if (!isNaN(val)) setNewTransaction({...newTransaction, amount: String(-val)});
                            }}
                            style={{padding: '0 16px', border: BAUHAUS.inputBorder, background: '#f8f8f8', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0}}
                            title="Toggle sign"
                        >±</button>
                        </div>
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Type
                        </label>
                        <select
                            value={newTransaction.transaction_type}
                            onChange={(e) => setNewTransaction({...newTransaction, transaction_type: e.target.value})}
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0, boxSizing: 'border-box'}}
                        >
                            <option value="credit">Credit Card</option>
                            <option value="cash">Cash (ATM)</option>
                            <option value="transfer_out">Transfer Out (Bit / Paybox / Wire)</option>
                            <option value="transfer_in">Transfer In (Bit / Paybox / Wire)</option>
                        </select>
                    </div>
                    <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '14px',
                                border: BAUHAUS.cardBorder,
                                background: BAUHAUS.cardBg,
                                fontWeight: BAUHAUS.labelWeight,
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={loading || !newTransaction.description || newTransaction.amount === '' || isNaN(parseFloat(newTransaction.amount))}
                            style={{
                                flex: 1,
                                padding: '14px',
                                border: BAUHAUS.cardBorder,
                                background: THEME.primary,
                                color: '#fff',
                                fontWeight: BAUHAUS.labelWeight,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                opacity: (loading || !newTransaction.description || newTransaction.amount === '' || isNaN(parseFloat(newTransaction.amount))) ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileBankTransactionForm;
