import React, { useState, useEffect, useMemo } from 'react';
import { Zap, MoreHorizontal, X, RotateCcw } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import {
    groupPredictions, GROUP_META, humanFrequency, humanBasis, activePredictions,
    trendArrow, confidenceLabel, loadDismissed, saveDismissed, emptyStateMessage,
} from '../../../utils/forecastHelpers';

const IOS = {
    card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93', radius: 16,
};
const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// ── Mobile prediction row (progressive disclosure + dismiss) ─────────────────
const MobilePredRow = ({ p, isLast, onDismiss, onRestore }) => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const trend = trendArrow(p.trend);
    const conf = confidenceLabel(p.confidence);

    return (
        <div style={{
            opacity: p._dismissed ? 0.35 : 1,
            textDecoration: p._dismissed ? 'line-through' : 'none',
            transition: 'opacity 0.2s',
        }}>
            <div onClick={() => !p._dismissed && setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                    fontSize: '0.82rem', cursor: 'pointer',
                }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: IOS.red }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.description}</div>
                    <div style={{ fontSize: '0.72rem', color: IOS.muted }}>{dayFmt(p.predicted_date)} · {humanFrequency(p.interval_days)}</div>
                </div>
                {/* Trend arrow */}
                <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '0.85rem', color: trend.color }} title={trend.label}>
                    {trend.symbol}
                </span>
                <div style={{ fontWeight: 700, color: IOS.red, flexShrink: 0 }}>₪{fmt(p.predicted_amount)}</div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: IOS.muted }}>
                        {p._dismissed ? <RotateCcw size={14} /> : <MoreHorizontal size={16} />}
                    </button>
                    {menuOpen && (
                        <div style={{
                            position: 'absolute', right: 0, top: 22, zIndex: 10,
                            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 170, whiteSpace: 'nowrap',
                        }}>
                            <button onClick={(e) => { e.stopPropagation(); p._dismissed ? onRestore() : onDismiss(); setMenuOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '10px 14px', background: 'none', border: 'none',
                                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                    color: p._dismissed ? IOS.green : IOS.red, textAlign: 'left', fontFamily: FONT_STACK,
                                }}>
                                {p._dismissed ? <><RotateCcw size={14} /> Restore</> : <><X size={14} /> Won&#39;t happen</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {expanded && !p._dismissed && (
                <div style={{ padding: '2px 16px 10px 33px', fontSize: '0.72rem', color: IOS.muted, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>{humanBasis(p.entry_count, p.interval_days)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: conf.color, display: 'inline-block' }} />
                        {conf.text}
                    </span>
                    {p.predicted_amount_low != null && (
                        <span>₪{fmt(p.predicted_amount_low)} – ₪{fmt(p.predicted_amount_high)}</span>
                    )}
                    <span style={{ color: trend.color }}>{trend.label}</span>
                </div>
            )}
        </div>
    );
};

// ── Mobile group header ──────────────────────────────────────────────────────
const MobileGroup = ({ groupKey, items, onDismiss, onRestore }) => {
    if (items.length === 0) return null;
    const meta = GROUP_META[groupKey];
    return (
        <>
            <div style={{
                padding: '7px 16px', background: '#f9f9f9', borderBottom: `0.5px solid ${IOS.separator}`,
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: meta.color, display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <span>{meta.icon}</span> {meta.label}
                <span style={{ marginLeft: 'auto', color: IOS.muted }}>{items.length}</span>
            </div>
            {items.map((p, i) => (
                <MobilePredRow key={p._idx} p={p} isLast={i === items.length - 1}
                    onDismiss={() => onDismiss(p._idx)} onRestore={() => onRestore(p._idx)} />
            ))}
        </>
    );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const MobileBankForecast = ({ predictions, onFetch, loading, tabId }) => {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => loadDismissed(tabId));

    // Reload dismissed set when tab changes
    useEffect(() => { setDismissed(loadDismissed(tabId)); }, [tabId]);

    const handleToggle = () => {
        if (!open && predictions.length === 0) onFetch();
        setOpen(o => !o);
    };

    const dismiss = (idx) => {
        setDismissed(prev => { const s = new Set(prev).add(idx); saveDismissed(tabId, s); return s; });
    };
    const restore = (idx) => {
        setDismissed(prev => { const s = new Set(prev); s.delete(idx); saveDismissed(tabId, s); return s; });
    };

    const active = activePredictions(predictions, dismissed);
    const total = active.reduce((s, p) => s + p.predicted_amount, 0);
    const groups = useMemo(() => groupPredictions(predictions, dismissed), [predictions, dismissed]);

    return (
        <div style={{ margin: '12px 16px 0', fontFamily: FONT_STACK }}>
            <button type="button" onClick={handleToggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 16px',
                border: 'none', borderRadius: IOS.radius,
                background: open ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : IOS.card,
                color: open ? '#fff' : '#000',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: FONT_STACK,
            }}>
                <Zap size={16} />
                {open ? 'Hide' : 'Show'} AI Forecast
                {predictions.length > 0 && (
                    <span style={{
                        background: open ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                        color: open ? '#fff' : '#6366f1',
                        borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                        {active.length}{dismissed.size > 0 ? `/${predictions.length}` : ''}
                    </span>
                )}
            </button>

            {open && (
                <div style={{ background: IOS.card, borderRadius: IOS.radius, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginTop: 8, overflow: 'hidden' }}>
                    {predictions.length === 0 && (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            {loading ? '✦ Analyzing recurring patterns…' : emptyStateMessage(false)}
                        </div>
                    )}
                    {predictions.length > 0 && (<>
                        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `0.5px solid ${IOS.separator}`, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>3-month projection:</span>
                            <span style={{ fontWeight: 700, color: IOS.red, fontSize: '0.88rem' }}>₪{fmt(total)}</span>
                            {dismissed.size > 0 && (
                                <span style={{ fontSize: '0.72rem', color: IOS.muted }}>({dismissed.size} dismissed)</span>
                            )}
                        </div>
                        <MobileGroup groupKey="fixed" items={groups.fixed} onDismiss={dismiss} onRestore={restore} />
                        <MobileGroup groupKey="variable" items={groups.variable} onDismiss={dismiss} onRestore={restore} />
                        <MobileGroup groupKey="anomalies" items={groups.anomalies} onDismiss={dismiss} onRestore={restore} />
                    </>)}
                </div>
            )}
        </div>
    );
};

export default MobileBankForecast;
