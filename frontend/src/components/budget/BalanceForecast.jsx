import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyOutlook } from './BudgetMonthlyOutlook';
import BudgetTimelinePanel from './BudgetTimelinePanel';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666', border: '#000', text: '#000' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const round2 = (n) => Math.round(n * 100) / 100;

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
                                <MonthlyOutlook monthlyProj={monthlyProj} />
                            )}

                            {/* ── Timeline (history + today divider + predictions + footer) ── */}
                            <BudgetTimelinePanel
                                hist={hist}
                                tl={tl}
                                visHist={visHist}
                                hiddenHistCount={hiddenHistCount}
                                showAllHist={showAllHist}
                                setShowAllHist={setShowAllHist}
                                forecast={forecast}
                                endBal={endBal}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default BalanceForecast;
