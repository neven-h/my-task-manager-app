import React from 'react';
import { fmtAxis } from './SpendingChart';

const fmtM = (ym) => {
    if (ym === 'Now') return 'Now';
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
};

const fmtBal = (n) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (abs >= 1_000_000) return `${sign}₪${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}₪${Math.round(abs / 1000)}k`;
    return `${sign}₪${Math.round(abs)}`;
};

/**
 * BalanceRunwayChart — replaces the spending bar chart.
 *
 * Shows projected account balance as a line/area chart:
 *   - Starts at `startingBalance` ("Now")
 *   - Drops each month by predicted_monthly[i].total × (1 + adjust/100)
 *   - Blue area above zero, red area below zero
 *   - Dashed red zero-line when balance could go negative
 *   - End balance labelled at the final point
 */
export const BalanceRunwayChart = ({ startingBalance, predicted_monthly, adjust }) => {
    if (startingBalance == null) {
        return (
            <div style={{
                padding: '28px 20px',
                textAlign: 'center',
                borderTop: '2px solid #000',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                background: '#fafafa',
            }}>
                Set your account balance above to see your projected runway
            </div>
        );
    }

    if (!predicted_monthly?.length) {
        return (
            <div style={{
                padding: '28px 20px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
            }}>
                No forecast data available
            </div>
        );
    }

    // ── Build series ────────────────────────────────────────────────────────
    const factor = 1 + adjust / 100;
    let bal = startingBalance;
    const points = [{ month: 'Now', balance: startingBalance }];
    for (const m of predicted_monthly) {
        bal = Math.round((bal - m.total * factor) * 100) / 100;
        points.push({ month: m.month, balance: bal });
    }

    const balances = points.map(p => p.balance);
    const minBal   = Math.min(...balances);
    const maxBal   = Math.max(...balances);

    // Y-range always includes 0 and the starting balance
    const yMin = Math.min(0, minBal) * 1.18;
    const yMax = Math.max(startingBalance, maxBal) * 1.15 || 1000;
    const yRange = yMax - yMin || 1;

    // ── SVG dimensions ──────────────────────────────────────────────────────
    const H       = 220;
    const LEFT    = 58;
    const BOTTOM  = 28;
    const TOP     = 16;
    const RIGHT   = 20;
    const W       = 560;   // viewBox width; scales to container via preserveAspectRatio
    const plotW   = W - LEFT - RIGHT;
    const plotH   = H - TOP - BOTTOM;

    const toX = (i) => LEFT + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const toY = (b) => TOP + plotH - ((b - yMin) / yRange) * plotH;

    const zeroY = toY(0);

    // ── Build path strings ──────────────────────────────────────────────────
    const linePoints = points.map((p, i) => `${toX(i)},${toY(p.balance)}`).join(' ');

    // Area fill: close the polygon along the bottom (at plotH + TOP, which is the baseline)
    const areaPath =
        `M ${toX(0)},${toY(points[0].balance)} ` +
        points.slice(1).map((p, i) => `L ${toX(i + 1)},${toY(p.balance)}`).join(' ') +
        ` L ${toX(points.length - 1)},${TOP + plotH} L ${toX(0)},${TOP + plotH} Z`;

    // Find first depletion point
    const depletionIdx = points.findIndex((p, i) => i > 0 && p.balance < 0);
    const goesNegative = depletionIdx !== -1;

    // ── Y-axis tick values ──────────────────────────────────────────────────
    const yTicks = [0, 0.5, 1].map(pct => yMin + yRange * pct);

    const clipAboveId = `clip-above-${Math.random().toString(36).slice(2, 7)}`;
    const clipBelowId = `clip-below-${Math.random().toString(36).slice(2, 7)}`;

    const endPt = points[points.length - 1];
    const endX  = toX(points.length - 1);
    const endY  = toY(endPt.balance);

    return (
        <div style={{ overflowX: 'visible' }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
            >
                <defs>
                    {/* Clip above zero */}
                    <clipPath id={clipAboveId}>
                        <rect x={LEFT} y={TOP} width={plotW} height={Math.max(0, zeroY - TOP)} />
                    </clipPath>
                    {/* Clip below zero */}
                    <clipPath id={clipBelowId}>
                        <rect x={LEFT} y={zeroY} width={plotW} height={Math.max(0, TOP + plotH - zeroY)} />
                    </clipPath>
                </defs>

                {/* ── Grid lines + Y-axis labels ── */}
                {yTicks.map((val, ti) => {
                    const y = toY(val);
                    if (y < TOP || y > TOP + plotH) return null;
                    return (
                        <g key={ti}>
                            <line
                                x1={LEFT} y1={y} x2={W - RIGHT} y2={y}
                                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"
                            />
                            <text
                                x={LEFT - 6} y={y + 4}
                                textAnchor="end" fontSize="11" fill="#555" fontFamily="inherit"
                                style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                            >
                                {fmtAxis(val)}
                            </text>
                        </g>
                    );
                })}

                {/* ── Baseline ── */}
                <line
                    x1={LEFT} y1={TOP + plotH} x2={W - RIGHT} y2={TOP + plotH}
                    stroke="#000" strokeWidth="1.5"
                />

                {/* ── Zero line (only when balance may go negative) ── */}
                {goesNegative && zeroY > TOP && zeroY < TOP + plotH && (
                    <line
                        x1={LEFT} y1={zeroY} x2={W - RIGHT} y2={zeroY}
                        stroke="#FF0000" strokeWidth="1.5" strokeDasharray="5,3"
                        opacity="0.7"
                    />
                )}

                {/* ── Area above zero (blue) ── */}
                <path
                    d={areaPath}
                    fill="rgba(0,0,255,0.07)"
                    clipPath={`url(#${clipAboveId})`}
                />

                {/* ── Area below zero (red) ── */}
                {goesNegative && (
                    <path
                        d={areaPath}
                        fill="rgba(255,0,0,0.10)"
                        clipPath={`url(#${clipBelowId})`}
                    />
                )}

                {/* ── Line ── */}
                <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#0000FF"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />

                {/* ── Dots ── */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={toX(i)} cy={toY(p.balance)}
                        r="4"
                        fill={p.balance < 0 ? '#FF0000' : '#0000FF'}
                        stroke="#fff" strokeWidth="1.5"
                    />
                ))}

                {/* ── "DEPLETED" badge at first negative point ── */}
                {goesNegative && (() => {
                    const dp = points[depletionIdx];
                    const dx = toX(depletionIdx);
                    const dy = toY(dp.balance);
                    const bW = 62, bH = 16;
                    const bX = Math.min(dx - bW / 2, W - RIGHT - bW);
                    const bY = Math.max(dy - bH - 6, TOP);
                    return (
                        <g>
                            <rect x={bX} y={bY} width={bW} height={bH} fill="#FF0000" />
                            <text
                                x={bX + bW / 2} y={bY + 11}
                                textAnchor="middle" fontSize="9"
                                fill="#fff" fontWeight="800" fontFamily="inherit"
                                style={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}
                            >
                                DEPLETED
                            </text>
                        </g>
                    );
                })()}

                {/* ── "Now" badge at first point ── */}
                {(() => {
                    const startX = toX(0);
                    const startY = toY(startingBalance);
                    const bW = 32, bH = 16;
                    return (
                        <g>
                            <rect x={startX - bW / 2} y={startY - bH - 6} width={bW} height={bH} fill="#000" />
                            <text
                                x={startX} y={startY - bH - 6 + 11}
                                textAnchor="middle" fontSize="9"
                                fill="#fff" fontWeight="800" fontFamily="inherit"
                                style={{ letterSpacing: '0.3px' }}
                            >
                                NOW
                            </text>
                        </g>
                    );
                })()}

                {/* ── End balance label ── */}
                {(() => {
                    const labelColor = endPt.balance >= 0 ? '#059669' : '#dc2626';
                    const labelText  = fmtBal(endPt.balance);
                    // Place label to the left if close to right edge
                    const anchor = endX > W - RIGHT - 60 ? 'end' : 'start';
                    const lx = anchor === 'end' ? endX - 8 : endX + 8;
                    const ly = Math.max(endY - 10, TOP + 14);
                    return (
                        <text
                            x={lx} y={ly}
                            textAnchor={anchor}
                            fontSize="13" fontWeight="900"
                            fill={labelColor} fontFamily="inherit"
                            style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                        >
                            {labelText}
                        </text>
                    );
                })()}

                {/* ── X-axis month labels ── */}
                {points.map((p, i) => (
                    <text
                        key={i}
                        x={toX(i)} y={H - 6}
                        textAnchor="middle" fontSize="11" fill="#000" fontFamily="inherit"
                    >
                        {fmtM(p.month)}
                    </text>
                ))}
            </svg>
        </div>
    );
};

export default BalanceRunwayChart;
