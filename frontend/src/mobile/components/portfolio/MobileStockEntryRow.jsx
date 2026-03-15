import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatCurrencyWithCode } from '../../../utils/formatCurrency';

const IOS = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', muted: '#8E8E93', separator: 'rgba(60,60,67,0.12)' };

const DeleteConfirmButton = ({ onDelete }) => {
    const [confirming, setConfirming] = useState(false);
    if (confirming) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setConfirming(false)} style={{ fontSize: '0.75rem', color: IOS.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>Cancel</button>
                <button onClick={onDelete} style={{ fontSize: '0.75rem', color: '#fff', background: IOS.red, border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', fontWeight: 600 }}>Delete</button>
            </div>
        );
    }
    return (
        <button onClick={() => setConfirming(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: IOS.muted, padding: '4px', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={17} />
        </button>
    );
};

const StockEntryRow = ({ entry, isLast, livePrice, getEntryValues, onEdit, onDelete }) => {
    const { units, currency, totalValue, growthAmount, growthPercent } = getEntryValues(entry, livePrice);
    return (
        <div style={{ padding: '12px 16px', borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.8rem', color: IOS.muted }}>{new Date(entry.entry_date).toLocaleDateString('en-GB')}</span>
                <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.3px' }}>{formatCurrencyWithCode(entry.value_ils, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: IOS.muted, marginBottom: '2px' }}>
                <span>Qty: {units.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
                <span>{entry.percentage}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: IOS.muted, marginBottom: '2px' }}>
                <span>Total: {formatCurrencyWithCode(totalValue, currency)}</span>
                {entry.base_price != null && entry.base_price !== '' && (
                    <span>Base: {formatCurrencyWithCode(parseFloat(entry.base_price), currency)}</span>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                {growthAmount != null && growthPercent != null ? (
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: growthAmount >= 0 ? IOS.green : IOS.red, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {growthAmount >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {formatCurrencyWithCode(Math.abs(growthAmount), currency)}
                        {' '}({growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%)
                    </span>
                ) : (
                    <span style={{ fontSize: '0.8rem', color: IOS.muted }}>Growth: —</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button onClick={() => onEdit(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: IOS.blue, padding: '4px', display: 'flex', alignItems: 'center' }}>
                        <Pencil size={16} />
                    </button>
                    <DeleteConfirmButton onDelete={() => onDelete(entry.id)} />
                </div>
            </div>
        </div>
    );
};

export default StockEntryRow;
