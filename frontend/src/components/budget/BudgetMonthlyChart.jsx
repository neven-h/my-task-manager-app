import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const SYS = { border: '#000', light: '#666' };
const GREEN = '#00AA00';
const RED = '#FF0000';
const BAR_HEIGHT = 140;
const TOP_PAD = 20; // space above bars for value labels

const abbr = (n) => n >= 1000 ? Math.round(n / 1000) + 'K' : Math.round(n);

const BudgetMonthlyChart = ({ monthlyTotals }) => {
    if (!monthlyTotals || monthlyTotals.length < 2) return null;

    const recent = monthlyTotals.slice(-12);
    const maxVal = Math.max(...recent.flatMap(([, d]) => [d.income, d.expense]), 1);

    const barW = Math.min(32, Math.floor(600 / recent.length / 2.5));
    const gapW = Math.max(barW, 16);
    const SVG_H = TOP_PAD + BAR_HEIGHT + 30; // 30px for month label below axis

    return (
        <div style={{ background: '#fff', border: `2px solid ${SYS.border}`, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={18} color="#0000FF" /> Monthly Income vs Expenses
            </h3>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: GREEN, marginRight: 10 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: GREEN, border: `1px solid ${SYS.border}`, verticalAlign: -1, marginRight: 3 }} />
                    Income
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: RED }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: RED, border: `1px solid ${SYS.border}`, verticalAlign: -1, marginRight: 3 }} />
                    Expenses
                </span>
            </div>
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <svg width={recent.length * (gapW * 2 + barW * 2 + 4) + 16} height={SVG_H} style={{ display: 'block' }}>
                    {recent.map(([month, data], i) => {
                        const x = i * (gapW * 2 + barW * 2 + 4) + 8;
                        const incH = (data.income / maxVal) * BAR_HEIGHT;
                        const expH = (data.expense / maxVal) * BAR_HEIGHT;
                        // Bar top-y positions (shifted down by TOP_PAD)
                        const incY = TOP_PAD + BAR_HEIGHT - incH;
                        const expY = TOP_PAD + BAR_HEIGHT - expH;
                        const axisY = TOP_PAD + BAR_HEIGHT;
                        const incX = x + barW / 2;
                        const expX = x + barW + 2 + barW / 2;
                        const [y, m] = month.split('-');
                        const label = new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
                        return (
                            <g key={month}>
                                <rect x={x} y={incY} width={barW} height={incH} fill={GREEN} stroke="#000" strokeWidth="1.5" />
                                <rect x={x + barW + 2} y={expY} width={barW} height={expH} fill={RED} stroke="#000" strokeWidth="1.5" />
                                {/* Month label below axis */}
                                <text x={x + barW} y={axisY + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill={SYS.light}>{label}</text>
                                {/* Abbreviated value labels above bars */}
                                {incH > 12 && (
                                    <text x={incX} y={incY - 4} textAnchor="middle" fontSize="9" fontWeight="800" fill={GREEN}>
                                        {abbr(data.income)}
                                    </text>
                                )}
                                {expH > 12 && (
                                    <text x={expX} y={expY - 4} textAnchor="middle" fontSize="9" fontWeight="800" fill={RED}>
                                        {abbr(data.expense)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <line x1="0" y1={TOP_PAD + BAR_HEIGHT} x2="100%" y2={TOP_PAD + BAR_HEIGHT} stroke={SYS.border} strokeWidth="2" />
                </svg>
            </div>
            {/* Summary row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                {recent.length > 0 && (() => {
                    const last = recent[recent.length - 1][1];
                    const net = last.income - last.expense;
                    return (
                        <>
                            <span>Latest: <span style={{ color: GREEN }}>+{formatCurrency(last.income)}</span></span>
                            <span><span style={{ color: RED }}>-{formatCurrency(last.expense)}</span></span>
                            <span>Net: <span style={{ color: net >= 0 ? GREEN : RED, fontWeight: 800 }}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</span></span>
                        </>
                    );
                })()}
            </div>
        </div>
    );
};

export default React.memo(BudgetMonthlyChart);
