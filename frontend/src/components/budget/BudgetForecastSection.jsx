import React, { useState } from 'react';
import { Zap, MoreHorizontal, X, RotateCcw } from 'lucide-react';
import { groupPredictions, GROUP_META, humanFrequency, humanBasis, activePredictions } from '../../utils/forecastHelpers';

const SYS = {
    primary:   '#0000FF',
    success:   '#00AA00',
    accent:    '#FF0000',
    text:      '#000',
    light:     '#666',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const BudgetPredRow = ({ p, onDismiss, onRestore }) => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const isIncome = p.type === 'income';
    const amtColor = isIncome ? SYS.success : SYS.accent;

    return (
        <div style={{
            borderBottom: '1px dashed #ccc',
            opacity: p._dismissed ? 0.35 : 1,
            textDecoration: p._dismissed ? 'line-through' : 'none',
            transition: 'opacity 0.2s',
        }}>
            <div onClick={() => !p._dismissed && setExpanded(e => !e)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem' }}>
                <div style={{ width: 8, height: 8, background: amtColor, flexShrink: 0, borderRadius: '50%' }} />
                <div style={{ width: 80, flexShrink: 0, fontWeight: 600, color: SYS.light }}>
                    {new Date(p.predicted_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                <div style={{ flexShrink: 0, fontSize: '0.73rem', fontWeight: 600, color: SYS.light }}>{humanFrequency(p.interval_days)}</div>
                <div style={{ fontWeight: 800, color: amtColor, flexShrink: 0 }}>{isIncome ? '+' : '−'}{fmt(p.predicted_amount)}</div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: SYS.light }}>
                        {p._dismissed ? <RotateCcw size={13} /> : <MoreHorizontal size={15} />}
                    </button>
                    {menuOpen && (
                        <div style={{
                            position: 'absolute', right: 0, top: 22, zIndex: 10,
                            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 160, whiteSpace: 'nowrap',
                        }}>
                            <button onClick={(e) => { e.stopPropagation(); p._dismissed ? onRestore() : onDismiss(); setMenuOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '8px 12px', background: 'none', border: 'none',
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    color: p._dismissed ? SYS.success : SYS.accent, textAlign: 'left',
                                }}>
                                {p._dismissed ? <><RotateCcw size={13} /> Restore</> : <><X size={13} /> Won&#39;t happen</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {expanded && !p._dismissed && (
                <div style={{ padding: '4px 16px 10px 100px', fontSize: '0.74rem', color: SYS.light, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>{humanBasis(p.entry_count, p.interval_days)}</span>
                    <span>Confidence: {Math.round(p.confidence * 100)}%</span>
                    {p.predicted_amount_low != null && <span>Range: {fmt(p.predicted_amount_low)} – {fmt(p.predicted_amount_high)}</span>}
                </div>
            )}
        </div>
    );
};

const BudgetGroupSection = ({ groupKey, items, onDismiss, onRestore }) => {
    if (items.length === 0) return null;
    const meta = GROUP_META[groupKey];
    return (
        <div>
            <div style={{
                padding: '7px 16px', background: '#f5f5f5', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: meta.color,
            }}>
                <span>{meta.icon}</span> {meta.label}
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: SYS.light }}>{items.length}</span>
            </div>
            {items.map(p => (
                <BudgetPredRow key={p._idx} p={p} onDismiss={() => onDismiss(p._idx)} onRestore={() => onRestore(p._idx)} />
            ))}
        </div>
    );
};

export const ForecastSection = ({ predictions, onFetch, loading }) => {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(new Set());

    const handleToggle = () => {
        if (!open && predictions.length === 0) onFetch();
        setOpen(o => !o);
    };

    const dismiss = (idx) => setDismissed(prev => new Set(prev).add(idx));
    const restore = (idx) => setDismissed(prev => { const s = new Set(prev); s.delete(idx); return s; });

    // Cap to top 15 most confident predictions to keep it concise
    const capped = predictions.length > 15
        ? [...predictions].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 15)
        : predictions;
    const active = activePredictions(capped, dismissed);
    const totalIncome = active.filter(p => p.type === 'income').reduce((s, p) => s + p.predicted_amount, 0);
    const totalExpense = active.filter(p => p.type === 'outcome').reduce((s, p) => s + p.predicted_amount, 0);
    const projectedNet = totalIncome - totalExpense;
    const groups = groupPredictions(capped, dismissed);

    return (
        <div style={{ marginTop: 24 }}>
            <button type="button" onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '12px 16px', borderRadius: open ? '10px 10px 0 0' : 10,
                    border: '2px solid #e0e0e0',
                    background: open ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f9fafb',
                    color: open ? '#fff' : SYS.text,
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    fontFamily: 'inherit', transition: 'all 0.2s ease',
                }}>
                <Zap size={16} />
                {open ? 'Hide' : 'Show'} AI Forecast (3 months)
            </button>

            {open && (
                <div style={{ border: '2px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#FAFAFA' }}>
                    {predictions.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                            {loading ? 'Analyzing patterns…' : 'Not enough recurring data to predict. Add more entries with the same description.'}
                        </div>
                    ) : (<>
                        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px' }}>
                                Next 3 months:
                            </div>
                            <span style={{ fontWeight: 800, color: SYS.success }}>+{fmt(totalIncome)}</span>
                            <span style={{ fontWeight: 800, color: SYS.accent }}>−{fmt(totalExpense)}</span>
                            <span style={{ fontWeight: 800, color: projectedNet >= 0 ? SYS.primary : SYS.accent }}>
                                Net: {projectedNet >= 0 ? '+' : '−'}{fmt(projectedNet)}
                            </span>
                            {dismissed.size > 0 && (
                                <span style={{ fontSize: '0.73rem', color: SYS.light }}>({dismissed.size} dismissed)</span>
                            )}
                        </div>
                        <BudgetGroupSection groupKey="fixed" items={groups.fixed} onDismiss={dismiss} onRestore={restore} />
                        <BudgetGroupSection groupKey="variable" items={groups.variable} onDismiss={dismiss} onRestore={restore} />
                    </>)}
                </div>
            )}
        </div>
    );
};

export default ForecastSection;
