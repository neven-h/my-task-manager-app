import React, { useState, useMemo, memo } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { trendArrow } from '../../../utils/forecastHelpers';

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const round2 = (n) => Math.round(n * 100) / 100;

// ── History row ───────────────────────────────────────────────────────────────
const HistoryRow = memo(({ m, isLast }) => {
    const [exp, setExp] = useState(false);
    const netPos = m.net >= 0;

    return (
        <div style={{ borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}` }}>
            <div onClick={() => setExp(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', cursor: 'pointer',
            }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: IOS.muted, width: 64, flexShrink: 0 }}>
                    {fmtMonth(m.month)}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{
                        background: netPos ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.08)',
                        color: netPos ? IOS.green : IOS.red,
                        padding: '2px 8px', borderRadius: 20,
                        fontWeight: 700, fontSize: '0.78rem', flexShrink: 0,
                    }}>
                        {netPos ? '+' : '−'}₪{fmt(m.net)}
                    </span>
                    {!exp && (
                        <span style={{ fontSize: '0.68rem', color: IOS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[
                                m.budget_income > 0 && `in ₪${fmt(m.budget_income)}`,
                                m.bank_expense > 0  && `bank −₪${fmt(m.bank_expense)}`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>
                <div style={{
                    fontSize: '0.88rem', fontWeight: 800, flexShrink: 0,
                    color: m.running_balance >= 0 ? IOS.blue : IOS.red,
                }}>
                    {m.running_balance >= 0 ? '' : '−'}₪{fmt(m.running_balance)}
                </div>
                {exp ? <ChevronUp size={13} color={IOS.muted} /> : <ChevronDown size={13} color={IOS.muted} />}
            </div>
            {exp && (
                <div style={{
                    padding: '2px 16px 10px 80px',
                    display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
                    fontSize: '0.74rem',
                }}>
                    {m.budget_income > 0  && <span style={{ color: IOS.green }}>Budget income +₪{fmt(m.budget_income)}</span>}
                    {m.budget_expense > 0 && <span style={{ color: IOS.red }}>Budget exp −₪{fmt(m.budget_expense)}</span>}
                    {m.bank_income > 0    && <span style={{ color: IOS.green }}>Transfers in +₪{fmt(m.bank_income)}</span>}
                    {m.bank_expense > 0   && <span style={{ color: IOS.red }}>Bank exp −₪{fmt(m.bank_expense)}</span>}
                </div>
            )}
        </div>
    );
});

// ── Prediction row ────────────────────────────────────────────────────────────
const PredRow = memo(({ p, isLast }) => {
    const isIncome = p.type === 'income';
    const trend    = trendArrow(p.trend);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
            opacity: 0.88,
        }}>
            <div style={{
                width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: isIncome ? IOS.green : IOS.red,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                </div>
                <div style={{ fontSize: '0.7rem', color: IOS.muted, marginTop: 1 }}>
                    {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    <span style={{ color: p.source === 'bank' ? IOS.muted : IOS.blue }}>{p.source}</span>
                </div>
            </div>
            <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '0.78rem', color: trend.color }}>
                {trend.symbol}
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', flexShrink: 0,
                color: isIncome ? IOS.green : IOS.red }}>
                {isIncome ? '+' : '−'}₪{fmt(p.amount)}
            </div>
            <div style={{
                fontWeight: 600, fontSize: '0.8rem', flexShrink: 0, width: 70, textAlign: 'right',
                color: p.running_balance >= 0 ? IOS.blue : IOS.red,
            }}>
                {p.running_balance >= 0 ? '' : '−'}₪{fmt(p.running_balance)}
            </div>
        </div>
    );
});

// ── Monthly outlook card ──────────────────────────────────────────────────────
const MonthCard = memo(({ m }) => {
    const netPos = m.net >= 0;
    return (
        <div style={{
            flexShrink: 0, width: 118,
            borderRadius: 12,
            border: `1px solid ${netPos ? '#bbf7d0' : '#fecaca'}`,
            overflow: 'hidden',
        }}>
            <div style={{
                background: netPos ? '#f0fdf4' : '#fef2f2',
                padding: '6px 10px',
                fontSize: '0.68rem', fontWeight: 700,
                color: netPos ? '#166534' : '#991b1b',
                textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
                {fmtMonth(m.month)}
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {m.income > 0 && (
                    <div style={{ fontSize: '0.72rem', color: IOS.green, fontWeight: 500 }}>
                        +₪{fmt(m.income)}
                    </div>
                )}
                <div style={{ fontSize: '0.72rem', color: IOS.red, fontWeight: 500 }}>
                    −₪{fmt(m.expense)}
                </div>
                <div style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: netPos ? IOS.green : IOS.red,
                    borderTop: `0.5px solid ${IOS.separator}`,
                    marginTop: 2, paddingTop: 4,
                }}>
                    {netPos ? '+' : '−'}₪{fmt(Math.abs(m.net))}
                </div>
                <div style={{ fontSize: '0.7rem', color: IOS.blue, fontWeight: 600 }}>
                    ₪{m.endBalance >= 0 ? '' : '−'}{fmt(m.endBalance)}
                </div>
            </div>
        </div>
    );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const HIST_SHOW = 3;

const MobileBalanceForecast = ({ forecast, onFetch, loading, linkedTab }) => {
    const [open, setOpen]           = useState(false);
    const [showAllHist, setShowAllHist] = useState(false);

    // Stable refs — prevent useMemo invalidation when forecast object identity is stable
    const tl   = useMemo(() => forecast?.timeline        || [], [forecast]);
    const hist = useMemo(() => forecast?.history_timeline || [], [forecast]);

    // Monthly projections from future timeline
    const monthlyProj = useMemo(() => {
        if (!tl.length) return [];
        const byMonth = {};
        for (const item of tl) {
            const mk = item.date.slice(0, 7);
            if (!byMonth[mk]) byMonth[mk] = { income: 0, expense: 0, endBalance: item.running_balance };
            if (item.type === 'income') byMonth[mk].income += item.amount;
            else byMonth[mk].expense += item.amount;
            byMonth[mk].endBalance = item.running_balance;
        }
        return Object.entries(byMonth).sort().map(([mk, v]) => ({
            month: mk,
            income:     round2(v.income),
            expense:    round2(v.expense),
            net:        round2(v.income - v.expense),
            endBalance: v.endBalance,
        }));
    }, [tl]);

    // Runway: months until balance hits zero (only relevant when trending negative)
    const runway = useMemo(() => {
        if (!forecast || !monthlyProj.length) return null;
        const avgNet = monthlyProj.reduce((s, m) => s + m.net, 0) / monthlyProj.length;
        if (avgNet >= 0) return null;
        const months = Math.floor(forecast.current_balance / Math.abs(avgNet));
        return months > 0 ? months : 0;
    }, [forecast, monthlyProj]);

    if (!linkedTab) return null;

    const visHist        = showAllHist ? hist : hist.slice(-HIST_SHOW);
    const hiddenHistCount = hist.length - HIST_SHOW;

    const handleToggle = () => {
        if (!open && !forecast) onFetch();
        setOpen(o => !o);
    };

    const endBal = forecast?.forecast_end_balance;

    return (
        <div style={{ margin: '16px 16px 0' }}>
            {/* Toggle button — shows projected end balance when closed */}
            <button type="button" onClick={handleToggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, width: '100%', padding: '13px 16px',
                borderRadius: open ? `${IOS.radius}px ${IOS.radius}px 0 0` : IOS.radius,
                border: 'none',
                background: open ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : IOS.card,
                color: open ? '#fff' : IOS.blue,
                fontWeight: 600, fontSize: '0.88rem',
                fontFamily: 'inherit', transition: `all 0.35s ${IOS.spring}`,
                boxShadow: open ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
                <TrendingUp size={16} />
                {open ? 'Hide Cash Flow Timeline' : 'Cash Flow Timeline'}
                {!open && endBal !== undefined && endBal !== null && (
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.8rem', fontWeight: 700,
                        color: endBal >= 0 ? IOS.blue : IOS.red,
                    }}>
                        {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                    </span>
                )}
                {open && tl.length > 0 && (
                    <span style={{
                        marginLeft: 6, background: 'rgba(255,255,255,0.25)',
                        padding: '1px 8px', borderRadius: 12, fontSize: '0.72rem',
                    }}>
                        {tl.length} ahead
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    background: IOS.card,
                    borderRadius: `0 0 ${IOS.radius}px ${IOS.radius}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    {loading && !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Building cash flow timeline…
                        </div>
                    ) : !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Add budget entries and link a bank tab to see the timeline.
                        </div>
                    ) : (<>
                        {/* ── Balance hero ── */}
                        <div style={{
                            padding: '16px 16px 12px', textAlign: 'center',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                        }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Balance today
                            </div>
                            <div style={{
                                fontSize: '1.8rem', fontWeight: 700,
                                color: forecast.current_balance >= 0 ? IOS.blue : IOS.red,
                            }}>
                                {forecast.current_balance >= 0 ? '+' : '−'}₪{fmt(forecast.current_balance)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: IOS.muted, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12 }}>
                                <span>In: <b style={{ color: IOS.green }}>+₪{fmt((forecast.budget_income || 0) + (forecast.bank_income || 0))}</b></span>
                                <span>Out: <b style={{ color: IOS.red }}>−₪{fmt((forecast.budget_expense || 0) + (forecast.bank_expense || 0))}</b></span>
                            </div>
                            {/* Runway warning */}
                            {runway !== null && (
                                <div style={{
                                    marginTop: 8, padding: '5px 12px', borderRadius: 20, display: 'inline-block',
                                    background: runway < 3 ? 'rgba(255,59,48,0.08)' : 'rgba(245,158,11,0.08)',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    color: runway < 3 ? IOS.red : '#d97706',
                                }}>
                                    ⚠ At this pace, covers ~{runway} more month{runway !== 1 ? 's' : ''}
                                </div>
                            )}
                            {/* Projected end */}
                            {endBal !== undefined && (
                                <div style={{ marginTop: runway ? 4 : 8, fontSize: '0.72rem', color: IOS.muted }}>
                                    Projected end:{' '}
                                    <b style={{ color: endBal >= 0 ? IOS.blue : IOS.red }}>
                                        {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                                    </b>
                                </div>
                            )}
                        </div>

                        {/* ── Monthly Outlook ── */}
                        {monthlyProj.length > 0 && (
                            <>
                                <div style={{
                                    padding: '6px 16px', background: '#f0fdf4',
                                    borderBottom: `0.5px solid #bbf7d0`,
                                    fontSize: '0.65rem', fontWeight: 700, color: '#166534',
                                    textTransform: 'uppercase', letterSpacing: '0.4px',
                                }}>
                                    Monthly Outlook
                                </div>
                                <div style={{
                                    display: 'flex', gap: 8, overflowX: 'auto',
                                    padding: '12px 16px',
                                    WebkitOverflowScrolling: 'touch',
                                    scrollbarWidth: 'none',
                                    borderBottom: `0.5px solid ${IOS.separator}`,
                                }}>
                                    {monthlyProj.map(m => <MonthCard key={m.month} m={m} />)}
                                </div>
                            </>
                        )}

                        {/* ── History ── */}
                        {hist.length > 0 && (<>
                            <div style={{
                                padding: '6px 16px', background: '#eff6ff',
                                borderBottom: `0.5px solid #dbeafe`,
                                fontSize: '0.65rem', fontWeight: 700, color: '#1e40af',
                                textTransform: 'uppercase', letterSpacing: '0.4px',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>Historical (actual)</span>
                                {!showAllHist && hiddenHistCount > 0 && (
                                    <button type="button" onClick={() => setShowAllHist(true)}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                        +{hiddenHistCount} more
                                    </button>
                                )}
                                {showAllHist && hiddenHistCount > 0 && (
                                    <button type="button" onClick={() => setShowAllHist(false)}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                        Show less
                                    </button>
                                )}
                            </div>
                            {visHist.map((m, i) => (
                                <HistoryRow key={m.month} m={m} isLast={i === visHist.length - 1} />
                            ))}
                        </>)}

                        {/* ── TODAY divider ── */}
                        {(hist.length > 0 || tl.length > 0) && (
                            <div style={{
                                padding: '8px 16px',
                                background: '#fef9c3',
                                borderTop: `0.5px solid #fde68a`,
                                borderBottom: `0.5px solid #fde68a`,
                                fontSize: '0.72rem', fontWeight: 800, color: '#92400e',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>▶ Today</span>
                                <span style={{ fontWeight: 500 }}>₪{fmt(forecast.current_balance)}</span>
                            </div>
                        )}

                        {/* ── Individual predictions ── */}
                        {tl.length > 0 && (<>
                            <div style={{
                                padding: '6px 16px', background: '#f9fafb',
                                borderBottom: `0.5px solid ${IOS.separator}`,
                                fontSize: '0.65rem', fontWeight: 700, color: IOS.muted,
                                textTransform: 'uppercase', letterSpacing: '0.4px',
                            }}>
                                Upcoming · {tl.length} items
                            </div>
                            {tl.map((p, idx) => (
                                <PredRow key={idx} p={p} isLast={idx === tl.length - 1} />
                            ))}
                        </>)}

                        {tl.length === 0 && hist.length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                                No data yet — add budget entries and link a bank tab.
                            </div>
                        )}
                    </>)}
                </div>
            )}
        </div>
    );
};

export default MobileBalanceForecast;
