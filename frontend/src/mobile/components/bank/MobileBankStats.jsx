import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME, BAUHAUS } from '../../theme';
import AnimatedNumber from '../AnimatedNumber';

const MobileBankStats = ({ stats, transactions, chartData, PIE_COLORS }) => {
    const pieSlices = useMemo(() => {
        if (!chartData || chartData.sortedCategories.length === 0) return null;
        const { sortedCategories, totalAmount } = chartData;
        let currentAngle = 0;
        return sortedCategories.map(([category, data], idx) => {
            const percentage = totalAmount !== 0 ? (data.total / totalAmount) * 100 : 0;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 90 * Math.cos(startRad);
            const y1 = 100 + 90 * Math.sin(startRad);
            const x2 = 100 + 90 * Math.cos(endRad);
            const y2 = 100 + 90 * Math.sin(endRad);
            const largeArc = angle > 180 ? 1 : 0;
            const pathData = [`M 100 100`, `L ${x1} ${y1}`, `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`, `Z`].join(' ');
            let label = null;
            if (percentage > 8) {
                const midAngle = (startAngle + endAngle) / 2;
                const midRad = (midAngle - 90) * (Math.PI / 180);
                const labelX = 100 + 55 * Math.cos(midRad);
                const labelY = 100 + 55 * Math.sin(midRad);
                label = (
                    <text key={`lbl-${category}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="700">
                        {percentage.toFixed(0)}%
                    </text>
                );
            }
            return { category, data, idx, pathData, percentage, label };
        });
    }, [chartData, PIE_COLORS]);

    const totalAmount = stats?.by_type
        ? stats.by_type.reduce((s, t) => s + (Number(t.total_amount) || 0), 0)
        : 0;

    return (
        <>
            {/* Summary Bar */}
            {stats && stats.by_type && (
                <div style={{
                    padding: '16px 20px',
                    background: '#fff',
                    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 500, color: THEME.muted, marginBottom: 2 }}>
                            Total
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#000' }}>
                            <AnimatedNumber value={totalAmount} formatter={formatCurrency} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: THEME.muted, fontWeight: 400 }}>
                        {transactions.length} transactions
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            {stats && stats.by_type && (
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {stats.by_type.map(stat => (
                        <div key={stat.transaction_type} style={{
                            borderRadius: 16,
                            padding: '16px',
                            background: '#fff',
                            textAlign: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                        }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px', color: '#000' }}>
                                <AnimatedNumber
                                    value={Number(stat.total_amount) || 0}
                                    formatter={formatCurrency}
                                />
                            </div>
                            <div style={{ fontSize: BAUHAUS.labelFontSize, color: THEME.muted, fontWeight: 500 }}>
                                {stat.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: THEME.muted, marginTop: '4px' }}>
                                {stat.transaction_count} transactions
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expense Distribution */}
            {pieSlices && (
                <div style={{ margin: '0 16px 16px', borderRadius: 16, padding: '16px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginBottom: 12, paddingBottom: 10,
                        borderBottom: '1px solid rgba(0,0,0,0.06)'
                    }}>
                        <PieChart size={16} color={THEME.primary} />
                        <h2 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#000' }}>
                            Expense distribution (top 5)
                        </h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <svg viewBox="0 0 200 200" style={{ width: '160px', height: '160px', flexShrink: 0 }}>
                            {pieSlices.map(({ category, idx, pathData, label }) => (
                                <g key={category}>
                                    <path d={pathData} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                                    {label}
                                </g>
                            ))}
                        </svg>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                            {pieSlices.map(({ category, data, idx, percentage }, i) => (
                                <div key={category} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 4px',
                                    borderBottom: i < pieSlices.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none',
                                    fontSize: '0.78rem'
                                }}>
                                    <div style={{
                                        width: '10px', height: '10px',
                                        background: PIE_COLORS[idx % PIE_COLORS.length],
                                        borderRadius: 3, flexShrink: 0
                                    }} />
                                    <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category}</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(data.total)}</span>
                                    <span style={{ color: THEME.muted, minWidth: 28, textAlign: 'right' }}>{percentage.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileBankStats;
