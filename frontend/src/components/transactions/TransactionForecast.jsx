import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, MoreHorizontal, X, RotateCcw } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import {
    groupPredictions, GROUP_META, humanFrequency, humanBasis, activePredictions,
} from '../../utils/forecastHelpers';

const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Prediction row (progressive disclosure + action menu) ────────────────────
const PredRow = ({ p, onDismiss, onRestore }) => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div style={{
            borderBottom: '1px dashed #e5e7eb',
            opacity: p._dismissed ? 0.35 : 1,
            textDecoration: p._dismissed ? 'line-through' : 'none',
            transition: 'opacity 0.2s',
        }}>
            <div
                onClick={() => !p._dismissed && setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem',
                }}
            >
                <div style={{ width: 70, flexShrink: 0, fontWeight: 700, color: '#555', fontSize: '0.8rem' }}>
                    {new Date(p.predicted_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {p.description}
                </div>
                <div style={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                    {humanFrequency(p.interval_days)}
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#dc2626', flexShrink: 0 }}>
                    ₪{fmt(p.predicted_amount)}
                </div>

                {/* Action menu */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af' }}
                    >
                        {p._dismissed ? <RotateCcw size={14} /> : <MoreHorizontal size={16} />}
                    </button>
                    {menuOpen && (
                        <div style={{
                            position: 'absolute', right: 0, top: 24, zIndex: 10,
                            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 160, whiteSpace: 'nowrap',
                        }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); p._dismissed ? onRestore() : onDismiss(); setMenuOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '8px 12px', background: 'none', border: 'none',
                                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                    color: p._dismissed ? '#16a34a' : '#dc2626', textAlign: 'left',
                                }}
                            >
                                {p._dismissed
                                    ? <><RotateCcw size={14} /> Restore prediction</>
                                    : <><X size={14} /> Won&#39;t happen this month</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded detail (progressive disclosure — nerdy data) */}
            {expanded && !p._dismissed && (
                <div style={{
                    padding: '4px 16px 10px 82px', fontSize: '0.76rem', color: '#6b7280',
                    display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                    <span>{humanBasis(p.entry_count, p.interval_days)}</span>
                    <span>Confidence: {Math.round(p.confidence * 100)}%</span>
                    {p.predicted_amount_low != null && (
                        <span>Range: ₪{fmt(p.predicted_amount_low)} – ₪{fmt(p.predicted_amount_high)}</span>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Group section header + rows ──────────────────────────────────────────────
const GroupSection = ({ groupKey, items, onDismiss, onRestore }) => {
    if (items.length === 0) return null;
    const meta = GROUP_META[groupKey];
    return (
        <div>
            <div style={{
                padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: meta.color,
            }}>
                <span>{meta.icon}</span> {meta.label}
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#9ca3af' }}>{items.length}</span>
            </div>
            {items.map(p => (
                <PredRow key={p._idx} p={p} onDismiss={() => onDismiss(p._idx)} onRestore={() => onRestore(p._idx)} />
            ))}
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────
const TransactionForecast = () => {
    const { txPredictions, fetchTransactionPredictions, colors } = useBankTransactionContext();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(new Set());

    const toggle = async () => {
        if (!open && txPredictions.length === 0) {
            setLoading(true);
            await fetchTransactionPredictions(3);
            setLoading(false);
        }
        setOpen(v => !v);
    };

    const dismiss = (idx) => setDismissed(prev => new Set(prev).add(idx));
    const restore = (idx) => setDismissed(prev => { const s = new Set(prev); s.delete(idx); return s; });

    const active = activePredictions(txPredictions, dismissed);
    const projectedTotal = active.reduce((s, p) => s + p.predicted_amount, 0);
    const groups = groupPredictions(txPredictions, dismissed);

    return (
        <div style={{ marginBottom: '1.5rem', border: '2px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: '#64748b', color: '#fff', cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                    <Sparkles size={18} />
                    AI Forecast
                    {txPredictions.length > 0 && (
                        <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800, borderRadius: 20 }}>
                            {active.length}{dismissed.size > 0 ? `/${txPredictions.length}` : ''}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {loading && (
                        <div style={{ padding: 20, textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>
                            <span style={{ marginRight: 8 }}>✦</span> Analyzing recurring patterns…
                        </div>
                    )}
                    {!loading && txPredictions.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontWeight: 600 }}>
                            No recurring patterns detected yet. Upload more transaction history.
                        </div>
                    )}
                    {!loading && txPredictions.length > 0 && (<>
                        <div style={{ padding: '10px 20px', background: '#f5f3ff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#6366f1' }}>Next 3 months:</span>
                            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: colors?.accent || '#dc2626' }}>₪{fmt(projectedTotal)}</span>
                            {dismissed.size > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>({dismissed.size} dismissed)</span>
                            )}
                            <button
                                onClick={async (e) => { e.stopPropagation(); setLoading(true); setDismissed(new Set()); await fetchTransactionPredictions(3); setLoading(false); }}
                                style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#6366f1' }}
                            >
                                Refresh
                            </button>
                        </div>
                        <GroupSection groupKey="fixed" items={groups.fixed} onDismiss={dismiss} onRestore={restore} />
                        <GroupSection groupKey="variable" items={groups.variable} onDismiss={dismiss} onRestore={restore} />
                        <GroupSection groupKey="anomalies" items={groups.anomalies} onDismiss={dismiss} onRestore={restore} />
                    </>)}
                </div>
            )}
        </div>
    );
};

export default TransactionForecast;
