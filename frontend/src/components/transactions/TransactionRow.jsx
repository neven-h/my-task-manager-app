import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';
import TransactionEditRow from './TransactionEditRow';
import TransactionHistoryRows from './TransactionHistoryRows';

const TransactionRow = ({ transaction }) => {
    const {
        colors, editingTransaction, setEditingTransaction,
        expandedDescriptionId, setExpandedDescriptionId,
        handleUpdateTransaction, handleDeleteTransaction,
        getDescriptionHistory, selectedIds, toggleSelected,
    } = useBankTransactionContext();

    const t = transaction;
    const isEditing = editingTransaction?.id === t.id;
    const isExpanded = expandedDescriptionId === t.id;
    const isSelected = selectedIds.has(t.id);

    return (
        <React.Fragment>
            <tr style={{ borderBottom: isExpanded ? 'none' : `1px solid ${colors.border}`, background: isSelected ? '#e8f0fe' : undefined }}>
                {isEditing ? (
                    <TransactionEditRow editingTransaction={editingTransaction} setEditingTransaction={setEditingTransaction} isSelected={isSelected} toggleSelected={toggleSelected} colors={colors} handleUpdateTransaction={handleUpdateTransaction} transactionId={t.id} />
                ) : (
                    <>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(t.id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.text }}>
                            {new Date(t.transaction_date).toLocaleDateString('he-IL')}
                        </td>
                        <td onClick={() => setExpandedDescriptionId(isExpanded ? null : t.id)}
                            style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.text, cursor: 'pointer', position: 'relative' }}>
                            <span style={{ borderBottom: `1px dashed ${colors.textLight}`, paddingBottom: '1px' }}>{t.description}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.3rem 0.6rem', background: t.transaction_type === 'cash' ? colors.success : colors.accent, color: '#fff', fontSize: '0.8rem', fontWeight: '600', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {t.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                            </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em', fontSize: '0.95rem', color: t.amount < 0 ? colors.accent : colors.text }}>
                            {formatCurrency(t.amount)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <button onClick={() => setEditingTransaction({ ...t })}
                                style={{ padding: '0.4rem 0.6rem', background: colors.accent, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', marginRight: '0.4rem', fontFamily: '"Inter", sans-serif' }}>
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteTransaction(t.id)}
                                style={{ padding: '0.4rem 0.6rem', background: colors.accent, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}>
                                <Trash2 size={14} />
                            </button>
                        </td>
                    </>
                )}
            </tr>
            {isExpanded && (() => {
                const history = getDescriptionHistory(t);
                if (history.length === 0) return null;
                return <TransactionHistoryRows history={history} colors={colors} />;
            })()}
        </React.Fragment>
    );
};

export default React.memo(TransactionRow);
