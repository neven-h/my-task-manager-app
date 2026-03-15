import React from 'react';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const MiniChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const H = 90, BOTTOM = 18;
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const plotH  = H - BOTTOM;
    const total  = allMonths.length;
    const bw     = 100 / total;
    const gap    = bw * 0.22;

    return (
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
            style={{ display: 'block' }}>
            {allMonths.map((m, i) => {
                const x    = i * bw + gap / 2;
                const bwI  = bw - gap;
                const barH = plotH * (m.total / maxVal);
                const y    = plotH - barH;
                const isPred = m.type === 'predicted';
                const fill = isPred
                    ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(48,176,199,0.45)')
                    : IOS.teal;
                return (
                    <g key={`${m.month}-${i}`}>
                        <rect x={x} y={y} width={bwI} height={barH} fill={fill} rx="1"
                            strokeDasharray={isPred ? '1,0.8' : 'none'}
                            stroke={isPred ? fill : 'none'} strokeWidth="0.4" opacity={isPred ? 0.9 : 1} />
                        <text x={x + bwI / 2} y={H - 2} textAnchor="middle" fontSize="4" fill={IOS.label}>
                            {fmtM(m.month).split(' ')[0]}
                        </text>
                    </g>
                );
            })}
            {predicted_monthly.length > 0 && monthly_history.length > 0 && (
                <line x1={monthly_history.length * bw} y1={0}
                    x2={monthly_history.length * bw} y2={plotH}
                    stroke={IOS.teal} strokeWidth="0.6" strokeDasharray="1.5,1" />
            )}
        </svg>
    );
};

export { MiniChart };
export default MiniChart;
