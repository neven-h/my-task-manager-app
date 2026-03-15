import React from 'react';
import { fmtAmount, fmtMonth, barWidth } from '../../../utils/insightsHelpers';
import CategoryRow from './MobileBankInsightsCategoryRow';

const IOS = {
    separator: 'rgba(0,0,0,0.08)', green: '#34C759', red: '#FF3B30',
    blue: '#007AFF', muted: '#8E8E93',
};

const InsightsBody = ({ data, maxMonthly }) => (
    <>
        {data.summary && (
            <div style={{
                padding: '12px 16px', background: '#f0f9ff',
                borderBottom: `0.5px solid ${IOS.separator}`,
                fontSize: '0.82rem', fontWeight: 500, color: '#1e3a5f', lineHeight: 1.5,
            }}>
                {data.summary}
            </div>
        )}
        <div style={{
            padding: '14px 16px', borderBottom: `0.5px solid ${IOS.separator}`,
            display: 'flex', justifyContent: 'space-around', textAlign: 'center',
        }}>
            <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Avg/Month</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: IOS.red }}>₪{fmtAmount(data.monthly_avg)}</div>
            </div>
            {data.biggest_month && (
                <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Highest</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: IOS.red }}>{fmtMonth(data.biggest_month.month)}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>₪{fmtAmount(data.biggest_month.amount)}</div>
                </div>
            )}
            {data.lowest_month && (
                <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Lowest</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: IOS.green }}>{fmtMonth(data.lowest_month.month)}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>₪{fmtAmount(data.lowest_month.amount)}</div>
                </div>
            )}
        </div>
        <div style={{ padding: '10px 16px', borderBottom: `0.5px solid ${IOS.separator}` }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Monthly Spending
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.monthly_totals.map(m => {
                    const isPeak = m.total === maxMonthly;
                    return (
                        <div key={m.month_year} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 50, fontSize: '0.7rem', fontWeight: 600, color: IOS.muted, flexShrink: 0 }}>
                                {fmtMonth(m.month_year)}
                            </span>
                            <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 5,
                                    width: barWidth(m.total, maxMonthly),
                                    background: isPeak ? `linear-gradient(90deg, ${IOS.red}, #ff6b6b)` : `linear-gradient(90deg, ${IOS.blue}, #5ac8fa)`,
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                            <span style={{ width: 55, fontSize: '0.72rem', fontWeight: isPeak ? 700 : 500, color: isPeak ? IOS.red : '#374151', textAlign: 'right', flexShrink: 0 }}>
                                ₪{fmtAmount(m.total)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
        <div style={{
            padding: '7px 16px', background: '#f9f9f9', borderBottom: `0.5px solid ${IOS.separator}`,
            fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
            Top Categories
        </div>
        {data.top_categories.map((cat, i) => (
            <CategoryRow key={i} cat={cat} rank={i + 1}
                isLast={i === data.top_categories.length - 1 && (!data.patterns || data.patterns.length === 0)}
            />
        ))}
        {data.patterns?.length > 0 && (
            <div style={{ padding: '10px 16px', background: '#fffbeb', borderTop: `0.5px solid ${IOS.separator}` }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                    Key Insights
                </div>
                {data.patterns.map((p, i) => {
                    const text = typeof p === 'string' ? p : p.text;
                    return (
                        <div key={i} style={{ fontSize: '0.78rem', color: '#78350f', padding: '3px 0', fontWeight: 500 }}>
                            {text}
                        </div>
                    );
                })}
            </div>
        )}
    </>
);

export default InsightsBody;
