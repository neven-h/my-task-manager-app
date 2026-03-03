import React from 'react';
import { PieChart } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME, BAUHAUS } from '../../theme';

const MobileBankStats = ({ stats, transactions, chartData, PIE_COLORS }) => {
    return (
        <>
            {/* Summary Bar */}
            {stats && stats.by_type && (
                <div style={{
                    padding: '16px',
                    background: BAUHAUS.cardSecondaryBg,
                    borderBottom: BAUHAUS.cardBorder,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted}}>
                            Total
                        </div>
                        <div style={{fontSize: '1.5rem', fontWeight: 900}}>
                            {formatCurrency(stats.by_type.reduce((s, t) => s + (Number(t.total_amount) || 0), 0))}
                        </div>
                    </div>
                    <div style={{fontSize: BAUHAUS.labelFontSize, color: THEME.muted, fontWeight: BAUHAUS.labelWeight}}>
                        {transactions.length} transactions
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {stats && stats.by_type && (
                <div style={{padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    {stats.by_type.map(stat => (
                        <div key={stat.transaction_type} style={{
                            border: BAUHAUS.cardBorder,
                            padding: '16px',
                            background: BAUHAUS.cardBg,
                            textAlign: 'center'
                        }}>
                            <div style={{fontSize: '1.5rem', fontWeight: BAUHAUS.headingWeight, marginBottom: '4px'}}>
                                {formatCurrency(stat.total_amount || 0)}
                            </div>
                            <div style={{fontSize: BAUHAUS.labelFontSize, color: THEME.muted, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase'}}>
                                {stat.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                            </div>
                            <div style={{fontSize: '0.75rem', color: THEME.muted, marginTop: '4px'}}>
                                {stat.transaction_count} transactions
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expense Distribution */}
            {chartData && chartData.sortedCategories.length > 0 && (() => {
                const { sortedCategories, totalAmount } = chartData;
                return (
                    <div style={{margin: '0 16px 16px', border: BAUHAUS.cardBorder, padding: '16px', background: BAUHAUS.cardBg}}>
                        <h2 style={{
                            margin: '0 0 10px 0',
                            fontSize: BAUHAUS.labelFontSize,
                            fontWeight: BAUHAUS.labelWeight,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <PieChart size={20} color={THEME.primary} />
                            Expense distribution (top 5)
                        </h2>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'}}>
                            <svg viewBox="0 0 200 200" style={{width: '160px', height: '160px', flexShrink: 0}}>
                                {(() => {
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
                                        return (
                                            <g key={category}>
                                                <path d={pathData} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="#000" strokeWidth="2" />
                                                {percentage > 8 && (() => {
                                                    const midAngle = (startAngle + endAngle) / 2;
                                                    const midRad = (midAngle - 90) * (Math.PI / 180);
                                                    const labelX = 100 + 55 * Math.cos(midRad);
                                                    const labelY = 100 + 55 * Math.sin(midRad);
                                                    return (
                                                        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="800" style={{textShadow: '0 1px 2px rgba(0,0,0,0.8)'}}>
                                                            {percentage.toFixed(0)}%
                                                        </text>
                                                    );
                                                })()}
                                            </g>
                                        );
                                    });
                                })()}
                            </svg>
                            <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                {sortedCategories.map(([category, data], idx) => {
                                    const percentage = totalAmount !== 0 ? ((data.total / totalAmount) * 100) : 0;
                                    return (
                                        <div key={category} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            border: BAUHAUS.subCardBorder,
                                            background: BAUHAUS.cardSecondaryBg,
                                            fontSize: '0.75rem'
                                        }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                background: PIE_COLORS[idx % PIE_COLORS.length],
                                                border: '1px solid #000',
                                                flexShrink: 0
                                            }} />
                                            <span style={{flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{category}</span>
                                            <span style={{fontWeight: 800}}>{formatCurrency(data.total)}</span>
                                            <span style={{color: THEME.muted}}>{percentage.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default MobileBankStats;
