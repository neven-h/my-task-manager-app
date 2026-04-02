import React from 'react';
import { PieChart } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { FONT_STACK } from '../../../ios/theme';

const PIE_COLORS = [
    '#007AFF', '#FF3B30', '#FFD500', '#34C759', '#FF6B35',
    '#AF52DE', '#06D6A0', '#FF2D55', '#5856D6', '#FF9500',
];

const MobileBudgetExpenseChart = ({ chartData }) => {
    if (!chartData || chartData.sortedCategories.length === 0) return null;
    const { sortedCategories, totalAmount } = chartData;

    return (
        <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontFamily: FONT_STACK }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <PieChart size={18} color="#007AFF" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Expense Distribution</span>
            </div>

            {/* Pie */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 160, height: 'auto', aspectRatio: '1' }}>
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
                                    <path d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth="1.5" />
                                    {pct > 7 && (
                                        <text x={100 + 55 * Math.cos(midRad)} y={100 + 55 * Math.sin(midRad)}
                                            textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="12" fontWeight="700"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortedCategories.map(([cat, data], i) => {
                    const pct = (data.total / totalAmount) * 100;
                    return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F2F2F7', borderRadius: 10 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 4, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.total)}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8E8E93' }}>{pct.toFixed(1)}% &middot; {data.count}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(MobileBudgetExpenseChart);
