import React from 'react';
import { HistoryRow } from './BudgetHistoryRow';
import { PredRow } from './BudgetPredRow';

const SYS = { primary: '#0000FF', accent: '#FF0000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const BudgetTimelinePanel = ({ hist, tl, visHist, hiddenHistCount, showAllHist, setShowAllHist, forecast, endBal }) => (
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
);

export default BudgetTimelinePanel;
