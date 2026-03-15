import React, { useState, useMemo, memo } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { trendArrow, confidenceLabel } from '../../utils/forecastHelpers';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666', border: '#000', text: '#000' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const round2 = (n) => Math.round(n * 100) / 100;

// ── History row (monthly aggregate) ─────────────────────────────────────────
const HistoryRow = memo(({ m, isLast }) => {
    const [exp, setExp] = useState(false);
    const netPos = m.net >= 0;

    return (
        <div style={{ borderBottom: isLast ? 'none' : '1px dashed #e5e7eb' }}>
            <div onClick={() => setExp(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', cursor: 'pointer', fontSize: '0.83rem',
            }}>
                {/* Month */}
                <div style={{ width: 75, fontWeight: 700, color: SYS.light, flexShrink: 0, fontSize: '0.78rem' }}>
                    {fmtMonth(m.month)}
                </div>

                {/* Net badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                        background: netPos ? '#f0fdf4' : '#fef2f2',
                        color: netPos ? SYS.success : SYS.accent,
                        padding: '2px 7px', borderRadius: 4,
                        fontWeight: 800, fontSize: '0.76rem',
                    }}>
                        {netPos ? '+' : '−'}{fmt(m.net)}
                    </span>
                    {exp || (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 8 }}>
                            {[
                                m.budget_income > 0  && `+₪${fmt(m.budget_income)} income`,
                                m.budget_expense > 0 && `−₪${fmt(m.budget_expense)} budget`,
                                m.bank_expense > 0   && `−₪${fmt(m.bank_expense)} bank`,
                                m.bank_income > 0    && `+₪${fmt(m.bank_income)} transfers`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>

                {/* Running balance */}
                <div style={{
                    width: 100, textAlign: 'right', fontWeight: 800, flexShrink: 0,
                    color: m.running_balance >= 0 ? SYS.primary : SYS.accent, fontSize: '0.88rem',
                }}>
                    {m.running_balance >= 0 ? '' : '−'}{fmt(m.running_balance)}
                </div>

                {exp ? <ChevronUp size={12} color="#9ca3af" /> : <ChevronDown size={12} color="#9ca3af" />}
            </div>

            {/* Expanded breakdown */}
            {exp && (
                <div style={{
                    padding: '4px 16px 10px 91px', fontSize: '0.78rem',
                    display: 'flex', flexWrap: 'wrap', gap: '6px 18px', color: '#374151',
                }}>
                    {m.budget_income > 0  && <span style={{ color: SYS.success }}>Budget income: +₪{fmt(m.budget_income)}</span>}
                    {m.budget_expense > 0 && <span style={{ color: SYS.accent }}>Budget expense: −₪{fmt(m.budget_expense)}</span>}
                    {m.bank_income > 0    && <span style={{ color: SYS.success }}>Bank transfers in: +₪{fmt(m.bank_income)}</span>}
                    {m.bank_expense > 0   && <span style={{ color: SYS.accent }}>Bank expense: −₪{fmt(m.bank_expense)}</span>}
                </div>
            )}
        </div>
    );
});

// ── Future prediction row ────────────────────────────────────────────────────
const PredRow = memo(({ p, idx, isLast }) => {
    const isIncome = p.type === 'income';
    const trend    = trendArrow(p.trend);
    const conf     = confidenceLabel(p.confidence);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 16px',
            borderBottom: isLast ? 'none' : '1px dashed #ddd',
            fontSize: '0.82rem',
            opacity: 0.85,
            background: idx % 2 === 0 ? '#fff' : '#fafafa',
        }}>
            <div style={{ width: 75, flexShrink: 0, fontWeight: 600, color: SYS.light, fontSize: '0.76rem' }}>
                {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.description}
            </div>
            <div style={{
                width: 44, textAlign: 'center', fontSize: '0.63rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.2px',
                color: p.source === 'bank' ? '#6b7280' : SYS.primary,
            }}>
                {p.source}
            </div>
            <span style={{ flexShrink: 0, fontWeight: 800, color: trend.color, fontSize: '0.82rem' }}
                title={`${trend.label} · ${conf.text} confidence`}>
                {trend.symbol}
            </span>
            <div style={{ width: 90, textAlign: 'right', fontWeight: 800,
                color: isIncome ? SYS.success : SYS.accent, flexShrink: 0 }}>
                {isIncome ? '+' : '−'}{fmt(p.amount)}
            </div>
            <div style={{ width: 100, textAlign: 'right', fontWeight: 700, flexShrink: 0,
                color: p.running_balance >= 0 ? SYS.primary : SYS.accent }}>
                {p.running_balance >= 0 ? '' : '−'}{fmt(p.running_balance)}
            </div>
        </div>
    );
});

