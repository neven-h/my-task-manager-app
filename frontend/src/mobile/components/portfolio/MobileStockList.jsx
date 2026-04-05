import React from 'react';
import { formatCurrency, formatCurrencyWithCode } from '../../../utils/formatCurrency';
import StockEntryRow from './MobileStockEntryRow';

const IOS = { card: '#FFFFFF', blue: '#007AFF', green: '#34C759', red: '#FF3B30', muted: '#8E8E93', separator: 'rgba(60,60,67,0.12)', radius: 16 };

const MobileStockList = ({ loading, groupedEntries, stockPrices, priceLoading, getEntryValues, onEdit, onDelete }) => {
    if (loading) {
        return <div style={{ textAlign: 'center', padding: '60px 20px', color: IOS.muted, fontSize: '0.95rem' }}>Loading…</div>;
    }
    if (Object.keys(groupedEntries).length === 0) {
        return <div style={{ textAlign: 'center', padding: '60px 20px', color: IOS.muted, fontSize: '0.95rem' }}>No portfolio entries found</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(groupedEntries).map(([stockName, stockEntries]) => {
                const tickerSymbol = stockEntries[0]?.ticker_symbol;
                const livePrice = tickerSymbol ? stockPrices[tickerSymbol] : null;

                return (
                    <div key={stockName} style={{ background: IOS.card, borderRadius: IOS.radius, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px 10px', borderBottom: `0.5px solid ${IOS.separator}` }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.3px' }}>{stockName}</span>
                                {tickerSymbol && <span style={{ fontSize: '0.78rem', color: IOS.muted }}>{tickerSymbol}</span>}
                                {priceLoading && <span style={{ fontSize: '0.7rem', color: IOS.muted }}>• updating…</span>}
                            </div>
                            {livePrice?.currentPrice && (
                                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                        {formatCurrencyWithCode(livePrice.currentPrice, livePrice.currency || 'USD')}
                                    </span>
                                    {livePrice.change != null && (
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: livePrice.change >= 0 ? IOS.green : IOS.red }}>
                                            {livePrice.change >= 0 ? '+' : ''}{livePrice.change.toFixed(2)}
                                            {livePrice.changePercent != null && ` (${livePrice.changePercent >= 0 ? '+' : ''}${livePrice.changePercent.toFixed(2)}%)`}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {stockEntries.map((entry, idx) => (
                            <StockEntryRow key={entry.id} entry={entry} isLast={idx === stockEntries.length - 1}
                                livePrice={livePrice} getEntryValues={getEntryValues} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export default MobileStockList;
