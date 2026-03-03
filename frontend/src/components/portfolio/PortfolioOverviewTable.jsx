import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const colors = {
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    success: '#00AA00',
    card: '#ffffff',
    text: '#000',
    textLight: '#666',
    border: '#000'
};

const calculateGrowth = (currentValue, basePrice) => {
    if (!basePrice || basePrice === 0) return null;
    return ((currentValue - basePrice) / basePrice) * 100;
};

const PortfolioOverviewTable = ({ getStockSummary, stockPrices, priceLoading, onRefreshPrices }) => (
    <div style={{ background: colors.card, border: `2px solid ${colors.border}`, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={28} color={colors.primary} />
                Portfolio Overview
            </h2>
            <button onClick={onRefreshPrices} disabled={priceLoading} style={{ padding: '0.5rem 1rem', background: priceLoading ? colors.textLight : colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: priceLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: priceLoading ? 0.6 : 1 }}>
                {priceLoading ? '⏳ Loading...' : '🔄 Refresh Prices'}
            </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                <thead>
                    <tr style={{ background: colors.primary }}>
                        {['Stock','Live Price','Value / Unit','Total Value','Base Price','Growth','% Change','% of Portfolio'].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: h === 'Stock' ? 'left' : 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {getStockSummary
                        .sort((a, b) => {
                            const aTotal = (b.latestEntry.value_ils || 0) * (b.latestEntry.units || 1);
                            const bTotal = (a.latestEntry.value_ils || 0) * (a.latestEntry.units || 1);
                            return aTotal - bTotal;
                        })
                        .map(stock => {
                            const entryCurrency = stock.latestEntry.currency || 'USD';
                            const entryValue = stock.latestEntry.value_ils;
                            const entryUnits = stock.latestEntry.units || 1;
                            const totalValue = entryValue * entryUnits;
                            const growth = calculateGrowth(entryValue, stock.basePrice);
                            const growthValue = stock.basePrice != null ? (entryValue - stock.basePrice) * entryUnits : null;
                            const isPositive = growth !== null && growth >= 0;
                            const livePrice = stock.tickerSymbol ? stockPrices[stock.tickerSymbol] : null;
                            const livePriceValue = livePrice?.currentPrice;
                            const liveChange = livePrice?.change;
                            const liveChangePercent = livePrice?.changePercent;
                            const isLivePositive = liveChange !== null && liveChange >= 0;

                            return (
                                <tr key={stock.name} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: '700', color: colors.text }}>
                                        <div>{stock.name}</div>
                                        {stock.tickerSymbol && <div style={{ fontSize: '0.75rem', color: colors.textLight, fontWeight: '500', marginTop: '0.25rem' }}>{stock.tickerSymbol}</div>}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem' }}>
                                        {livePriceValue !== null && livePriceValue !== undefined ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                <div style={{ color: colors.text }}>{Number(livePriceValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                {liveChange !== null && liveChange !== undefined && (
                                                    <div style={{ fontSize: '0.8rem', color: isLivePositive ? colors.success : colors.accent, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        {isLivePositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {isLivePositive ? '+' : ''}{liveChangePercent?.toFixed(2) || liveChange?.toFixed(2)}%
                                                    </div>
                                                )}
                                            </div>
                                        ) : stock.tickerSymbol ? (
                                            priceLoading ? <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>Loading...</span> : <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>N/A</span>
                                        ) : (
                                            <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: colors.textLight }}>
                                        {formatCurrencyWithCode(entryValue, entryCurrency)}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: colors.primary }}>
                                        {formatCurrencyWithCode(totalValue, entryCurrency)}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: colors.textLight }}>
                                        {stock.basePrice != null ? formatCurrencyWithCode(stock.basePrice, entryCurrency) : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: growthValue !== null ? (isPositive ? colors.success : colors.accent) : colors.textLight, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                        {growthValue !== null ? (<>{isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{formatCurrencyWithCode(Math.abs(growthValue), entryCurrency)}</>) : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.95rem', color: growth !== null ? (isPositive ? colors.success : colors.accent) : colors.textLight }}>
                                        {growth !== null ? (
                                            <span style={{ padding: '0.3rem 0.6rem', background: isPositive ? '#ecfdf5' : '#fff0f0', color: isPositive ? colors.success : colors.accent, border: `2px solid ${isPositive ? colors.success : colors.accent}`, fontFamily: '"Inter", sans-serif' }}>
                                                {isPositive ? '+' : ''}{growth.toFixed(2)}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: colors.text }}>
                                        {stock.latestEntry.percentage ? (
                                            <span style={{ padding: '0.3rem 0.6rem', background: colors.secondary, color: colors.text, fontSize: '0.85rem', fontWeight: '700', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                                                {stock.latestEntry.percentage}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
    </div>
);

export default PortfolioOverviewTable;
