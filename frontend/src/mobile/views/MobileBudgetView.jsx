import React, { useEffect, useState, useMemo } from 'react';
import {
    ArrowLeft, TrendingUp, TrendingDown, Scale,
    Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronUp, FileDown, Zap,
    MoreHorizontal, RotateCcw,
} from 'lucide-react';
import useBudget from '../../hooks/useBudget';
import { FONT_STACK } from '../../ios/theme';
import {
    groupPredictions, GROUP_META, humanFrequency, humanBasis, activePredictions,
    trendArrow, confidenceLabel, loadDismissed, saveDismissed, emptyStateMessage,
} from '../../utils/forecastHelpers';

// ── design tokens (iOS native) ────────────────────────────────────────────────
const IOS = {
    bg:         '#F2F2F7',
    card:       '#fff',
    separator:  'rgba(0,0,0,0.08)',
    green:      '#34C759',
    red:        '#FF3B30',
    blue:       '#007AFF',
    muted:      '#8E8E93',
    label:      '#3C3C43',
    radius:     16,
    spring:     'cubic-bezier(0.22,1,0.36,1)',
};

// ── helpers ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const emptyForm = (type = 'income') => ({
    type,
    description: '',
    amount: '',
    entry_date: today(),
    category: '',
    notes: '',
});

// ── Summary card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, amount, color, sign }) => (
    <div style={{
        flex: '1 1 0',
        background: IOS.card,
        borderRadius: IOS.radius,
        padding: '14px 14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column', gap: 4,
        minWidth: 0,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: IOS.muted, fontSize: '0.7rem', fontWeight: 500 }}>
            <Icon size={12} color={color} />
            <span style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
        </div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color, lineHeight: 1.2, wordBreak: 'break-all' }}>
            {sign}{fmt(amount)}
        </div>
    </div>
);

