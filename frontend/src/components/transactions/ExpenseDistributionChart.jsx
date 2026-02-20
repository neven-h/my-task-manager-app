import React from 'react';
import { PieChart } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const PIE_COLORS = [
    '#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF6B35',
    '#7B2CBF', '#06D6A0', '#F72585', '#4361EE', '#F77F00'
];

const ExpenseDistributionChart = () => {
    const { chartData, colors } = useBankTransactionContext();

    if (!chartData || chartData.sortedCategories.length === 0) return null;

    const { sortedCategories, totalAmount } = chartData;

    return (
        <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
            padding: '1.5rem',
            marginBottom: '2rem'
        }}>
            <h2 style={{
                margin: '0 0 1.25rem 0',
                fontSize: '1.5rem',
                fontWeight: '800',
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <PieChart size={28} color={colors.primary} />
                Expense Distribution
                <span style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: colors.textLight,
                    textTransform: 'none',
                    marginLeft: '0.25rem'
                }}>
                    (Top 5 Categories)
                </span>
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '2rem',
                alignItems: 'start'
            }}>
                {/* Pie Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '300px', height: 'auto' }}>
                        {(() => {
                            let currentAngle = 0;
                            return sortedCategories.map(([category, data], idx) => {
                                const percentage = (data.total / totalAmount) * 100;
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

                                const pathData = [
                                    `M 100 100`,
                                    `L ${x1} ${y1}`,
                                    `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`,
                                    `Z`
                                ].join(' ');

                                return (
                                    <g key={category}>
                                        <path
                                            d={pathData}
                                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                                            stroke="#000"
                                            strokeWidth="2"
                                        />
                                        {percentage > 5 && (() => {
                                            const midAngle = (startAngle + endAngle) / 2;
                                            const midRad = (midAngle - 90) * (Math.PI / 180);
                                            const labelX = 100 + 60 * Math.cos(midRad);
                                            const labelY = 100 + 60 * Math.sin(midRad);
                                            return (
                                                <text
                                                    x={labelX}
                                                    y={labelY}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#fff"
                                                    fontSize="12"
                                                    fontWeight="800"
                                                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                                >
                                                    {percentage.toFixed(1)}%
                                                </text>
                                            );
                                        })()}
                                    </g>
                                );
                            });
                        })()}
                    </svg>
                </div>

                {/* Legend with breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sortedCategories.map(([category, data], idx) => {
                        const percentage = (data.total / totalAmount) * 100;
                        return (
                            <div key={category} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                border: `2px solid ${colors.border}`,
                                background: '#f8f8f8'
                            }}>
                                <div style={{
                                    width: '1.5rem',
                                    height: '1.5rem',
                                    background: PIE_COLORS[idx % PIE_COLORS.length],
                                    border: `2px solid ${colors.border}`,
                                    flexShrink: 0
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        color: colors.text,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {category}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        {data.credit > 0 && (
                                            <span style={{ color: colors.accent, fontWeight: '600' }}>
                                                💳 {formatCurrency(data.credit)}
                                            </span>
                                        )}
                                        {data.cash > 0 && (
                                            <span style={{ color: colors.success, fontWeight: '600' }}>
                                                💵 {formatCurrency(data.cash)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '800',
                                        fontFamily: 'Consolas, "Courier New", monospace',
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '0.05em',
                                        color: colors.text
                                    }}>
                                        {formatCurrency(data.total)}
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: colors.textLight,
                                        fontWeight: '600'
                                    }}>
                                        {percentage.toFixed(1)}% • {data.count} transaction{data.count > 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ExpenseDistributionChart);
