import React from 'react';

const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// Compact axis label — avoids locale RTL issues in SVG text
export const fmtAxis = (n) => {
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `₪${Math.round(n / 1000)}k`;
    return `₪${Math.round(n)}`;
};

export const SpendingChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const H = 150, LEFT = 36, BOTTOM = 26;
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const plotH  = H - BOTTOM;
    const total  = allMonths.length;
    const bw     = (100 - LEFT) / total;
    const gap    = bw * 0.22;

    return (
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}>
            {[0.33, 0.67, 1].map(pct => {
                const y = plotH * (1 - pct);
                return (
                    <g key={pct}>
                        <line x1={LEFT} y1={y} x2={100} y2={y} stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="1,1" />
                        <text x={LEFT - 1} y={y + 1.5} textAnchor="end" fontSize="3.2" fill="#9ca3af"
                            style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                            {fmtAxis(maxVal * pct)}
                        </text>
                    </g>
                );
            })}

            {allMonths.map((m, i) => {
                const x    = LEFT + i * bw + gap / 2;
                const bwI  = bw - gap;
                const barH = plotH * (m.total / maxVal);
                const y    = plotH - barH;
                const isPred = m.type === 'predicted';
                const fill = isPred
                    ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(13,148,136,0.4)')
                    : '#0d9488';
                return (
                    <g key={`${m.month}-${i}`}>
                        {isPred && (
                            <rect x={x} y={0} width={bwI} height={plotH} fill="rgba(0,0,0,0.02)" />
                        )}
                        <rect x={x} y={y} width={bwI} height={barH} fill={fill} rx="0.8"
                            stroke={isPred ? fill : 'none'} strokeWidth="0.3"
                            strokeDasharray={isPred ? '1,0.8' : 'none'}
                            opacity={isPred ? 0.85 : 1} />
                        <text x={x + bwI / 2} y={H - 1} textAnchor="middle" fontSize="3.2" fill="#6b7280">
                            {fmtM(m.month).split(' ')[0]}
                        </text>
                    </g>
                );
            })}

            {predicted_monthly.length > 0 && monthly_history.length > 0 && (() => {
                const divX = LEFT + monthly_history.length * bw;
                return (
                    <>
                        <line x1={divX} y1={0} x2={divX} y2={plotH}
                            stroke="#0d9488" strokeWidth="0.5" strokeDasharray="1.5,1" />
                        <text x={divX + 0.8} y={5} fontSize="3" fill="#0d9488" fontWeight="700">
                            Forecast →
                        </text>
                    </>
                );
            })()}
        </svg>
    );
};

export default SpendingChart;
