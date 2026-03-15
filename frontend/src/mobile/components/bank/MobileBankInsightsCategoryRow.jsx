import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtAmount, fmtMonth, barWidth, trendArrow } from '../../../utils/insightsHelpers';

const IOS = {
    separator: 'rgba(0,0,0,0.08)', green: '#34C759', red: '#FF3B30',
    blue: '#007AFF', muted: '#8E8E93',
};

const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={13} style={{ color: IOS.red }} />;
    if (trend === 'down') return <TrendingDown size={13} style={{ color: IOS.green }} />;
    return <Minus size={13} style={{ color: IOS.muted }} />;
};

const CategoryRow = ({ cat, rank, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const trend = trendArrow(cat.trend);
    const monthlyMax = cat.monthly?.length ? Math.max(...cat.monthly.map(m => m.total)) : 0;

    return (
        <div style={{ borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}` }}>
            <div onClick={() => setExpanded(e => !e)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.85rem',
            }}>
                <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 700, color: '#64748b',
                }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: '0.85rem' }}>
                        {cat.description}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: IOS.muted, marginTop: 1 }}>
                        {cat.tx_count} tx · ₪{fmtAmount(cat.avg_per_month)}/mo
                    </div>
                </div>
                <TrendIcon trend={cat.trend} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: IOS.red, flexShrink: 0 }}>
                    ₪{fmtAmount(cat.total)}
                </div>
            </div>
            {expanded && (
                <div style={{ padding: '2px 16px 10px 46px', fontSize: '0.75rem', color: IOS.muted }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span>Peak: <b style={{ color: '#000' }}>{fmtMonth(cat.peak_month)}</b> ₪{fmtAmount(cat.peak_amount)}</span>
                        <span style={{ color: trend.color }}>{trend.symbol} {trend.label}</span>
                    </div>
                    {cat.monthly && cat.monthly.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {cat.monthly.map(m => (
                                <div key={m.month_year} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 32, fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>
                                        {fmtMonth(m.month_year).split(' ')[0]}
                                    </span>
                                    <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3,
                                            width: barWidth(m.total, monthlyMax),
                                            background: m.month_year === cat.peak_month ? IOS.red : IOS.blue,
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, flexShrink: 0, width: 50, textAlign: 'right' }}>
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

export default CategoryRow;
