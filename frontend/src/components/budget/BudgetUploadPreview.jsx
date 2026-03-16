import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

const SYS = {
    primary: '#0000FF', success: '#00AA00', accent: '#FF0000',
    border: '#000', bg: '#fff',
};

const BudgetUploadPreview = ({ parsedData, saving, onSave, onBack }) => {
    const d = parsedData;
    return (
        <div>
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 16px', border: `3px solid ${SYS.border}`, fontWeight: 700 }}>
                    {d.entry_count} entries
                </div>
                <div style={{ padding: '10px 16px', border: `3px solid ${SYS.border}`, fontWeight: 700, color: SYS.success }}>
                    {'\u2191'} {d.income_count} income {'\u00B7'} {formatCurrency(d.total_income)}
                </div>
                <div style={{ padding: '10px 16px', border: `3px solid ${SYS.border}`, fontWeight: 700, color: SYS.accent }}>
                    {'\u2193'} {d.expense_count} expense {'\u00B7'} {formatCurrency(d.total_expense)}
                </div>
            </div>

            {/* Entry list */}
            <div style={{ border: `2px solid ${SYS.border}`, maxHeight: 350, overflowY: 'auto', marginBottom: 16 }}>
                {(d.entries || []).slice(0, 30).map((e, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        borderBottom: i < 29 ? '1px solid #e0e0e0' : 'none',
                        fontSize: '0.85rem',
                    }}>
                        <span style={{ color: '#666', minWidth: 80 }}>{e.entry_date}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.description}
                        </span>
                        <span style={{
                            padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700,
                            textTransform: 'uppercase',
                            background: e.type === 'income' ? SYS.success : SYS.accent,
                            color: '#fff', flexShrink: 0,
                        }}>
                            {e.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                        <span style={{ fontWeight: 700, minWidth: 80, textAlign: 'right',
                            color: e.type === 'income' ? SYS.success : SYS.accent }}>
                            {e.type === 'income' ? '+' : '\u2212'}{formatCurrency(e.amount)}
                        </span>
                    </div>
                ))}
                {(d.entries?.length || 0) > 30 && (
                    <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                        + {d.entries.length - 30} more entries
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onBack}
                    style={{ padding: '12px 24px', border: `3px solid ${SYS.border}`, background: SYS.bg, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                    {'\u2190'} Back
                </button>
                <button onClick={onSave} disabled={saving}
                    style={{ flex: 1, padding: '12px', border: `3px solid ${SYS.border}`, background: saving ? '#ccc' : SYS.primary, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                    {saving ? 'Saving...' : `Save ${d.entry_count} Entries`}
                </button>
            </div>
        </div>
    );
};

export default BudgetUploadPreview;
