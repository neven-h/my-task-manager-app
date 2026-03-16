import React from 'react';
import { PieChart } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const PIE_COLORS = [
    '#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF6B35',
    '#7B2CBF', '#06D6A0', '#F72585', '#4361EE', '#F77F00',
];
const SYS = { text: '#000', border: '#000', light: '#666' };

const BudgetExpenseChart = ({ chartData }) => {
    if (!chartData || chartData.sortedCategories.length === 0) return null;
    const { sortedCategories, totalAmount } = chartData;

    return (
        <div style={{ background: '#fff', border: `2px solid ${SYS.border}`, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <PieChart size={22} color="#0000FF" />
                Expense Distribution
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: SYS.light, textTransform: 'none' }}>(Top Categories)</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                {/* Pie */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 240 }}>
                        {(() => {
                            let angle = 0;
                            return sortedCategories.map(([cat, data], i) => {
                                const pct = (data.total / totalAmount) * 100;
                                const sweep = (pct / 100) * 360;
                                const s = angle; const e = angle + sweep; angle = e;
                                const sr = (s - 90) * Math.PI / 180;
                                const er = (e - 90) * Math.PI / 180;
                                const x1 = 100 + 90 * Math.cos(sr), y1 = 100 + 90 * Math.sin(sr);
                                const x2 = 100 + 90 * Math.cos(er), y2 = 100 + 90 * Math.sin(er);
                                const d = `M 100 100 L ${x1} ${y1} A 90 90 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
                                const midRad = ((s + e) / 2 - 90) * Math.PI / 180;
                                return (
                                    <g key={cat}>
                                        <path d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth="2" />
                                        {pct > 5 && (
                                            <text x={100 + 60 * Math.cos(midRad)} y={100 + 60 * Math.sin(midRad)}
                                                textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="12" fontWeight="800"
                                                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                                {pct.toFixed(0)}%
                                            </text>
                                        )}
                                    </g>
                                );
                            });
                        })()}
                    </svg>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {sortedCategories.map(([cat, data], i) => {
                        const pct = (data.total / totalAmount) * 100;
                        return (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', border: `2px solid ${SYS.border}`, background: '#f8f8f8' }}>
                                <div style={{ width: 18, height: 18, background: PIE_COLORS[i % PIE_COLORS.length], border: `2px solid ${SYS.border}`, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</div>
                                    <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 600 }}>
                                        {data.count} entr{data.count === 1 ? 'y' : 'ies'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.total)}</div>
                                    <div style={{ fontSize: '0.75rem', color: SYS.light, fontWeight: 600 }}>{pct.toFixed(1)}%</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default React.memo(BudgetExpenseChart);