// ── Main ─────────────────────────────────────────────────────────────────────
const HIST_SHOW = 3;

const BalanceForecast = ({ forecast, onFetch, loading, linkedTab }) => {
    const [open, setOpen]               = useState(false);
    const [showAllHist, setShowAllHist] = useState(false);

    // Stable refs — prevent useMemo invalidation on unrelated re-renders
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

    // Runway: months until balance hits zero (only when trending negative)
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
        <div style={{ marginTop: 24 }}>
            <button type="button" onClick={handleToggle} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '12px 16px', borderRadius: open ? '10px 10px 0 0' : 10,
                border: '2px solid #e0e0e0',
                background: open ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : '#f9fafb',
                color: open ? '#fff' : SYS.text,
                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                textTransform: 'uppercase', letterSpacing: '0.4px',
                fontFamily: 'inherit', transition: 'all 0.2s ease',
            }}>
                <TrendingUp size={16} />
                {open ? 'Hide' : 'Show'} Cash Flow Timeline
                {/* Projected end badge when closed */}
                {!open && endBal !== undefined && endBal !== null && (
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.8rem', fontWeight: 700,
                        color: endBal >= 0 ? '#2563eb' : '#dc2626',
                    }}>
                        Projected: {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                    </span>
                )}
                {open && tl.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.25)', padding: '1px 8px', borderRadius: 20, fontSize: '0.72rem' }}>
                        {tl.length} items
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    border: '2px solid #e0e0e0', borderTop: 'none',
                    borderRadius: '0 0 10px 10px', background: '#FAFAFA',
                }}>
                    {loading && !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                            Calculating cash flow timeline…
                        </div>
                    ) : !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                            Upload at least 2 months of transactions and add budget entries to enable the timeline.
                        </div>
                    ) : (
                        <>
                            {/* ── Current balance summary ────────────── */}
                            <div style={{
                                display: 'flex', gap: 16, padding: '14px 16px',
                                borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap', alignItems: 'center',
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px' }}>
                                    Balance as of today:
                                </div>
                                <span style={{
                                    fontSize: '1.3rem', fontWeight: 800,
                                    color: forecast.current_balance >= 0 ? SYS.primary : SYS.accent,
                                }}>
                                    {forecast.current_balance >= 0 ? '+' : '−'}₪{fmt(forecast.current_balance)}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: SYS.light, display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                                    <span>In: <b style={{ color: SYS.success }}>+₪{fmt((forecast.budget_income || 0) + (forecast.bank_income || 0))}</b></span>
                                    <span>Out: <b style={{ color: SYS.accent }}>−₪{fmt((forecast.budget_expense || 0) + (forecast.bank_expense || 0))}</b></span>
                                </div>
                                {/* Runway warning */}
                                {runway !== null && (
                                    <div style={{
                                        width: '100%', padding: '5px 10px',
                                        background: runway < 3 ? '#fef2f2' : '#fffbeb',
                                        border: `1px solid ${runway < 3 ? '#fecaca' : '#fde68a'}`,
                                        borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                        color: runway < 3 ? SYS.accent : '#92400e',
                                    }}>
                                        ⚠ At this pace, balance covers ~{runway} more month{runway !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>

                            {/* ── Monthly Outlook table ────────────── */}
                            {monthlyProj.length > 0 && (
                                <>
                                    <div style={{
                                        padding: '5px 16px', background: '#f0fdf4',
                                        fontSize: '0.68rem', fontWeight: 700, color: '#166534',
                                        textTransform: 'uppercase', letterSpacing: '0.4px',
                                        borderBottom: '1px solid #bbf7d0',
                                    }}>
                                        Monthly Outlook
                                    </div>
                                    {/* Table header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        padding: '5px 16px', borderBottom: '1px solid #e5e7eb',
                                        fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af',
                                        textTransform: 'uppercase', letterSpacing: '0.3px',
                                        background: '#f9fafb',
                                    }}>
                                        <div style={{ width: 80 }}>Month</div>
                                        <div style={{ width: 90, textAlign: 'right' }}>In</div>
                                        <div style={{ width: 90, textAlign: 'right' }}>Out</div>
                                        <div style={{ width: 90, textAlign: 'right' }}>Net</div>
                                        <div style={{ flex: 1, textAlign: 'right' }}>End Balance</div>
                                    </div>
                                    {monthlyProj.map((m, i) => {
                                        const netPos = m.net >= 0;
                                        const isLast = i === monthlyProj.length - 1;
                                        return (
                                            <div key={m.month} style={{
                                                display: 'flex', alignItems: 'center',
                                                padding: '7px 16px',
                                                borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                                                fontSize: '0.82rem',
                                                background: i % 2 === 0 ? '#fff' : '#fafafa',
                                            }}>
                                                <div style={{ width: 80, fontWeight: 600, color: SYS.light, fontSize: '0.76rem' }}>
                                                    {fmtMonth(m.month)}
                                                </div>
                                                <div style={{ width: 90, textAlign: 'right', color: SYS.success, fontWeight: 700 }}>
                                                    {m.income > 0 ? `+₪${fmt(m.income)}` : '—'}
                                                </div>
                                                <div style={{ width: 90, textAlign: 'right', color: SYS.accent, fontWeight: 700 }}>
                                                    −₪{fmt(m.expense)}
                                                </div>
                                                <div style={{ width: 90, textAlign: 'right', fontWeight: 800,
                                                    color: netPos ? SYS.success : SYS.accent }}>
                                                    {netPos ? '+' : '−'}₪{fmt(Math.abs(m.net))}
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'right', fontWeight: 700,
                                                    color: m.endBalance >= 0 ? SYS.primary : SYS.accent }}>
                                                    {m.endBalance >= 0 ? '' : '−'}₪{fmt(m.endBalance)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

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

                            {/* ── Future predictions ────────────────── */}
                            {tl.length > 0 && (
                                <>
                                    <div style={{
                                        padding: '5px 16px', background: '#f9fafb',
                                        fontSize: '0.68rem', fontWeight: 700, color: '#6b7280',
                                        textTransform: 'uppercase', letterSpacing: '0.4px',
                                        borderBottom: '1px solid #e5e7eb',
                                    }}>
                                        Upcoming · {tl.length} items
                                    </div>
                                    {/* Column headers */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '5px 16px', borderBottom: '1px solid #e5e7eb',
                                        fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af',
                                        textTransform: 'uppercase', letterSpacing: '0.3px',
                                    }}>
                                        <div style={{ width: 75 }}>Date</div>
                                        <div style={{ flex: 1 }}>Description</div>
                                        <div style={{ width: 44, textAlign: 'center' }}>Source</div>
                                        <div style={{ width: 12 }} />
                                        <div style={{ width: 90, textAlign: 'right' }}>Amount</div>
                                        <div style={{ width: 100, textAlign: 'right' }}>Balance</div>
                                    </div>
                                    {tl.map((p, idx) => (
                                        <PredRow key={idx} p={p} idx={idx} isLast={idx === tl.length - 1} />
                                    ))}
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
                    )}
                </div>
            )}
        </div>
    );
};

export default BalanceForecast;
