import React from 'react';
import { X } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const YahooHoldingsTable = ({ colors, holdings, onDelete, onClear }) => (
    <>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                <thead>
                    <tr style={{ background: colors.primary }}>
                        {['Symbol', 'Name', 'Qty', 'Avg Cost', 'Price', 'Change', 'Value', 'Gain/Loss', ''].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: h === '' || h === 'Qty' || h === 'Avg Cost' || h === 'Price' || h === 'Change' || h === 'Value' || h === 'Gain/Loss' ? (h === '' ? 'center' : 'right') : 'left', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[...holdings]
                        .sort((a, b) => (b.positionValue || 0) - (a.positionValue || 0))
                        .map(holding => {
                            const isPositive = holding.gainLoss != null && holding.gainLoss >= 0;
                            const isPriceUp = holding.change != null && holding.change >= 0;
                            const cur = holding.currency || 'USD';
                            return (
                                <tr key={holding.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, fontSize: '0.9rem', color: colors.primary }}>{holding.ticker}</td>
                                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: colors.text, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{holding.name}</td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600 }}>
                                        {holding.quantity > 0 ? holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                                        {holding.avgCostBasis > 0 ? formatCurrencyWithCode(holding.avgCostBasis, cur) : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                                        {holding.currentPrice != null ? formatCurrencyWithCode(Number(holding.currentPrice), cur) : holding.error ? 'N/A' : '...'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: isPriceUp ? colors.success : colors.accent }}>
                                        {holding.changePercent != null ? `${isPriceUp ? '+' : ''}${holding.changePercent.toFixed(2)}%` : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                                        {holding.positionValue > 0 ? formatCurrencyWithCode(holding.positionValue, cur) : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: isPositive ? colors.success : colors.accent }}>
                                        {holding.gainLoss != null && holding.positionCost > 0 ? (
                                            <div>
                                                <div>{isPositive ? '+' : ''}{formatCurrencyWithCode(Math.abs(holding.gainLoss), cur)}</div>
                                                <div style={{ fontSize: '0.75rem' }}>({isPositive ? '+' : ''}{holding.gainLossPct?.toFixed(2)}%)</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                        <button onClick={() => onDelete(holding.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: colors.accent, display: 'flex', alignItems: 'center' }} title="Remove holding">
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClear} style={{ padding: '0.5rem 1rem', background: colors.card, border: `2px solid ${colors.accent}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', color: colors.accent, textTransform: 'uppercase' }}>
                Clear All Holdings
            </button>
        </div>
    </>
);

export default YahooHoldingsTable;
