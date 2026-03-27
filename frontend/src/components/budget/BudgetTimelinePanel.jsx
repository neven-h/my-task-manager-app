import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HistoryRow } from './BudgetHistoryRow';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const fmtMonth = (mk) => {
    const [y, m] = mk.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const BudgetTimelinePanel = ({ hist, tl, visHist, hiddenHistCount, showAllHist, setShowAllHist, forecast, endBal, monthlyProj }) => {
    const [expandedMonth, setExpandedMonth] = useState(null);

    // Aggregate upcoming timeline items by month
    const upcomingByMonth = useMemo(() => {
        if (!tl.length) return [];
        const map = {};
        for (const item of tl) {
            const mk = item.date.slice(0, 7);
            if (!map[mk]) map[mk] = { income: 0, expense: 0, count: 0, items: [], endBalance: item.running_balance };
            if (item.type === 'income') map[mk].income += item.amount;
            else map[mk].expense += item.amount;
            map[mk].count += 1;
            map[mk].items.push(item);
            map[mk].endBalance = item.running_balance;
        }
        return Object.entries(map).sort().map(([month, data]) => ({ month, ...data }));
    }, [tl]);

    // Plain-language projection summary
    const projSummary = useMemo(() => {
        if (!forecast || !monthlyProj || !monthlyProj.length) return null;
        const totalIn = monthlyProj.reduce((s, m) => s + m.income, 0);
        const totalOut = monthlyProj.reduce((s, m) => s + m.expense, 0);
        const end = forecast.forecast_end_balance;
        const cur = forecast.current_balance;
        const trend = end > cur ? 'improving' : end < cur ? 'declining' : 'stable';
        let text = `Over the next ${monthlyProj.length} month${monthlyProj.length > 1 ? 's' : ''}, you're projected to receive ₪${fmt(totalIn)} and spend ₪${fmt(totalOut)}.`;
        if (trend === 'improving') text += ` Your balance is expected to grow to ₪${fmt(end)}.`;
        else if (trend === 'declining') text += ` Your balance is expected to drop to ${end >= 0 ? '' : '−'}₪${fmt(end)}.`;
        return { text, trend };
    }, [forecast, monthlyProj]);

    return (
        <>
            {/* ── Column headers ────────────────────── */}
            {(hist.length > 0 || tl.length > 0) && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 16px', borderBottom: '1px solid #e5e7eb',
                    fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    background: '#f5f3ff',
                }}>
                    <div style={{ width: 75 }}>Period</div>
                    <div style={{ flex: 1 }}>Breakdown</div>
                    <div style={{ width: 100, textAlign: 'right' }}>Balance</div>
                    <div style={{ width: 12 }} />
                </div>
            )}

            {/* ── History months ────────────────────── */}
            {hist.length > 0 && (
                <>
                    <div style={{
                        padding: '5px 16px', background: '#eff6ff',
                        fontSize: '0.68rem', fontWeight: 700, color: '#1e40af',
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        borderBottom: '1px solid #dbeafe',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span>Historical (actual)</span>
                        {!showAllHist && hiddenHistCount > 0 && (
                            <button type="button" onClick={() => setShowAllHist(true)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                +{hiddenHistCount} more months
                            </button>
                        )}
                        {showAllHist && hiddenHistCount > 0 && (
                            <button type="button" onClick={() => setShowAllHist(false)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                Show less
                            </button>
                        )}
                    </div>
                    {visHist.map((m, i) => (
                        <HistoryRow key={m.month} m={m} isLast={i === visHist.length - 1} />
                    ))}
                </>
            )}

            {/* ── TODAY divider ─────────────────────── */}
            {(hist.length > 0 || tl.length > 0) && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 16px',
                    background: 'linear-gradient(90deg, #fef9c3 0%, #fffbeb 100%)',
                    borderTop: '1px solid #fde68a', borderBottom: '1px solid #fde68a',
                    fontSize: '0.72rem', fontWeight: 800, color: '#92400e',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                    <span>▶ Today —</span>
                    <span style={{ fontWeight: 500, letterSpacing: 0 }}>
                        Balance: {forecast.current_balance >= 0 ? '' : '−'}₪{fmt(forecast.current_balance)}
                    </span>
                </div>
            )}

            {/* ── Projection summary ─────────────────── */}
            {projSummary && (
                <div style={{
                    padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
                    background: projSummary.trend === 'declining' ? '#fff5f5' : projSummary.trend === 'improving' ? '#f0fff4' : '#f9fafb',
                    fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.5,
                    color: projSummary.trend === 'declining' ? '#dc2626' : projSummary.trend === 'improving' ? '#059669' : '#374151',
                }}>
                    {projSummary.text}
                </div>
            )}

            {/* ── Upcoming — monthly summaries ────────── */}
            {upcomingByMonth.length > 0 && (
                <>
                    <div style={{
                        padding: '5px 16px', background: '#f9fafb',
                        fontSize: '0.68rem', fontWeight: 700, color: '#6b7280',
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        borderBottom: '1px solid #e5e7eb',
                    }}>
                        Upcoming — {tl.length} items in {upcomingByMonth.length} months
                    </div>
                    {upcomingByMonth.map((m, i) => {
                        const net = m.income - m.expense;
                        const isExpanded = expandedMonth === m.month;
                        return (
                            <React.Fragment key={m.month}>
                                <div
                                    onClick={() => setExpandedMonth(prev => prev === m.month ? null : m.month)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 16px',
                                        borderBottom: !isExpanded && i < upcomingByMonth.length - 1 ? '1px dashed #e5e7eb' : 'none',
                                        fontSize: '0.84rem', cursor: 'pointer',
                                        background: isExpanded ? '#f0f4ff' : 'transparent',
                                    }}
                                >
                                    <div style={{ width: 75, fontWeight: 700, color: '#555', fontSize: '0.78rem' }}>
                                        {fmtMonth(m.month)}
                                    </div>
                                    <div style={{ flex: 1, fontSize: '0.76rem', color: '#9ca3af' }}>
                                        {m.count} item{m.count !== 1 ? 's' : ''} · In: <span style={{ color: SYS.success }}>+₪{fmt(m.income)}</span> · Out: <span style={{ color: SYS.accent }}>−₪{fmt(m.expense)}</span>
                                    </div>
                                    <span style={{
                                        padding: '2px 7px', fontWeight: 800, fontSize: '0.76rem',
                                        background: net >= 0 ? '#f0fdf4' : '#fef2f2',
                                        color: net >= 0 ? SYS.success : SYS.accent,
                                        border: `1px solid ${net >= 0 ? '#bbf7d0' : '#fecaca'}`,
                                    }}>
                                        {net >= 0 ? '+' : '−'}₪{fmt(net)}
                                    </span>
                                    <div style={{
                                        width: 100, textAlign: 'right', fontWeight: 800, fontSize: '0.88rem',
                                        color: m.endBalance >= 0 ? SYS.primary : SYS.accent,
                                    }}>
                                        {m.endBalance >= 0 ? '' : '−'}₪{fmt(m.endBalance)}
                                    </div>
                                    {isExpanded ? <ChevronUp size={12} color={SYS.light} /> : <ChevronDown size={12} color={SYS.light} />}
                                </div>
                                {isExpanded && (
                                    <div style={{ padding: '4px 16px 8px 91px', borderBottom: '1px solid #e5e7eb', background: '#fafbff' }}>
                                        {m.items.map((p, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', gap: 10, padding: '4px 0', fontSize: '0.78rem', color: '#6b7280',
                                                borderBottom: idx < m.items.length - 1 ? '1px dotted #eee' : 'none',
                                            }}>
                                                <span style={{ width: 55, flexShrink: 0 }}>
                                                    {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.description}
                                                </span>
                                                <span style={{ flexShrink: 0, fontWeight: 700, color: p.type === 'income' ? SYS.success : SYS.accent }}>
                                                    {p.type === 'income' ? '+' : '−'}₪{fmt(p.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </>
            )}

            {tl.length === 0 && hist.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                    No data yet. Add budget entries and link a bank tab to see the timeline.
                </div>
            )}

            {/* ── Projected end balance ─────────────── */}
            {tl.length > 0 && endBal !== undefined && (
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderTop: '2px solid #e5e7eb',
                    background: '#f9fafb',
                }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px' }}>
                        Projected end balance:
                    </span>
                    <span style={{
                        fontSize: '1.15rem', fontWeight: 800,
                        color: endBal >= 0 ? SYS.primary : SYS.accent,
                    }}>
                        {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                    </span>
                </div>
            )}
        </>
    );
};

export default BudgetTimelinePanel;
