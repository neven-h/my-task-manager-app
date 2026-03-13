import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import { fmtAmount, fmtMonth, barWidth, trendArrow } from '../../../utils/insightsHelpers';

const IOS = {
    card: '#fff', separator: 'rgba(0,0,0,0.08)', bg: '#F2F2F7',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={13} style={{ color: IOS.red }} />;
    if (trend === 'down') return <TrendingDown size={13} style={{ color: IOS.green }} />;
    return <Minus size={13} style={{ color: IOS.muted }} />;
};

// ── Category row ─────────────────────────────────────────────────────────────
const CategoryRow = ({ cat, rank, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const trend = trendArrow(cat.trend);
    const monthlyMax = cat.monthly?.length
        ? Math.max(...cat.monthly.map(m => m.total))
        : 0;

    return (
        <div style={{
            borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
        }}>
            <div onClick={() => setExpanded(e => !e)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', fontSize: '0.85rem',
            }}>
                <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: '#f1f5f9', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#64748b',
                }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', fontWeight: 500, fontSize: '0.85rem',
                    }}>
                        {cat.description}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: IOS.muted, marginTop: 1 }}>
                        {cat.tx_count} tx · ₪{fmtAmount(cat.avg_per_month)}/mo
                    </div>
                </div>
                <TrendIcon trend={cat.trend} />
                <div style={{
                    fontWeight: 700, fontSize: '0.88rem', color: IOS.red, flexShrink: 0,
                }}>
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
                                <div key={m.month_year} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    <span style={{ width: 32, fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>
                                        {fmtMonth(m.month_year).split(' ')[0]}
                                    </span>
                                    <div style={{
                                        flex: 1, height: 5, background: '#f1f5f9',
                                        borderRadius: 3, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3,
                                            width: barWidth(m.total, monthlyMax),
                                            background: m.month_year === cat.peak_month
                                                ? IOS.red : IOS.blue,
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

// ── Main component ───────────────────────────────────────────────────────────
const MobileBankInsights = ({ insights, onFetch, loading }) => {
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !insights) onFetch();
        setOpen(v => !v);
    };

    const data = insights;
    const maxMonthly = data?.monthly_totals?.length
        ? Math.max(...data.monthly_totals.map(m => m.total))
        : 0;

    return (
        <div style={{ margin: '16px 16px 0' }}>
            {/* Toggle button */}
            <button type="button" onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 16px',
                border: 'none', borderRadius: open ? `${IOS.radius}px ${IOS.radius}px 0 0` : IOS.radius,
                background: open ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : IOS.card,
                boxShadow: open ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                fontWeight: 600, fontSize: '0.88rem',
                fontFamily: FONT_STACK, color: open ? '#fff' : '#000',
                transition: `all 0.35s ${IOS.spring}`,
            }}>
                <BarChart3 size={16} />
                {open ? 'Hide Spending Insights' : 'Spending Insights'}
            </button>

            {open && (
                <div style={{
                    background: IOS.card,
                    borderRadius: `0 0 ${IOS.radius}px ${IOS.radius}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    {/* Loading */}
                    {loading && !data && (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Analyzing your spending…
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !data && (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Upload at least 2 months of transactions to see insights.
                        </div>
                    )}

                    {data && data.month_count > 0 && (<>
                        {/* Summary text */}
                        {data.summary && (
                            <div style={{
                                padding: '12px 16px', background: '#f0f9ff',
                                borderBottom: `0.5px solid ${IOS.separator}`,
                                fontSize: '0.82rem', fontWeight: 500, color: '#1e3a5f',
                                lineHeight: 1.5,
                            }}>
                                {data.summary}
                            </div>
                        )}

                        {/* Key numbers */}
                        <div style={{
                            padding: '14px 16px',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                            display: 'flex', justifyContent: 'space-around', textAlign: 'center',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Avg/Month</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: IOS.red }}>₪{fmtAmount(data.monthly_avg)}</div>
                            </div>
                            {data.biggest_month && (
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Highest</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: IOS.red }}>
                                        {fmtMonth(data.biggest_month.month)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                                        ₪{fmtAmount(data.biggest_month.amount)}
                                    </div>
                                </div>
                            )}
                            {data.lowest_month && (
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>Lowest</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: IOS.green }}>
                                        {fmtMonth(data.lowest_month.month)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                                        ₪{fmtAmount(data.lowest_month.amount)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Monthly bar chart */}
                        <div style={{
                            padding: '10px 16px',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                        }}>
                            <div style={{
                                fontSize: '0.68rem', fontWeight: 600, color: IOS.muted,
                                textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6,
                            }}>
                                Monthly Spending
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {data.monthly_totals.map(m => {
                                    const isPeak = m.total === maxMonthly;
                                    return (
                                        <div key={m.month_year} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                        }}>
                                            <span style={{
                                                width: 50, fontSize: '0.7rem', fontWeight: 600,
                                                color: IOS.muted, flexShrink: 0,
                                            }}>
                                                {fmtMonth(m.month_year)}
                                            </span>
                                            <div style={{
                                                flex: 1, height: 10, background: '#f1f5f9',
                                                borderRadius: 5, overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 5,
                                                    width: barWidth(m.total, maxMonthly),
                                                    background: isPeak
                                                        ? `linear-gradient(90deg, ${IOS.red}, #ff6b6b)`
                                                        : `linear-gradient(90deg, ${IOS.blue}, #5ac8fa)`,
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <span style={{
                                                width: 55, fontSize: '0.72rem',
                                                fontWeight: isPeak ? 700 : 500,
                                                color: isPeak ? IOS.red : '#374151',
                                                textAlign: 'right', flexShrink: 0,
                                            }}>
                                                ₪{fmtAmount(m.total)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top categories */}
                        <div style={{
                            padding: '7px 16px', background: '#f9f9f9',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                            fontSize: '0.68rem', fontWeight: 600, color: IOS.muted,
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                        }}>
                            Top Categories
                        </div>
                        {data.top_categories.map((cat, i) => (
                            <CategoryRow
                                key={i} cat={cat} rank={i + 1}
                                isLast={i === data.top_categories.length - 1 && (!data.patterns || data.patterns.length === 0)}
                            />
                        ))}

                        {/* Key Insights */}
                        {data.patterns?.length > 0 && (
                            <div style={{
                                padding: '10px 16px', background: '#fffbeb',
                                borderTop: `0.5px solid ${IOS.separator}`,
                            }}>
                                <div style={{
                                    fontSize: '0.68rem', fontWeight: 600, color: '#92400e',
                                    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4,
                                }}>
                                    Key Insights
                                </div>
                                {data.patterns.map((p, i) => {
                                    const text = typeof p === 'string' ? p : p.text;
                                    return (
                                        <div key={i} style={{
                                            fontSize: '0.78rem', color: '#78350f',
                                            padding: '3px 0', fontWeight: 500,
                                        }}>
                                            {text}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>)}
                </div>
            )}
        </div>
    );
};

export default MobileBankInsights;
