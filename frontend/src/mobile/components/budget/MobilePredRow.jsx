import React, { memo } from 'react';
import { trendArrow } from '../../../utils/forecastHelpers';

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0.00';
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
};

const PredRow = memo(({ p, isLast }) => {
    const isIncome = p.type === 'income';
    const trend    = trendArrow(p.trend);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
            opacity: 0.88,
        }}>
            <div style={{
                width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: isIncome ? IOS.green : IOS.red,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                </div>
                <div style={{ fontSize: '0.7rem', color: IOS.muted, marginTop: 1 }}>
                    {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    {' · '}
                    <span style={{ color: p.source === 'bank' ? IOS.muted : IOS.blue }}>{p.source}</span>
                </div>
            </div>
            <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '0.78rem', color: trend.color }}>
                {trend.symbol}
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', flexShrink: 0,
                color: isIncome ? IOS.green : IOS.red }}>
                {isIncome ? '+' : '−'}₪{fmt(p.amount)}
            </div>
            <div style={{
                fontWeight: 600, fontSize: '0.8rem', flexShrink: 0, width: 70, textAlign: 'right',
                color: p.running_balance >= 0 ? IOS.blue : IOS.red,
            }}>
                {p.running_balance >= 0 ? '' : '−'}₪{fmt(p.running_balance)}
            </div>
        </div>
    );
});

export { PredRow };
export default PredRow;
