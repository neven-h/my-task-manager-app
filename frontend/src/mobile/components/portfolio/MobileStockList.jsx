import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatCurrencyWithCode } from '../../../utils/formatCurrency';

const IOS = {
    card: '#FFFFFF',
    blue: '#007AFF',
    green: '#34C759',
    red: '#FF3B30',
    muted: '#8E8E93',
    separator: 'rgba(60,60,67,0.12)',
    radius: 16,
};

/* Two-step delete: first tap → confirm; second tap → delete */
const DeleteConfirmButton = ({ onDelete }) => {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    onClick={() => setConfirming(false)}
                    style={{
                        fontSize: '0.75rem', color: IOS.muted,
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={onDelete}
                    style={{
                        fontSize: '0.75rem', color: '#fff', background: IOS.red,
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        padding: '4px 10px', fontWeight: 600,
                    }}
                >
                    Delete
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: IOS.muted, padding: '4px',
                display: 'flex', alignItems: 'center',
            }}
        >
            <Trash2 size={17} />
        </button>
    );
};

const MobileStockList = ({
    loading,
    groupedEntries,
    stockPrices,
    priceLoading,
    getEntryValues,
    onEdit,
    onDelete,
    theme,  // kept for API compatibility; IOS tokens used internally
}) => {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: IOS.muted, fontSize: '0.95rem' }}>
                Loading…
            </div>
        );
    }

    if (Object.keys(groupedEntries).length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: IOS.muted, fontSize: '0.95rem' }}>
                No portfolio entries found
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(groupedEntries).map(([stockName, stockEntries]) => {
                const tickerSymbol = stockEntries[0]?.ticker_symbol;
                const livePrice = tickerSymbol ? stockPrices[tickerSymbol] : null;

                return (
                    <div
                        key={stockName}
                        style={{
                            background: IOS.card,
                            borderRadius: IOS.radius,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* ── Stock group header ─────────────────────────────── */}
                        <div style={{
                            padding: '14px 16px 10px',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.3px' }}>
                                    {stockName}
                                </span>
                                {tickerSymbol && (
                                    <span style={{ fontSize: '0.78rem', color: IOS.muted }}>
                                        {tickerSymbol}
                                    </span>
                                )}
                                {priceLoading && (
                                    <span style={{ fontSize: '0.7rem', color: IOS.muted }}>• updating…</span>
                                )}
                            </div>

                            {livePrice?.currentPrice && (
                                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                        {formatCurrency(livePrice.currentPrice)} {livePrice.currency || 'USD'}
                                    </span>
                                    {livePrice.change != null && (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: livePrice.change >= 0 ? IOS.green : IOS.red,
                                        }}>
                                            {livePrice.change >= 0 ? '+' : ''}{livePrice.change.toFixed(2)}
                                            {livePrice.changePercent != null &&
                                                ` (${livePrice.changePercent >= 0 ? '+' : ''}${livePrice.changePercent.toFixed(2)}%)`}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Entries ────────────────────────────────────────── */}
                        {stockEntries.map((entry, idx) => {
                            const { units, currency, totalValue, growthAmount, growthPercent } = getEntryValues(entry, livePrice);
                            const isLast = idx === stockEntries.length - 1;

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                                    }}
                                >
                                    {/* Row 1: date + value */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '0.8rem', color: IOS.muted }}>
                                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                                        </span>
                                        <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.3px' }}>
                                            {formatCurrencyWithCode(entry.value_ils, currency)}
                                        </span>
                                    </div>

                                    {/* Row 2: quantity + percentage */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: IOS.muted, marginBottom: '2px' }}>
                                        <span>
                                            Qty: {units.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                                        </span>
                                        <span>{entry.percentage}%</span>
                                    </div>

                                    {/* Row 3: total + base price */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: IOS.muted, marginBottom: '2px' }}>
                                        <span>Total: {formatCurrencyWithCode(totalValue, currency)}</span>
                                        {entry.base_price != null && entry.base_price !== '' && (
                                            <span>Base: {formatCurrencyWithCode(parseFloat(entry.base_price), currency)}</span>
                                        )}
                                    </div>

                                    {/* Row 4: growth + actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                        {growthAmount != null && growthPercent != null ? (
                                            <span style={{
                                                fontSize: '0.82rem',
                                                fontWeight: 600,
                                                color: growthAmount >= 0 ? IOS.green : IOS.red,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                            }}>
                                                {growthAmount >= 0
                                                    ? <TrendingUp size={13} />
                                                    : <TrendingDown size={13} />}
                                                {formatCurrencyWithCode(Math.abs(growthAmount), currency)}
                                                {' '}({growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%)
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: IOS.muted }}>Growth: —</span>
                                        )}

                                        {/* Edit / Delete */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <button
                                                onClick={() => onEdit(entry)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: IOS.blue, padding: '4px',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <DeleteConfirmButton onDelete={() => onDelete(entry.id)} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default MobileStockList;
