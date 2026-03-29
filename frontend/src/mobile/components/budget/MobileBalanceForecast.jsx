import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import ErrorBoundary from '../../../components/ErrorBoundary';
import MonthCard from './MobileMonthCard';
import MobileForecastTimeline from './MobileForecastTimeline';
import relativeTime from '../../../utils/relativeTime';

// Inject spin keyframe once
if (typeof document !== 'undefined' && !document.getElementById('bf-spin')) {
    const s = document.createElement('style');
    s.id = 'bf-spin';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
}

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0.00';
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
};
const round2 = (n) => Math.round(n * 100) / 100;
const HIST_SHOW = 3;

const MobileBalanceForecast = ({ forecast, onFetch, onRefresh, loading, linkedTab, lastUpdated }) => {
    const [open, setOpen]               = useState(false);
    const [showAllHist, setShowAllHist] = useState(false);
    const [timeAgo, setTimeAgo]         = useState(null);

    useEffect(() => {
        setTimeAgo(relativeTime(lastUpdated));
        if (!lastUpdated) return;
        const id = setInterval(() => setTimeAgo(relativeTime(lastUpdated)), 30_000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    const tl   = useMemo(() => Array.isArray(forecast?.timeline) ? forecast.timeline : [], [forecast]);
    const hist = useMemo(() => Array.isArray(forecast?.history_timeline) ? forecast.history_timeline : [], [forecast]);

    const monthlyProj = useMemo(() => {
        if (!tl.length) return [];
        const byMonth = {};
        for (const item of tl) {
            const mk = item.date.slice(0, 7);
            if (!byMonth[mk]) byMonth[mk] = { income: 0, expense: 0, endBalance: item.running_balance };
            if (item.type === 'income') byMonth[mk].income += item.amount; else byMonth[mk].expense += item.amount;
            byMonth[mk].endBalance = item.running_balance;
        }
        return Object.entries(byMonth).sort().map(([mk, v]) => ({
            month: mk, income: round2(v.income), expense: round2(v.expense),
            net: round2(v.income - v.expense), endBalance: v.endBalance,
        }));
    }, [tl]);

    const runway = useMemo(() => {
        if (!forecast || !monthlyProj.length) return null;
        const avgNet = monthlyProj.reduce((s, m) => s + m.net, 0) / monthlyProj.length;
        if (avgNet >= 0) return null;
        const months = Math.floor(forecast.current_balance / Math.abs(avgNet));
        return months > 0 ? months : 0;
    }, [forecast, monthlyProj]);

    if (!linkedTab) return null;

    const visHist         = showAllHist ? hist : hist.slice(-HIST_SHOW);
    const hiddenHistCount = hist.length - HIST_SHOW;

    const handleToggle = () => {
        if (!open && !forecast) onFetch();
        setOpen(o => !o);
    };

    const endBal = forecast?.forecast_end_balance;

    return (
        <div style={{ margin: '16px 16px 0' }}>
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
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: endBal >= 0 ? IOS.blue : IOS.red }}>
                        {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                    </span>
                )}
                {open && tl.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.25)', padding: '1px 8px', borderRadius: 12, fontSize: '0.72rem' }}>
                        {tl.length} ahead
                    </span>
                )}
                {open && (
                    <span onClick={e => { e.stopPropagation(); onRefresh(); }}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: 4 }}>
                        <RefreshCw size={13} style={{ color: open ? '#fff' : IOS.blue, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </span>
                )}
            </button>

            {open && (
                <ErrorBoundary>
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
                        <div style={{ padding: '16px 16px 12px', textAlign: 'center', borderBottom: `0.5px solid ${IOS.separator}` }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Balance today
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: forecast.current_balance >= 0 ? IOS.blue : IOS.red }}>
                                {forecast.current_balance >= 0 ? '+' : '−'}₪{fmt(forecast.current_balance)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: IOS.muted, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12 }}>
                                <span>In: <b style={{ color: IOS.green }}>+₪{fmt((forecast.budget_income || 0) + (forecast.bank_income || 0))}</b></span>
                                <span>Out: <b style={{ color: IOS.red }}>−₪{fmt((forecast.budget_expense || 0) + (forecast.bank_expense || 0))}</b></span>
                            </div>
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
                            {endBal != null && (
                                <div style={{ marginTop: runway ? 4 : 8, fontSize: '0.72rem', color: IOS.muted }}>
                                    Projected end:{' '}
                                    <b style={{ color: endBal >= 0 ? IOS.blue : IOS.red }}>
                                        {endBal >= 0 ? '+' : '−'}₪{fmt(endBal)}
                                    </b>
                                </div>
                            )}
                            <div style={{ marginTop: 6, fontSize: '0.68rem', color: IOS.muted, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                {forecast.linked_tab && <span>🔗 {linkedTab?.name || forecast.linked_tab}</span>}
                                {timeAgo && <span>Updated {timeAgo}</span>}
                            </div>
                        </div>

                        {/* ── Monthly Outlook ── */}
                        {monthlyProj.length > 0 && (
                            <>
                                <div style={{ padding: '6px 16px', background: '#f0fdf4', borderBottom: `0.5px solid #bbf7d0`, fontSize: '0.65rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Monthly Outlook
                                </div>
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', borderBottom: `0.5px solid ${IOS.separator}` }}>
                                    {monthlyProj.map(m => <MonthCard key={m.month} m={m} />)}
                                </div>
                            </>
                        )}

                        <MobileForecastTimeline
                            hist={hist} tl={tl} visHist={visHist}
                            hiddenHistCount={hiddenHistCount}
                            showAllHist={showAllHist} setShowAllHist={setShowAllHist}
                            forecast={forecast}
                        />
                    </>)}
                </div>
                </ErrorBoundary>
            )}
        </div>
    );
};

export default MobileBalanceForecast;
