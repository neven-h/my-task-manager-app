import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtAmount, fmtMonth, barWidth, trendArrow } from '../../utils/insightsHelpers';

const TrendIcon = ({ trend }) => {
    if (trend === 'up')   return <TrendingUp   size={14} style={{ color: '#dc2626' }} />;
    if (trend === 'down') return <TrendingDown size={14} style={{ color: '#16a34a' }} />;
    return <Minus size={14} style={{ color: '#6b7280' }} />;
};

/**
 * Single expandable category row for the Spending Insights panel.
 * Props: { cat, rank, maxTotal }
 */
const InsightsCategoryRow = ({ cat, rank }) => {
    const [expanded, setExpanded] = useState(false);
    const trend = trendArrow(cat.trend);
    const monthlyMax = cat.monthly?.length ? Math.max(...cat.monthly.map(m => m.total)) : 0;

    return (
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div onClick={() => setExpanded(e => !e)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem',
            }}>
                <span style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: '#f1f5f9', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748b',
                }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {cat.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                        {cat.tx_count} transactions · Avg ₪{fmtAmount(cat.avg_per_month)}/mo
                    </div>
                </div>
                <TrendIcon trend={cat.trend} />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FF0000', flexShrink: 0 }}>
                    ₪{fmtAmount(cat.total)}
                </div>
                {expanded ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
            </div>

            {expanded && (
                <div style={{ padding: '4px 16px 12px 50px', fontSize: '0.78rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span>Peak: <b>{fmtMonth(cat.peak_month)}</b> — ₪{fmtAmount(cat.peak_amount)}</span>
                        <span>Avg/month: <b>₪{fmtAmount(cat.avg_per_month)}</b></span>
                        <span style={{ color: trend.color }}>{trend.symbol} {trend.label}</span>
                    </div>
                    {cat.monthly && cat.monthly.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {cat.monthly.map(m => (
                                <div key={m.month_year} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 50, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                                        {fmtMonth(m.month_year).split(' ')[0]}
                                    </span>
                                    <div style={{
                                        height: 6, borderRadius: 3,
                                        background: m.month_year === cat.peak_month ? '#dc2626' : '#e0e7ff',
                                        width: barWidth(m.total, monthlyMax),
                                        transition: 'width 0.3s ease',
                                    }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                                        ₪{fmtAmount(m.total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export { InsightsCategoryRow, TrendIcon };
export default InsightsCategoryRow;
