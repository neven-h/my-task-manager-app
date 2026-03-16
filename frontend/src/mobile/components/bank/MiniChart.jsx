import React from 'react';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
};

const MiniChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const total  = allMonths.length;

    const barW = 22, barGap = 4, TOP = 4, BOTTOM = 22;
    const chartW = total * (barW + barGap) + barGap;
    const W = chartW;
    const H = 110;
    const plotH = H - BOTTOM - TOP;

    return (
        <div style={{ overflowX: total > 8 ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
            <svg width={Math.max(W, 280)} height={H} style={{ display: 'block' }}>
                {allMonths.map((m, i) => {
                    const x    = barGap + i * (barW + barGap);
                    const barH = plotH * (m.total / maxVal);
                    const y    = TOP + plotH - barH;
                    const isPred = m.type === 'predicted';
                    const fill = isPred
                        ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(48,176,199,0.45)')
                        : IOS.teal;
                    return (
                        <g key={`${m.month}-${i}`}>
                            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx="4"
                                strokeDasharray={isPred ? '4,3' : 'none'}
                                stroke={isPred ? fill : 'none'} strokeWidth="1" opacity={isPred ? 0.9 : 1} />
                            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill={IOS.label} fontFamily="inherit">
                                {fmtM(m.month)}
                            </text>
                        </g>
                    );
                })}
                {predicted_monthly.length > 0 && monthly_history.length > 0 && (
                    <line x1={barGap + monthly_history.length * (barW + barGap) - barGap / 2} y1={TOP}
                        x2={barGap + monthly_history.length * (barW + barGap) - barGap / 2} y2={TOP + plotH}
                        stroke={IOS.teal} strokeWidth="1.5" strokeDasharray="4,3" />
                )}
            </svg>
        </div>
    );
};

export { MiniChart };
export default MiniChart;
