import React from 'react';
import { fmtAmount, fmtMonth, barWidth } from '../../utils/insightsHelpers';
import InsightsCategoryRow from './InsightsCategoryRow';

/**
 * Renders the full data section of the Spending Insights panel
 * (summary, key-numbers bar, monthly chart, category list, patterns).
 * Props: { data, maxMonthly, fetchSpendingInsights }
 */
const InsightsDataPanel = ({ data, maxMonthly, fetchSpendingInsights }) => (
    <>
        {/* Summary text */}
        {data.summary && (
            <div style={{
                padding: '12px 20px', background: '#f0f9ff',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '0.84rem', fontWeight: 500, color: '#1e3a5f', lineHeight: 1.5,
            }}>
                {data.summary}
            </div>
        )}

        {/* Key numbers bar */}
        <div style={{
            padding: '10px 20px', background: '#f5f3ff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Avg/Month</span>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#FF0000' }}>₪{fmtAmount(data.monthly_avg)}</span>
            </div>
            {data.biggest_month && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Highest</span>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#dc2626' }}>
                        {fmtMonth(data.biggest_month.month)} ₪{fmtAmount(data.biggest_month.amount)}
                    </span>
                </div>
            )}
            {data.lowest_month && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Lowest</span>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#16a34a' }}>
                        {fmtMonth(data.lowest_month.month)} ₪{fmtAmount(data.lowest_month.amount)}
                    </span>
                </div>
            )}
            <button
                onClick={(e) => { e.stopPropagation(); fetchSpendingInsights(); }}
                style={{
                    marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700,
                    padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 6,
                    background: '#fff', cursor: 'pointer', color: '#6366f1',
                }}
            >
                Refresh
            </button>
        </div>

        {/* Monthly bar chart */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8,
            }}>
                Monthly Spending
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.monthly_totals.map(m => {
                    const isPeak = m.total === maxMonthly;
                    return (
                        <div key={m.month_year} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 65, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', flexShrink: 0 }}>
                                {fmtMonth(m.month_year)}
                            </span>
                            <div style={{ flex: 1, height: 14, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: barWidth(m.total, maxMonthly),
                                    background: isPeak
                                        ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                                        : 'linear-gradient(90deg, #6366f1, #818cf8)',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                            <span style={{
                                width: 70, fontSize: '0.78rem',
                                fontWeight: isPeak ? 800 : 600,
                                color: isPeak ? '#dc2626' : '#374151',
                                textAlign: 'right', flexShrink: 0,
                            }}>
                                ₪{fmtAmount(m.total)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Top categories header */}
        <div style={{
            padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
            Top Categories
        </div>

        {data.top_categories.map((cat, i) => (
            <InsightsCategoryRow key={i} cat={cat} rank={i + 1} maxTotal={data.top_categories[0]?.total || 1} />
        ))}

        {/* Patterns / Insights */}
        {data.patterns?.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', borderTop: '1px solid #e5e7eb' }}>
                <div style={{
                    fontSize: '0.72rem', fontWeight: 700, color: '#92400e',
                    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6,
                }}>
                    Key Insights
                </div>
                {data.patterns.map((p, i) => {
                    const text = typeof p === 'string' ? p : p.text;
                    const type = typeof p === 'object' ? p.type : '';
                    const icon = type === 'peak_month' ? '📈' :
                                 type === 'low_month' ? '📉' :
                                 type === 'category_trend' ? (p.trend === 'up' ? '↑' : '↓') :
                                 type === 'concentration' ? '🎯' :
                                 type === 'recent_trend' ? (p.direction === 'up' ? '🔺' : '🔻') : '•';
                    return (
                        <div key={i} style={{
                            fontSize: '0.8rem', color: '#78350f', padding: '4px 0',
                            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span style={{ flexShrink: 0 }}>{icon}</span>
                            <span>{text}</span>
                        </div>
                    );
                })}
            </div>
        )}
    </>
);

export { InsightsDataPanel };
export default InsightsDataPanel;
