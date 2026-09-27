import React, { useMemo, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const COLUMNS = [
    { label: 'Symbol', key: 'ticker', align: 'left', text: true },
    { label: 'Name', key: 'name', align: 'left', text: true },
    { label: 'Qty', key: 'quantity' },
    { label: 'Avg Cost', key: 'avgCostBasis' },
    { label: 'Price', key: 'currentPrice' },
    { label: 'Change', key: 'changePercent' },
    { label: 'Value', key: 'positionValue' },
    { label: 'Gain/Loss', key: 'gainLoss' },
];

const YahooHoldingsTable = ({ colors, holdings, onDelete, onClear, onEdit }) => {
    const [sort, setSort] = useState({ key: 'positionValue', dir: 'desc' });

    const toggleSort = (col) => setSort(prev => prev.key === col.key
        ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: col.text ? 'asc' : 'desc' });

    const sortedHoldings = useMemo(() => {
        const col = COLUMNS.find(c => c.key === sort.key);
        const sign = sort.dir === 'asc' ? 1 : -1;
        return [...holdings].sort((a, b) => {
            const av = a[sort.key], bv = b[sort.key];
            // Missing values always sink to the bottom, whichever direction
            if (av == null || av === '') return (bv == null || bv === '') ? 0 : 1;
            if (bv == null || bv === '') return -1;
            return sign * (col?.text ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv));
        });
    }, [holdings, sort]);

    return (
    <>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                <thead>
                    <tr style={{ background: colors.primary }}>
                        {COLUMNS.map(col => (
                            <th
                                key={col.key}
                                onClick={() => toggleSort(col)}
                                aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                                style={{ padding: '0.75rem', textAlign: col.align || 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                            >
                                {col.label}{sort.key === col.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        ))}
                        <th style={{ padding: '0.75rem' }} />
                    </tr>
                </thead>
                <tbody>
                    {sortedHoldings.map(holding => {
                            const isPositive = holding.gainLoss != null && holding.gainLoss >= 0;
                            const isPriceUp = holding.change != null && holding.change >= 0;
                            const cur = holding.currency || 'USD';
                            return (
                                <tr key={holding.id} onClick={() => onEdit(holding)} style={{ borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}>
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
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                            <button onClick={e => { e.stopPropagation(); onEdit(holding); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: colors.text, display: 'flex', alignItems: 'center' }} title="Edit holding">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); onDelete(holding.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: colors.accent, display: 'flex', alignItems: 'center' }} title="Remove holding">
                                                <X size={16} />
                                            </button>
                                        </div>
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
};

export default YahooHoldingsTable;
