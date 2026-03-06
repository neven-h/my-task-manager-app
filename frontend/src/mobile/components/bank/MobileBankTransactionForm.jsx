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
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0}}
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Description
                        </label>
                        <input
                            type="text"
                            value={newTransaction.description}
                            onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0}}
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Amount
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={newTransaction.amount}
                            onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0}}
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: BAUHAUS.labelWeight, fontSize: BAUHAUS.labelFontSize, textTransform: 'uppercase'}}>
                            Type
                        </label>
                        <select
                            value={newTransaction.transaction_type}
                            onChange={(e) => setNewTransaction({...newTransaction, transaction_type: e.target.value})}
                            style={{width: '100%', padding: BAUHAUS.inputPadding, border: BAUHAUS.inputBorder, fontSize: BAUHAUS.inputFontSize, borderRadius: 0}}
                        >
                            <option value="credit">Credit</option>
                            <option value="cash">Cash</option>
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
                            disabled={loading || !newTransaction.description || !newTransaction.amount}
                            style={{
                                flex: 1,
                                padding: '14px',
                                border: BAUHAUS.cardBorder,
                                background: THEME.primary,
                                color: '#fff',
                                fontWeight: BAUHAUS.labelWeight,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                opacity: (loading || !newTransaction.description || !newTransaction.amount) ? 0.5 : 1
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
