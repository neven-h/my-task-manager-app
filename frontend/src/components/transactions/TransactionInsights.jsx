import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { fmtAmount, fmtMonth, barWidth, trendArrow } from '../../utils/insightsHelpers';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666', text: '#000' };

const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={14} style={{ color: '#dc2626' }} />;
    if (trend === 'down') return <TrendingDown size={14} style={{ color: '#16a34a' }} />;
    return <Minus size={14} style={{ color: '#6b7280' }} />;
};

// ── Category row with progressive disclosure ────────────────────────────────
const CategoryRow = ({ cat, rank, maxTotal }) => {
    const [expanded, setExpanded] = useState(false);
    const trend = trendArrow(cat.trend);
    const monthlyMax = cat.monthly?.length
        ? Math.max(...cat.monthly.map(m => m.total))
        : 0;

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
                    <div style={{
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', fontWeight: 600,
                    }}>
                        {cat.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                        {cat.tx_count} transactions · Avg ₪{fmtAmount(cat.avg_per_month)}/mo
                    </div>
                </div>
                <TrendIcon trend={cat.trend} />
                <div style={{
                    fontWeight: 800, fontSize: '0.9rem', color: SYS.accent, flexShrink: 0,
                }}>
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
                    {/* Per-month mini bars */}
                    {cat.monthly && cat.monthly.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {cat.monthly.map(m => (
                                <div key={m.month_year} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 50, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                                        {fmtMonth(m.month_year).split(' ')[0]}
                                    </span>
                                    <div style={{
                                        height: 6, borderRadius: 3,
                                        background: m.month_year === cat.peak_month
                                            ? '#dc2626' : '#e0e7ff',
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

// ── Main component ───────────────────────────────────────────────────────────
const TransactionInsights = () => {
    const { spendingInsights, insightsLoading, fetchSpendingInsights, activeTabId } = useBankTransactionContext();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !spendingInsights) fetchSpendingInsights();
        setOpen(v => !v);
    };

    const data = spendingInsights;
    const maxMonthly = data?.monthly_totals?.length
        ? Math.max(...data.monthly_totals.map(m => m.total))
        : 0;

    if (!activeTabId) return null;

    return (
        <div style={{
            marginBottom: '1.5rem', border: '2px solid #e0e0e0',
            borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: '#64748b', color: '#fff',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px',
                }}>
                    <BarChart3 size={18} />
                    Spending Insights
                    {data?.top_categories?.length > 0 && (
                        <span style={{
                            background: 'rgba(255,255,255,0.25)',
                            padding: '2px 10px', fontSize: '0.75rem',
                            fontWeight: 800, borderRadius: 20,
                        }}>
                            {data.top_categories.length} categories
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {/* Loading */}
                    {insightsLoading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>
                            Analyzing your spending…
                        </div>
                    )}

                    {/* Empty state */}
                    {!insightsLoading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontWeight: 600 }}>
                            Upload at least 2 months of transactions to see spending insights.
                        </div>
                    )}

                    {/* Data */}
                    {data && data.month_count > 0 && (<>
                        {/* Summary text */}
                        {data.summary && (
                            <div style={{
                                padding: '12px 20px', background: '#f0f9ff',
                                borderBottom: '1px solid #e5e7eb',
                                fontSize: '0.84rem', fontWeight: 500, color: '#1e3a5f',
                                lineHeight: 1.5,
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
                                <span style={{ fontWeight: 900, fontSize: '1rem', color: SYS.accent }}>₪{fmtAmount(data.monthly_avg)}</span>
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
                        <div style={{
                            padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
                        }}>
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
                                        <div key={m.month_year} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                        }}>
                                            <span style={{
                                                width: 65, fontSize: '0.75rem', fontWeight: 600,
                                                color: '#6b7280', flexShrink: 0,
                                            }}>
                                                {fmtMonth(m.month_year)}
                                            </span>
                                            <div style={{
                                                flex: 1, height: 14, background: '#f1f5f9',
                                                borderRadius: 4, overflow: 'hidden',
                                            }}>
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
                            padding: '8px 16px', background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                        }}>
                            Top Categories
                        </div>

                        {/* Category rows */}
                        {data.top_categories.map((cat, i) => (
                            <CategoryRow key={i} cat={cat} rank={i + 1} maxTotal={data.top_categories[0]?.total || 1} />
                        ))}

                        {/* Patterns / Insights */}
                        {data.patterns?.length > 0 && (
                            <div style={{
                                padding: '12px 16px', background: '#fffbeb',
                                borderTop: '1px solid #e5e7eb',
                            }}>
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
                                            fontSize: '0.8rem', color: '#78350f',
                                            padding: '4px 0', fontWeight: 500,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                        }}>
                                            <span style={{ flexShrink: 0 }}>{icon}</span>
                                            <span>{text}</span>
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

export default TransactionInsights;
