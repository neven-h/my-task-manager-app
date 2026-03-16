import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { THEME, FONT_STACK } from '../../../ios/theme';
import { formatCurrency } from '../../../utils/formatCurrency';

const MobileBudgetUploadPreview = ({ parsedData, saving, onSave, onBack }) => {
    const entries = parsedData?.entries || [];
    const incomeTotal = entries
        .filter(e => e.type === 'income')
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const expenseTotal = entries
        .filter(e => e.type === 'outcome' || e.type === 'expense')
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Summary strip */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 16,
                background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{entries.length}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8E8E93', fontWeight: 600 }}>Entries</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34C759' }}>
                        {formatCurrency(incomeTotal)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8E8E93', fontWeight: 600 }}>Income</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF3B30' }}>
                        {formatCurrency(expenseTotal)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8E8E93', fontWeight: 600 }}>Expenses</div>
                </div>
            </div>

            {/* Entry list */}
            <div style={{
                borderRadius: 16, background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                maxHeight: '40vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            }}>
                {entries.slice(0, 30).map((e, idx) => (
                    <div key={idx} style={{
                        padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: 8,
                        borderBottom: idx < Math.min(entries.length, 30) - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {e.description || '--'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{e.entry_date || '--'}</div>
                        </div>
                        <span style={{
                            padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                            background: e.type === 'income' ? '#E8FAE8' : '#FFE5E5',
                            color: e.type === 'income' ? '#34C759' : '#FF3B30',
                        }}>
                            {e.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, flexShrink: 0 }}>
                            {formatCurrency(e.amount)}
                        </div>
                    </div>
                ))}
                {entries.length > 30 && (
                    <div style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.82rem', color: '#8E8E93' }}>
                        + {entries.length - 30} more entries
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onBack} style={{
                    flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.12)',
                    background: '#fff', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                    fontFamily: FONT_STACK, color: '#333',
                }}>Back</button>
                <button onClick={onSave} disabled={saving} style={{
                    flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                    background: saving ? '#aaa' : '#34C759', color: '#fff',
                    fontWeight: 700, fontSize: '0.92rem', cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_STACK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <Check size={16} />
                    {saving ? 'Saving...' : 'Save Entries'}
                </button>
            </div>
        </div>
    );
};

export default MobileBudgetUploadPreview;
