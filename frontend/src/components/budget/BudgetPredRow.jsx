import React, { memo } from 'react';
import { trendArrow, confidenceLabel } from '../../utils/forecastHelpers';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

export const PredRow = memo(({ p, idx, isLast }) => {
    const isIncome = p.type === 'income';
    const trend    = trendArrow(p.trend);
    const conf     = confidenceLabel(p.confidence);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 16px',
            borderBottom: isLast ? 'none' : '1px dashed #ddd',
            fontSize: '0.82rem',
            opacity: 0.85,
            background: idx % 2 === 0 ? '#fff' : '#fafafa',
        }}>
            <div style={{ width: 75, flexShrink: 0, fontWeight: 600, color: SYS.light, fontSize: '0.76rem' }}>
                {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.description}
            </div>
            <div style={{
                width: 44, textAlign: 'center', fontSize: '0.63rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.2px',
                color: p.source === 'bank' ? '#6b7280' : SYS.primary,
            }}>
                {p.source}
            </div>
            <span style={{ flexShrink: 0, fontWeight: 800, color: trend.color, fontSize: '0.82rem' }}
                title={`${trend.label} · ${conf.text} confidence`}>
                {trend.symbol}
            </span>
            <div style={{ width: 90, textAlign: 'right', fontWeight: 800,
                color: isIncome ? SYS.success : SYS.accent, flexShrink: 0 }}>
                {isIncome ? '+' : '−'}{fmt(p.amount)}
            </div>
            <div style={{ width: 100, textAlign: 'right', fontWeight: 700, flexShrink: 0,
                color: p.running_balance >= 0 ? SYS.primary : SYS.accent }}>
                {p.running_balance >= 0 ? '' : '−'}{fmt(p.running_balance)}
            </div>
        </div>
    );
});

export default PredRow;
