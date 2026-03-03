import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatCurrencyWithCode } from '../../../utils/formatCurrency';

const MobileStockList = ({
    loading,
    groupedEntries,
    stockPrices,
    priceLoading,
    getEntryValues,
    onEdit,
    onDelete,
    theme
}) => {
    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
    }

    if (Object.keys(groupedEntries).length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.muted }}>
                No portfolio entries found
            </div>
        );
    }

    return (
        <>
            {Object.entries(groupedEntries).map(([stockName, stockEntries]) => {
                const tickerSymbol = stockEntries[0]?.ticker_symbol;
                const livePrice = tickerSymbol ? stockPrices[tickerSymbol] : null;

                return (
                    <div key={stockName} style={{ border: '3px solid #000', padding: '16px', marginBottom: '16px', background: '#fff' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px' }}>
                            {stockName}
                            {tickerSymbol && (
                                <span style={{ fontSize: '0.8rem', color: theme.muted, marginLeft: '8px' }}>
                                    ({tickerSymbol})
                                </span>
                            )}
                        </div>

                        {livePrice?.currentPrice && (
                            <div style={{ padding: '8px', background: '#f8f8f8', border: '2px solid #000', marginBottom: '12px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                            Live Price: {formatCurrency(livePrice.currentPrice)} {livePrice.currency || 'USD'}
                                        </div>
                                        {livePrice.change != null && (
                                            <div style={{ fontSize: '0.75rem', color: livePrice.change >= 0 ? theme.success : theme.accent, fontWeight: 700, marginTop: '2px' }}>
                                                {livePrice.change >= 0 ? '↑' : '↓'} {Math.abs(livePrice.change).toFixed(2)}
                                                {livePrice.changePercent != null &&
                                                    ` (${livePrice.changePercent >= 0 ? '+' : ''}${livePrice.changePercent.toFixed(2)}%)`}
                                            </div>
                                        )}
                                    </div>
                                    {priceLoading && <div style={{ fontSize: '0.7rem', color: theme.muted }}>Updating...</div>}
                                </div>
                            </div>
                        )}

                        {stockEntries.map(entry => {
                            const { units, currency, totalValue, growthAmount, growthPercent } = getEntryValues(entry, livePrice);
                            return (
                                <div key={entry.id} style={{ border: '2px solid #000', padding: '12px', marginBottom: '8px', background: '#f8f8f8' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', color: theme.muted }}>
                                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                                            {formatCurrencyWithCode(entry.value_ils, currency)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: theme.muted }}>
                                        <span>Quantity: {units.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
                                        <span>{entry.percentage}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                                        <span>Total value: {formatCurrencyWithCode(totalValue, currency)}</span>
                                    </div>
                                    {entry.base_price != null && entry.base_price !== '' && (
                                        <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                            Base: {formatCurrencyWithCode(parseFloat(entry.base_price), currency)}
                                        </div>
                                    )}
                                    {growthAmount != null && growthPercent != null ? (
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: growthAmount >= 0 ? theme.success : theme.accent, marginBottom: '8px' }}>
                                            {growthAmount >= 0
                                                ? <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                : <TrendingDown size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />}
                                            {formatCurrencyWithCode(Math.abs(growthAmount), currency)} ({growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%)
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: theme.muted, marginBottom: '8px' }}>Growth: —</div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                            onClick={() => onEdit(entry)}
                                            style={{ flex: 1, padding: '6px', border: '2px solid #000', background: theme.primary, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(entry.id)}
                                            style={{ padding: '6px', border: '2px solid #000', background: theme.accent, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
};

export default MobileStockList;