// ── Bottom-sheet entry form ───────────────────────────────────────────────────
const EntrySheet = ({ initial, onSave, onCancel, loading }) => {
    const [form, setForm] = useState(initial);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const [mounted, setMounted] = useState(false);

    useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

    const inputStyle = {
        width: '100%',
        padding: '13px 14px',
        borderRadius: 12,
        border: `1px solid ${IOS.separator}`,
        fontSize: '1rem',
        fontFamily: FONT_STACK,
        background: '#F2F2F7',
        boxSizing: 'border-box',
        outline: 'none',
        color: '#000',
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.description.trim() || !form.amount || !form.entry_date) return;
        onSave({ ...form, amount: parseFloat(form.amount) });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onCancel}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    zIndex: 200,
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 300ms ${IOS.spring}`,
                }}
            />
            {/* Sheet */}
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                background: IOS.card,
                borderRadius: '20px 20px 0 0',
                zIndex: 201,
                padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
                transform: mounted ? 'translateY(0)' : 'translateY(100%)',
                transition: `transform 380ms ${IOS.spring}`,
            }}>
                {/* Pull handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: IOS.separator }} />
                </div>

                {/* Sheet header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 16px' }}>
                    <button type="button" onClick={onCancel}
                        style={{ background: 'none', border: 'none', color: IOS.blue, fontSize: '1rem', cursor: 'pointer', padding: '4px 0', fontFamily: FONT_STACK }}>
                        Cancel
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {initial.description ? 'Edit Entry' : 'New Entry'}
                    </span>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        style={{ background: 'none', border: 'none', color: loading ? IOS.muted : IOS.blue, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontFamily: FONT_STACK }}>
                        {loading ? '…' : 'Save'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Type toggle */}
                    <div style={{ display: 'flex', gap: 8, background: IOS.bg, borderRadius: 12, padding: 4 }}>
                        {[['income', '↑ Income', IOS.green], ['outcome', '↓ Expense', IOS.red]].map(([t, label, color]) => (
                            <button key={t} type="button" onClick={() => set('type', t)}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 9,
                                    border: 'none',
                                    background: form.type === t ? IOS.card : 'transparent',
                                    color: form.type === t ? color : IOS.muted,
                                    fontWeight: form.type === t ? 700 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: form.type === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: `all 200ms ${IOS.spring}`,
                                    fontFamily: FONT_STACK,
                                }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Description */}
                    <input required style={inputStyle} placeholder="Description *"
                        value={form.description} onChange={e => set('description', e.target.value)} />

                    {/* Amount + Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <input required type="number" min="0.01" step="0.01"
                            style={inputStyle} placeholder="Amount *"
                            value={form.amount} onChange={e => set('amount', e.target.value)} />
                        <input required type="date" style={inputStyle}
                            value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
                    </div>

                    {/* Category */}
                    <input style={inputStyle} placeholder="Category (optional)"
                        value={form.category} onChange={e => set('category', e.target.value)} />

                    {/* Notes */}
                    <textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 }}
                        placeholder="Notes (optional)"
                        value={form.notes} onChange={e => set('notes', e.target.value)} />
                </form>
            </div>
        </>
    );
};

// ── Entry row (expandable) ────────────────────────────────────────────────────
const EntryRow = ({ entry, cutoff, onEdit, onDelete, isLast, isExpanded, onToggleExpand, history }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pressed, setPressed] = useState(false);
    const isPast = entry.entry_date <= cutoff;
    const isIncome = entry.type === 'income';
    const dotColor = isIncome ? IOS.green : IOS.red;
    const sign = isIncome ? '+' : '−';

    return (
        <>
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    borderBottom: (isLast && !isExpanded) ? 'none' : `0.5px solid ${IOS.separator}`,
                    opacity: isPast ? 1 : 0.42,
                    background: pressed ? '#F2F2F7' : IOS.card,
                    transition: `opacity 200ms, background 120ms`,
                }}
                onTouchStart={() => setPressed(true)}
                onTouchEnd={() => setPressed(false)}
            >
                {/* Type dot */}
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

                {/* Date */}
                <div style={{ fontSize: '0.78rem', color: IOS.muted, width: 60, flexShrink: 0, lineHeight: 1.3 }}>
                    {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>

                {/* Description + meta (clickable to expand) */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onToggleExpand(entry.id)}>
                    <div style={{
                        fontWeight: 500, fontSize: '0.9rem',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        borderBottom: '1px dashed #bbb', display: 'inline',
                        paddingBottom: 1,
                    }}>
                        {entry.description}
                    </div>
                    {(entry.category || entry.notes) && (
                        <div style={{ fontSize: '0.72rem', color: IOS.muted, marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {[entry.category, entry.notes].filter(Boolean).join(' · ')}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: dotColor, flexShrink: 0, marginRight: 4 }}>
                    {sign}{fmt(entry.amount)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {confirmDelete ? (
                        <>
                            <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                                style={{ padding: '4px 10px', border: 'none', borderRadius: 7, background: IOS.red, color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                Delete?
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(false)}
                                style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 7, background: '#fff', fontSize: '0.72rem', cursor: 'pointer' }}>
                                ✕
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => onEdit(entry)}
                                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Expanded history */}
            {isExpanded && history.length > 0 && (
                <div style={{
                    background: IOS.bg,
                    borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                    padding: '4px 16px 8px 36px',
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        Recent with same description
                    </div>
                    {history.map(h => (
                        <div key={h.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '5px 0',
                            fontSize: '0.78rem', color: IOS.muted,
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.type === 'income' ? IOS.green : IOS.red, flexShrink: 0 }} />
                            <div style={{ width: 55, flexShrink: 0, fontWeight: 600 }}>
                                {new Date(h.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {h.description}
                            </div>
                            <div style={{ fontWeight: 600, color: h.type === 'income' ? IOS.green : IOS.red, flexShrink: 0 }}>
                                {h.type === 'income' ? '+' : '−'}{fmt(h.amount)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

// ── Forecast section (iOS) ────────────────────────────────────────────────────
// ── Mobile budget prediction row (AI UX: progressive disclosure + dismiss) ────
const MBPredRow = ({ p, isLast, onDismiss, onRestore }) => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const isIncome = p.type === 'income';
    const color = isIncome ? IOS.green : IOS.red;
    const trend = trendArrow(p.trend);
    const conf = confidenceLabel(p.confidence);

    return (
        <div style={{ opacity: p._dismissed ? 0.35 : 1, textDecoration: p._dismissed ? 'line-through' : 'none', transition: 'opacity 0.2s' }}>
            <div onClick={() => !p._dismissed && setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                    fontSize: '0.82rem', cursor: 'pointer',
                }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.description}</div>
                    <div style={{ fontSize: '0.72rem', color: IOS.muted }}>
                        {new Date(p.predicted_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' · '}{humanFrequency(p.interval_days)}
                    </div>
                </div>
                <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '0.85rem', color: trend.color }} title={trend.label}>
                    {trend.symbol}
                </span>
                <div style={{ fontWeight: 700, color, flexShrink: 0 }}>{isIncome ? '+' : '−'}{fmt(p.predicted_amount)}</div>
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
                    {p.predicted_amount_low != null && <span>{fmt(p.predicted_amount_low)} – {fmt(p.predicted_amount_high)}</span>}
                    <span style={{ color: trend.color }}>{trend.label}</span>
                </div>
            )}
        </div>
    );
};

const MBGroupSection = ({ groupKey, items, onDismiss, onRestore }) => {
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
                <MBPredRow key={p._idx} p={p} isLast={i === items.length - 1}
                    onDismiss={() => onDismiss(p._idx)} onRestore={() => onRestore(p._idx)} />
            ))}
        </>
    );
};

const BUDGET_FORECAST_KEY = 'budget';

const ForecastSection = ({ predictions, onFetch, loading }) => {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => loadDismissed(BUDGET_FORECAST_KEY));

    const handleToggle = () => {
        if (!open && predictions.length === 0) onFetch();
        setOpen(o => !o);
    };

    const dismiss = (idx) => setDismissed(prev => { const s = new Set(prev).add(idx); saveDismissed(BUDGET_FORECAST_KEY, s); return s; });
    const restore = (idx) => setDismissed(prev => { const s = new Set(prev); s.delete(idx); saveDismissed(BUDGET_FORECAST_KEY, s); return s; });

    const active = activePredictions(predictions, dismissed);
    const totalIncome = active.filter(p => p.type === 'income').reduce((s, p) => s + p.predicted_amount, 0);
    const totalExpense = active.filter(p => p.type === 'outcome').reduce((s, p) => s + p.predicted_amount, 0);
    const projectedNet = totalIncome - totalExpense;
    const groups = useMemo(() => groupPredictions(predictions, dismissed), [predictions, dismissed]);

    return (
        <div style={{ margin: '16px 16px 0' }}>
            <button type="button" onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 16px',
                    border: 'none', borderRadius: IOS.radius,
                    background: open ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : IOS.card,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    fontFamily: FONT_STACK, color: open ? '#fff' : '#000',
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
                    {loading && predictions.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Analyzing patterns…
                        </div>
                    ) : predictions.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            {emptyStateMessage(false)}
                        </div>
                    ) : (<>
                        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `0.5px solid ${IOS.separator}`, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>3-month projection:</span>
                            <span style={{ fontWeight: 700, color: IOS.green, fontSize: '0.85rem' }}>+{fmt(totalIncome)}</span>
                            <span style={{ fontWeight: 700, color: IOS.red, fontSize: '0.85rem' }}>−{fmt(totalExpense)}</span>
                            <span style={{ fontWeight: 700, color: projectedNet >= 0 ? IOS.blue : IOS.red, fontSize: '0.85rem' }}>
                                Net: {projectedNet >= 0 ? '+' : '−'}{fmt(projectedNet)}
                            </span>
                            {dismissed.size > 0 && <span style={{ fontSize: '0.72rem', color: IOS.muted }}>({dismissed.size} dismissed)</span>}
                        </div>
                        <MBGroupSection groupKey="fixed" items={groups.fixed} onDismiss={dismiss} onRestore={restore} />
                        <MBGroupSection groupKey="variable" items={groups.variable} onDismiss={dismiss} onRestore={restore} />
                        <MBGroupSection groupKey="anomalies" items={groups.anomalies} onDismiss={dismiss} onRestore={restore} />
                    </>)}
                </div>
            )}
        </div>
    );
};

// ── Main view ──────────────────────────────────────────────────────────────────
const MobileBudgetView = ({ onBack }) => {
    const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry,
        totalIncome, totalOutcome, balance, getDescriptionHistory,
        predictions, fetchPredictions, exportBudgetCSV } = useBudget();

    const [cutoff, setCutoff]             = useState(today());
    const [typeFilter, setTypeFilter]     = useState('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showForm, setShowForm]         = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formInitial, setFormInitial]   = useState(emptyForm('income'));
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const income  = totalIncome(cutoff);
    const outcome = totalOutcome(cutoff);
    const net     = balance(cutoff);

    const visibleEntries = useMemo(() =>
        entries.filter(e => typeFilter === 'all' || e.type === typeFilter),
        [entries, typeFilter]);

    const openAdd = (type) => {
        setEditingEntry(null);
        setFormInitial(emptyForm(type));
        setShowForm(true);
    };

    const openEdit = (entry) => {
        setEditingEntry(entry);
        setFormInitial({
            type: entry.type,
            description: entry.description,
            amount: String(entry.amount),
            entry_date: entry.entry_date,
            category: entry.category || '',
            notes: entry.notes || '',
        });
        setShowForm(true);
    };

    const handleSave = async (data) => {
        const ok = editingEntry
            ? await updateEntry(editingEntry.id, data)
            : await createEntry(data);
        if (ok) { setShowForm(false); setEditingEntry(null); }
    };

    const handleCancel = () => { setShowForm(false); setEditingEntry(null); };

    const filterTabs = [['all', 'All'], ['income', 'Income'], ['outcome', 'Expenses']];

    return (
        <div style={{ minHeight: '100vh', background: IOS.bg, fontFamily: FONT_STACK, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>

            {/* ── Sticky header ── */}
            <div style={{
                background: IOS.card,
                borderBottom: `0.5px solid ${IOS.separator}`,
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
                paddingBottom: 12,
                paddingLeft: 8,
                paddingRight: 8,
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center' }}>
                    <button onClick={onBack}
                        style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={22} color={IOS.blue} />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>
                        Budget Planner
                    </h1>
                    <button onClick={() => exportBudgetCSV()}
                        disabled={entries.length === 0}
                        style={{ background: 'none', border: 'none', padding: '10px', cursor: entries.length === 0 ? 'default' : 'pointer',
                            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: entries.length === 0 ? 0.3 : 1 }}>
                        <FileDown size={20} color={IOS.blue} />
                    </button>
                </div>
            </div>

            <div style={{ padding: '16px 16px 0' }}>

                {/* ── Error ── */}
                {error && (
                    <div style={{ background: '#FFE5E5', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#CC0000', fontSize: '0.82rem' }}>
                        {error}
                    </div>
                )}

                {/* ── Balance as of date ── */}
                <div style={{ background: IOS.card, borderRadius: IOS.radius, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 12, overflow: 'hidden' }}>
                    <button type="button"
                        onClick={() => setShowDatePicker(p => !p)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 16px', fontFamily: FONT_STACK }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: IOS.label }}>Balance as of</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: IOS.blue, fontWeight: 600, fontSize: '0.9rem' }}>
                            {new Date(cutoff + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                    </button>
                    {showDatePicker && (
                        <div style={{ padding: '0 16px 14px', borderTop: `0.5px solid ${IOS.separator}` }}>
                            <input type="date" value={cutoff}
                                onChange={e => { setCutoff(e.target.value); setShowDatePicker(false); }}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: `1px solid ${IOS.separator}`, fontSize: '1rem',
                                    fontFamily: FONT_STACK, boxSizing: 'border-box',
                                    background: IOS.bg, marginTop: 12 }} />
                            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: IOS.muted, textAlign: 'center' }}>
                                Entries after this date are shown dimmed
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Summary cards ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <SummaryCard icon={TrendingUp}   label="Income"   amount={income}  color={IOS.green} sign="+" />
                    <SummaryCard icon={TrendingDown} label="Expenses" amount={outcome} color={IOS.red}   sign="−" />
                    <SummaryCard icon={Scale}        label="Balance"  amount={net}     color={net >= 0 ? IOS.blue : IOS.red} sign={net >= 0 ? '+' : '−'} />
                </div>

                {/* ── Quick add buttons ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => openAdd('income')}
                        style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
                            background: IOS.green, color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                            cursor: 'pointer', fontFamily: FONT_STACK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={16} /> Income
                    </button>
                    <button onClick={() => openAdd('outcome')}
                        style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
                            background: IOS.red, color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                            cursor: 'pointer', fontFamily: FONT_STACK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={16} /> Expense
                    </button>
                </div>
            </div>

            {/* ── Entry list card ── */}
            <div style={{ margin: '0 16px', background: IOS.card, borderRadius: IOS.radius, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', borderBottom: `0.5px solid ${IOS.separator}`, padding: '10px 12px', gap: 6 }}>
                    {filterTabs.map(([val, label]) => {
                        const active = typeFilter === val;
                        return (
                            <button key={val} type="button" onClick={() => setTypeFilter(val)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: 20,
                                    border: 'none',
                                    background: active ? IOS.blue : IOS.bg,
                                    color: active ? '#fff' : IOS.muted,
                                    fontWeight: active ? 600 : 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontFamily: FONT_STACK,
                                    transition: `all 200ms ${IOS.spring}`,
                                }}>
                                {label}
                            </button>
                        );
                    })}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.72rem', color: IOS.muted, alignSelf: 'center' }}>
                        {visibleEntries.length}
                    </span>
                </div>

                {/* Rows */}
                {loading && entries.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: IOS.muted, fontSize: '0.9rem' }}>
                        Loading…
                    </div>
                ) : visibleEntries.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 8 }}>💰</div>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: IOS.label }}>No entries yet</div>
                        <div style={{ fontSize: '0.82rem', color: IOS.muted }}>
                            Tap "+ Income" or "+ Expense" to get started
                        </div>
                    </div>
                ) : (
                    visibleEntries.map((e, idx) => (
                        <EntryRow
                            key={e.id}
                            entry={e}
                            cutoff={cutoff}
                            onEdit={openEdit}
                            onDelete={deleteEntry}
                            isLast={idx === visibleEntries.length - 1}
                            isExpanded={expandedDescriptionId === e.id}
                            onToggleExpand={(id) => setExpandedDescriptionId(prev => prev === id ? null : id)}
                            history={expandedDescriptionId === e.id ? getDescriptionHistory(e) : []}
                        />
                    ))
                )}
            </div>

            {/* ── AI Forecast ── */}
            <ForecastSection
                predictions={predictions}
                onFetch={() => fetchPredictions(3)}
                loading={loading}
            />

            {/* ── Bottom-sheet form ── */}
            {showForm && (
                <EntrySheet
                    initial={formInitial}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    loading={loading}
                />
            )}
        </div>
    );
};

export default MobileBudgetView;
