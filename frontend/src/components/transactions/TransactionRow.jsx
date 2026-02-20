import React from 'react';
import { Edit2, Save, Trash2, X } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const TransactionRow = ({ transaction }) => {
    const {
        colors,
        editingTransaction, setEditingTransaction,
        expandedDescriptionId, setExpandedDescriptionId,
        handleUpdateTransaction,
        handleDeleteTransaction,
        getDescriptionHistory,
    } = useBankTransactionContext();

    const t = transaction;
    const isEditing = editingTransaction?.id === t.id;
    const isExpanded = expandedDescriptionId === t.id;

    return (
        <React.Fragment>
            <tr style={{ borderBottom: isExpanded ? 'none' : `1px solid ${colors.border}` }}>
                {isEditing ? (
                    <>
                        <td style={{ padding: '0.5rem' }}>
                            <input
                                type="date"
                                value={editingTransaction.transaction_date.split('T')[0]}
                                onChange={(e) => setEditingTransaction({
                                    ...editingTransaction,
                                    transaction_date: e.target.value,
                                    month_year: e.target.value.slice(0, 7)
                                })}
                                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                            />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                            <input
                                type="text"
                                value={editingTransaction.description}
                                onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                            />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <select
                                value={editingTransaction.transaction_type}
                                onChange={(e) => setEditingTransaction({...editingTransaction, transaction_type: e.target.value})}
                                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                            >
                                <option value="credit">Credit</option>
                                <option value="cash">Cash</option>
                            </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                            <input
                                type="number"
                                step="0.01"
                                value={editingTransaction.amount}
                                onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', textAlign: 'right', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                            />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button
                                onClick={() => handleUpdateTransaction(t.id)}
                                style={{ padding: '0.4rem 0.6rem', background: colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', marginRight: '0.4rem', fontFamily: '"Inter", sans-serif' }}
                            >
                                <Save size={14} />
                            </button>
                            <button
                                onClick={() => setEditingTransaction(null)}
                                style={{ padding: '0.4rem 0.6rem', background: colors.card, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}
                            >
                                <X size={14} />
                            </button>
                        </td>
                    </>
                ) : (
                    <>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.text }}>
                            {new Date(t.transaction_date).toLocaleDateString('he-IL')}
                        </td>
                        <td
                            onClick={() => setExpandedDescriptionId(isExpanded ? null : t.id)}
                            style={{
                                padding: '0.65rem 0.75rem',
                                fontSize: '0.9rem',
                                color: colors.text,
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            <span style={{
                                borderBottom: `1px dashed ${colors.textLight}`,
                                paddingBottom: '1px'
                            }}>
                                {t.description}
                            </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <span style={{
                                padding: '0.3rem 0.6rem',
                                background: t.transaction_type === 'cash' ? colors.success : colors.accent,
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                border: `2px solid ${colors.border}`,
                                fontFamily: '"Inter", sans-serif',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}>
                                {t.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                            </span>
                        </td>
                        <td style={{
                            padding: '0.65rem 0.75rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.05em',
                            fontSize: '0.95rem',
                            color: t.amount < 0 ? colors.accent : colors.text
                        }}>
                            {formatCurrency(t.amount)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <button
                                onClick={() => setEditingTransaction({...t})}
                                style={{
                                    padding: '0.4rem 0.6rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `2px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    marginRight: '0.4rem',
                                    fontFamily: '"Inter", sans-serif'
                                }}
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                style={{
                                    padding: '0.4rem 0.6rem',
                                    background: colors.accent,
                                    color: '#fff',
                                    border: `2px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    fontFamily: '"Inter", sans-serif'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </td>
                    </>
                )}
            </tr>
            {/* Expanded description history */}
            {isExpanded && (() => {
                const history = getDescriptionHistory(t);
                if (history.length === 0) return null;
                return history.map(h => (
                    <tr key={h.id} style={{ borderBottom: `1px solid ${colors.border}`, background: '#f9f9f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                            {new Date(h.transaction_date).toLocaleDateString('he-IL')}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                            {h.description}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <span style={{
                                padding: '0.3rem 0.6rem',
                                background: h.transaction_type === 'cash' ? colors.success : colors.accent,
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                border: `2px solid ${colors.border}`,
                                fontFamily: '"Inter", sans-serif',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}>
                                {h.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                            </span>
                        </td>
                        <td style={{
                            padding: '0.65rem 0.75rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.05em',
                            fontSize: '0.95rem',
                            color: h.amount < 0 ? colors.accent : colors.textLight
                        }}>
                            {formatCurrency(h.amount)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}></td>
                    </tr>
                ));
            })()}
        </React.Fragment>
    );
};

export default React.memo(TransactionRow);
