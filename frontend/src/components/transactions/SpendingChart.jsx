import React from 'react';

const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
};

// Compact axis label — avoids locale RTL issues in SVG text
export const fmtAxis = (n) => {
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `₪${Math.round(n / 1000)}k`;
    return `₪${Math.round(n)}`;
};

export const SpendingChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const total  = allMonths.length;

    // Use pixel-based sizing for readable text
    const LEFT = 52, BOTTOM = 28, TOP = 8, RIGHT = 8;
    const barW = 36, barGap = 8;
    const chartW = total * (barW + barGap) + barGap;
    const W = LEFT + chartW + RIGHT;
    const H = 260;
    const plotH = H - BOTTOM - TOP;

    const scrollable = allMonths.length > 10;

    return (
        <div style={{ overflowX: scrollable ? 'auto' : 'visible', margin: '0 -4px', padding: '0 4px' }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width={scrollable ? W : '100%'}
                height={scrollable ? H : undefined}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
            >
                {/* Grid lines + axis labels */}
                {[0.33, 0.67, 1].map(pct => {
                    const y = TOP + plotH * (1 - pct);
                    return (
                        <g key={pct}>
                            <line x1={LEFT} y1={y} x2={W - RIGHT} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
                            <text x={LEFT - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af" fontFamily="inherit"
                                style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                                {fmtAxis(maxVal * pct)}
                            </text>
                        </g>
                    );
                })}
                {/* Baseline */}
                <line x1={LEFT} y1={TOP + plotH} x2={W - RIGHT} y2={TOP + plotH} stroke="#e5e7eb" strokeWidth="1" />

                {/* Bars + month labels */}
                {allMonths.map((m, i) => {
                    const x    = LEFT + barGap + i * (barW + barGap);
                    const barH = plotH * (m.total / maxVal);
                    const y    = TOP + plotH - barH;
                    const isPred = m.type === 'predicted';
                    const fill = isPred
                        ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(13,148,136,0.4)')
                        : '#0d9488';
                    return (
                        <g key={`${m.month}-${i}`}>
                            {isPred && (
                                <rect x={x} y={TOP} width={barW} height={plotH} fill="rgba(0,0,0,0.02)" />
                            )}
                            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx="3"
                                stroke={isPred ? fill : 'none'} strokeWidth="1"
                                strokeDasharray={isPred ? '4,3' : 'none'}
                                opacity={isPred ? 0.85 : 1} />
                            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6b7280" fontFamily="inherit">
                                {fmtM(m.month)}
                            </text>
                        </g>
                    );
                })}

                {/* Forecast divider line */}
                {predicted_monthly.length > 0 && monthly_history.length > 0 && (() => {
                    const divX = LEFT + barGap + monthly_history.length * (barW + barGap) - barGap / 2;
                    return (
                        <>
                            <line x1={divX} y1={TOP} x2={divX} y2={TOP + plotH}
                                stroke="#0d9488" strokeWidth="1.5" strokeDasharray="5,3" />
                            <text x={divX + 4} y={TOP + 12} fontSize="11" fill="#0d9488" fontWeight="700" fontFamily="inherit">
                                Forecast →
                            </text>
                        </>
                    );
                })()}
            </svg>
        </div>
    );
};

export default SpendingChart;
