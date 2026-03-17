import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { FONT_STACK } from '../../../ios/theme';

const IOS = { card: '#fff', muted: '#8E8E93', radius: 16 };
const GREEN = '#34C759';
const RED = '#FF3B30';
const TOP_PAD = 18;

const abbr = (n) => n >= 1000 ? Math.round(n / 1000) + 'K' : Math.round(n);

const MobileBudgetMonthlyChart = ({ monthlyTotals }) => {
    if (!monthlyTotals || monthlyTotals.length < 2) return null;

    const recent = monthlyTotals.slice(-8);
    const maxVal = Math.max(...recent.flatMap(([, d]) => [d.income, d.expense]), 1);
    const barH = 100;
    const barW = 14;
    const groupW = barW * 2 + 6;
    const gap = Math.max(20, Math.floor((window.innerWidth - 64) / recent.length) - groupW);
    const SVG_H = TOP_PAD + barH + 28;

    return (
        <div style={{ margin: '0 16px 12px', background: IOS.card, borderRadius: IOS.radius, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontFamily: FONT_STACK }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <BarChart3 size={18} color="#007AFF" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Monthly Overview</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: GREEN, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: GREEN, display: 'inline-block' }} /> Income
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: RED, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: RED, display: 'inline-block' }} /> Expenses
                </span>
            </div>
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <svg width={recent.length * (groupW + gap) + 8} height={SVG_H} style={{ display: 'block' }}>
                    {recent.map(([month, data], i) => {
                        const x = i * (groupW + gap) + 4;
                        const incH = (data.income / maxVal) * barH;
                        const expH = (data.expense / maxVal) * barH;
                        const incY = TOP_PAD + barH - incH;
                        const expY = TOP_PAD + barH - expH;
                        const axisY = TOP_PAD + barH;
                        const incX = x + barW / 2;
                        const expX = x + barW + 2 + barW / 2;
                        const [y, m] = month.split('-');
                        const label = new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
                        return (
                            <g key={month}>
                                <rect x={x} y={incY} width={barW} height={incH} rx="3" fill={GREEN} />
                                <rect x={x + barW + 2} y={expY} width={barW} height={expH} rx="3" fill={RED} />
                                {/* Month label below axis */}
                                <text x={x + groupW / 2} y={axisY + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill={IOS.muted}>{label}</text>
                                {/* Abbreviated value labels above bars */}
                                {incH > 10 && (
                                    <text x={incX} y={incY - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={GREEN}>
                                        {abbr(data.income)}
                                    </text>
                                )}
                                {expH > 10 && (
                                    <text x={expX} y={expY - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={RED}>
                                        {abbr(data.expense)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <line x1="0" y1={TOP_PAD + barH} x2="100%" y2={TOP_PAD + barH} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                </svg>
            </div>
            {recent.length > 0 && (() => {
                const last = recent[recent.length - 1][1];
                const net = last.income - last.expense;
                return (
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: '0.78rem', fontWeight: 600 }}>
                        <span style={{ color: GREEN }}>+{formatCurrency(last.income)}</span>
                        <span style={{ color: RED }}>-{formatCurrency(last.expense)}</span>
                        <span style={{ color: net >= 0 ? GREEN : RED, fontWeight: 700 }}>Net: {net >= 0 ? '+' : ''}{formatCurrency(net)}</span>
                    </div>
                );
            })()}
        </div>
    );
};

export default React.memo(MobileBudgetMonthlyChart);
