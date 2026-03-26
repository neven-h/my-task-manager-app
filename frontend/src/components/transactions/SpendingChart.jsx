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

    const LEFT = 52, BOTTOM = 28, TOP = 8, RIGHT = 8;
    const barW = 36, barGap = 8;
    const chartW = total * (barW + barGap) + barGap;
    const W = LEFT + chartW + RIGHT;
    const H = 260;
    const plotH = H - BOTTOM - TOP;

    const scrollable = allMonths.length > 10;

    // Forecast divider x position
    const divX = monthly_history.length > 0 && predicted_monthly.length > 0
        ? LEFT + barGap + monthly_history.length * (barW + barGap) - barGap / 2
        : null;

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
                            <line x1={LEFT} y1={y} x2={W - RIGHT} y2={y} stroke="#ddd" strokeWidth="1" strokeDasharray="3,3" />
                            <text x={LEFT - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#000" fontFamily="inherit"
                                style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                                {fmtAxis(maxVal * pct)}
                            </text>
                        </g>
                    );
                })}
                {/* Baseline */}
                <line x1={LEFT} y1={TOP + plotH} x2={W - RIGHT} y2={TOP + plotH} stroke="#000" strokeWidth="1.5" />

                {/* Bars + month labels */}
                {allMonths.map((m, i) => {
                    const x    = LEFT + barGap + i * (barW + barGap);
                    const barH = plotH * (m.total / maxVal);
                    const y    = TOP + plotH - barH;
                    const isPred = m.type === 'predicted';
                    const fill = isPred
                        ? (adjust < 0 ? '#00AA00' : adjust > 0 ? '#FF0000' : 'rgba(0,0,255,0.3)')
                        : '#0000FF';
                    return (
                        <g key={`${m.month}-${i}`}>
                            {isPred && (
                                <rect x={x} y={TOP} width={barW} height={plotH} fill="rgba(0,0,0,0.02)" />
                            )}
                            <rect
                                x={x} y={y} width={barW} height={barH}
                                fill={fill} rx="0"
                                opacity={isPred ? 0.85 : 1}
                            />
                            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#000" fontFamily="inherit">
                                {fmtM(m.month)}
                            </text>
                        </g>
                    );
                })}

                {/* Forecast divider — black dashed line + badge label */}
                {divX != null && (() => {
                    const labelText = 'Forecast';
                    const labelW = 58;
                    const labelH = 16;
                    const labelX = divX + 4;
                    const labelY = TOP + 4;
                    return (
                        <>
                            <line
                                x1={divX} y1={TOP} x2={divX} y2={TOP + plotH}
                                stroke="#000" strokeWidth="1.5" strokeDasharray="5,3"
                            />
                            <rect x={labelX} y={labelY} width={labelW} height={labelH} fill="#000" />
                            <text
                                x={labelX + labelW / 2} y={labelY + 11}
                                textAnchor="middle"
                                fontSize="10" fill="#fff" fontWeight="700" fontFamily="inherit"
                                style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}
                            >
                                {labelText} →
                            </text>
                        </>
                    );
                })()}
            </svg>
        </div>
    );
};

export default SpendingChart;
