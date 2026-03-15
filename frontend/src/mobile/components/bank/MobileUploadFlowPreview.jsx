import React from 'react';
import { Check } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME, FONT_STACK } from '../../../ios/theme';

const MobileUploadFlowPreview = ({
    parsedData, totalAmount, transactionType,
    selectedTabName, saving, handleSave,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Summary */}
        <div style={{
            padding: '16px', border: '3px solid #000', background: '#f8f8f8',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '8px'
        }}>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>
                    {parsedData.transaction_count || parsedData.transactions?.length || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Transactions
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                    {formatCurrency(totalAmount)}
                </div>
                <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                    Total
                </div>
            </div>
        </div>

        {/* Metadata badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
                padding: '4px 10px', border: '2px solid #000',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                background: transactionType === 'cash' ? THEME.secondary : THEME.primary,
                color: transactionType === 'cash' ? '#000' : '#fff'
            }}>
                {transactionType}
            </span>
            <span style={{
                padding: '4px 10px', border: '2px solid #000',
                fontSize: '0.75rem', fontWeight: 700, background: '#f0f0f0'
            }}>
                Tab: {selectedTabName}
            </span>
        </div>

        {/* Transaction list */}
        <div style={{ border: '2px solid #000', maxHeight: '40vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {(parsedData.transactions || []).slice(0, 30).map((t, idx) => (
                <div
                    key={idx}
                    style={{
                        padding: '10px 12px',
                        borderBottom: idx < 29 ? '1px solid #e0e0e0' : 'none',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: '8px'
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description || '--'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: THEME.muted }}>
                            {t.transaction_date || '--'}
                        </div>
                    </div>
                    <div style={{
                        fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                        color: (Number(t.amount) || 0) < 0 ? THEME.accent : THEME.text
                    }}>
                        {formatCurrency(t.amount)}
                    </div>
                </div>
            ))}
            {(parsedData.transactions?.length || 0) > 30 && (
                <div style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.8rem', color: THEME.muted, fontWeight: 600 }}>
                    + {parsedData.transactions.length - 30} more transactions
                </div>
            )}
        </div>

        {/* Save button */}
        <button
            onClick={handleSave}
            disabled={saving}
            style={{
                width: '100%', padding: '16px', border: '3px solid #000',
                background: saving ? '#ccc' : THEME.success,
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: FONT_STACK, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
        >
            <Check size={18} />
            {saving ? 'Saving...' : `Save to "${selectedTabName}"`}
        </button>
    </div>
);

export default MobileUploadFlowPreview;
