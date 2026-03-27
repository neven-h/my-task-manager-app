import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
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
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

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
                            {t.comments && <span title={t.comments} style={{ marginLeft: 6, fontSize: '0.75rem', color: colors.textLight }}>💬</span>}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.85rem', color: colors.textLight }}>
                            {t.category || ''}
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
                            <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
                                <button onClick={() => setMenuOpen(o => !o)}
                                    style={{ padding: '0.4rem 0.5rem', background: menuOpen ? colors.accent : '#fff', color: menuOpen ? '#fff' : colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif', lineHeight: 0 }}>
                                    <MoreVertical size={15} />
                                </button>
                                {menuOpen && (
                                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 3px)', zIndex: 200, background: '#fff', border: `2px solid ${colors.border}`, minWidth: 130, boxShadow: '3px 3px 0 rgba(0,0,0,0.15)' }}>
                                        <button onClick={() => { setEditingTransaction({ ...t }); setMenuOpen(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.55rem 0.85rem', background: 'none', border: 'none', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', fontWeight: 600, color: colors.text, textAlign: 'left' }}>
                                            <Edit2 size={13} /> Edit
                                        </button>
                                        <button onClick={() => { handleDeleteTransaction(t.id); setMenuOpen(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.55rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', fontWeight: 600, color: colors.accent, textAlign: 'left' }}>
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </td>
                    </>
                )}
            </tr>
            {isEditing && (
                <tr style={{ background: '#fafafa', borderBottom: `1px solid ${colors.border}` }}>
                    <td colSpan={7} style={{ padding: '0.5rem 0.75rem' }}>
                        <textarea
                            placeholder="Comments (optional)"
                            value={editingTransaction.comments || ''}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, comments: e.target.value })}
                            rows={2}
                            style={{ width: '100%', padding: '0.4rem', border: `2px solid ${colors.border}`, fontSize: '0.88rem', fontFamily: '"Inter", sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                    </td>
                </tr>
            )}
            {isExpanded && !isEditing && (() => {
                const history = getDescriptionHistory(t);
                const hasComments = !!t.comments;
                const hasHistory = history.length > 0;
                if (!hasComments && !hasHistory) return null;
                return (
                    <>
                        {hasComments && (
                            <tr style={{ background: '#f9f9f9', borderBottom: `1px solid ${colors.border}` }}>
                                <td />
                                <td colSpan={6} style={{ padding: '0.55rem 0.75rem', fontSize: '0.88rem', color: colors.text, fontStyle: 'italic' }}>
                                    💬 {t.comments}
                                </td>
                            </tr>
                        )}
                        {hasHistory && <TransactionHistoryRows history={history} colors={colors} />}
                    </>
                );
            })()}
        </React.Fragment>
    );
};

export default React.memo(TransactionRow);
