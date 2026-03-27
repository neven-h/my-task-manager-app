import React from 'react';
import { Save, X } from 'lucide-react';

const TransactionEditRow = ({ editingTransaction, setEditingTransaction, isSelected, toggleSelected, colors, handleUpdateTransaction, transactionId }) => (
    <>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
            <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(editingTransaction.id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
        </td>
        <td style={{ padding: '0.5rem' }}>
            <input type="date" value={editingTransaction.transaction_date.split('T')[0]}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, transaction_date: e.target.value, month_year: e.target.value.slice(0, 7) })}
                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }} />
        </td>
        <td style={{ padding: '0.5rem' }}>
            <input type="text" value={editingTransaction.description}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }} />
        </td>
        <td style={{ padding: '0.5rem' }}>
            <input type="text" value={editingTransaction.category || ''}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                placeholder="Category"
                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, width: '100%', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }} />
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
            <select value={editingTransaction.transaction_type}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, transaction_type: e.target.value })}
                style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}>
                <option value="credit">Credit</option>
                <option value="cash">Cash</option>
            </select>
        </td>
        <td style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', gap: 2 }}>
                <input type="number" step="0.01" value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                    style={{ padding: '0.4rem', border: `2px solid ${colors.border}`, flex: 1, minWidth: 0, textAlign: 'right', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', color: parseFloat(editingTransaction.amount) < 0 ? '#d00' : 'inherit' }} />
                <button type="button" title="Toggle sign"
                    onClick={() => { const v = parseFloat(editingTransaction.amount); if (!isNaN(v)) setEditingTransaction({ ...editingTransaction, amount: String(-v) }); }}
                    style={{ padding: '0.4rem 0.5rem', border: `2px solid ${colors.border}`, background: colors.card, cursor: 'pointer', fontWeight: '700', fontSize: '1rem', color: colors.text, fontFamily: '"Inter", sans-serif', flexShrink: 0 }}>
                    ±
                </button>
            </div>
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
            <button onClick={() => handleUpdateTransaction(transactionId)}
                style={{ padding: '0.4rem 0.6rem', background: colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', marginRight: '0.4rem', fontFamily: '"Inter", sans-serif' }}>
                <Save size={14} />
            </button>
            <button onClick={() => setEditingTransaction(null)}
                style={{ padding: '0.4rem 0.6rem', background: colors.card, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}>
                <X size={14} />
            </button>
        </td>
    </>
);

export default TransactionEditRow;
