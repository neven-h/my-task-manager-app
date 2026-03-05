import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Scale, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import useBudget from './hooks/useBudget';

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── sub-components ────────────────────────────────────────────────────────────

const SummaryCard = ({ icon: Icon, label, amount, color, sub }) => (
    <div style={{
        flex: '1 1 180px',
        background: '#fff',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 4,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8E8E93', fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <Icon size={14} color={color} />
            {label}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1.2 }}>
            {sub}{fmt(amount)}
        </div>
    </div>
);

// Inline add/edit form
const EntryForm = ({ initial, onSave, onCancel, loading }) => {
    const [form, setForm] = useState(initial);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.description.trim() || !form.amount || !form.entry_date) return;
        onSave({ ...form, amount: parseFloat(form.amount) });
    };

    const inputStyle = {
        width: '100%', padding: '8px 10px', borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.18)', fontSize: '0.9rem',
        fontFamily: 'inherit', boxSizing: 'border-box',
    };

    return (
        <form onSubmit={handleSubmit} style={{
            background: '#F2F2F7', borderRadius: 12, padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
                {['income', 'outcome'].map(t => (
                    <button key={t} type="button"
                        onClick={() => set('type', t)}
                        style={{
                            flex: 1, padding: '8px 0', borderRadius: 8,
                            border: '1.5px solid ' + (form.type === t ? (t === 'income' ? '#34C759' : '#FF3B30') : 'rgba(0,0,0,0.15)'),
                            background: form.type === t ? (t === 'income' ? '#34C759' : '#FF3B30') : '#fff',
                            color: form.type === t ? '#fff' : '#555',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            textTransform: 'capitalize',
                        }}>
                        {t === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                ))}
            </div>

            {/* Description + Amount side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input required style={inputStyle} placeholder="Description *"
                    value={form.description} onChange={e => set('description', e.target.value)} />
                <input required type="number" min="0.01" step="0.01" style={{ ...inputStyle, width: 120 }}
                    placeholder="Amount *"
                    value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>

            {/* Date + Category side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input required type="date" style={inputStyle}
                    value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
                <input style={inputStyle} placeholder="Category (optional)"
                    value={form.category} onChange={e => set('category', e.target.value)} />
            </div>

            {/* Notes */}
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 52 }}
                placeholder="Notes (optional)"
                value={form.notes} onChange={e => set('notes', e.target.value)} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel}
                    style={{ padding: '8px 18px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Cancel
                </button>
                <button type="submit" disabled={loading}
                    style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: '#007AFF', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
};

// Single entry row
const EntryRow = ({ entry, cutoff, onEdit, onDelete, loading }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isPast = entry.entry_date <= cutoff;
    const isIncome = entry.type === 'income';
    const amountColor = isIncome ? '#34C759' : '#FF3B30';
    const sign = isIncome ? '+' : '−';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            opacity: isPast ? 1 : 0.45,
            transition: 'opacity 180ms',
        }}>
            {/* Type indicator dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: amountColor, flexShrink: 0 }} />

            {/* Date */}
            <div style={{ fontSize: '0.8rem', color: '#8E8E93', width: 70, flexShrink: 0 }}>
                {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>

            {/* Description + category */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.description}
                </div>
                {(entry.category || entry.notes) && (
                    <div style={{ fontSize: '0.75rem', color: '#8E8E93', marginTop: 2 }}>
                        {[entry.category, entry.notes].filter(Boolean).join(' · ')}
                    </div>
                )}
            </div>

            {/* Amount */}
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: amountColor, flexShrink: 0 }}>
                {sign}{fmt(entry.amount)}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {confirmDelete ? (
                    <>
                        <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                            title="Confirm delete"
                            style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#FF3B30', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                            Delete?
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)}
                            style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
                            ✕
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => onEdit(entry)}
                            style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: '#8E8E93', borderRadius: 6 }}
                            title="Edit">
                            <Edit2 size={15} />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: '#8E8E93', borderRadius: 6 }}
                            title="Delete">
                            <Trash2 size={15} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const Budget = ({ onBackToTasks }) => {
    const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry,
        totalIncome, totalOutcome, balance } = useBudget();

    const [cutoff, setCutoff] = useState(today());
    const [typeFilter, setTypeFilter] = useState('all');   // 'all' | 'income' | 'outcome'
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null); // entry obj or null
    const [formInitial, setFormInitial] = useState(emptyForm('income'));

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const income = totalIncome(cutoff);
    const outcome = totalOutcome(cutoff);
    const net = balance(cutoff);

    const visibleEntries = useMemo(() =>
        entries.filter(e => typeFilter === 'all' || e.type === typeFilter),
        [entries, typeFilter]);

    const openAdd = (type) => {
        setEditingEntry(null);
        setFormInitial(emptyForm(type));
        setShowForm(true);
        setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
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
        if (editingEntry) {
            const ok = await updateEntry(editingEntry.id, data);
            if (ok) { setShowForm(false); setEditingEntry(null); }
        } else {
            const ok = await createEntry(data);
            if (ok) { setShowForm(false); }
        }
    };

    const handleCancel = () => { setShowForm(false); setEditingEntry(null); };

    const filterBtnStyle = (active) => ({
        padding: '5px 16px', border: '1.5px solid ' + (active ? '#007AFF' : 'rgba(0,0,0,0.15)'),
        borderRadius: 20, background: active ? '#007AFF' : '#fff',
        color: active ? '#fff' : '#555', fontSize: '0.8rem', fontWeight: 600,
        cursor: 'pointer',
    });

    return (
        <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {/* ── Header ── */}
            <div style={{
                background: '#fff',
                borderBottom: '0.5px solid rgba(0,0,0,0.1)',
                padding: '16px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button onClick={onBackToTasks}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', padding: 0 }}>
                    <ArrowLeft size={18} /> Tasks
                </button>
                <h1 style={{ flex: 1, margin: 0, fontSize: '1.15rem', fontWeight: 700, textAlign: 'center' }}>Budget Planner</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openAdd('income')}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: '#34C759', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                        + Income
                    </button>
                    <button onClick={() => openAdd('outcome')}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: '#FF3B30', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                        + Expense
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

                {/* ── Error ── */}
                {error && (
                    <div style={{ background: '#FFE5E5', border: '1px solid #FF3B30', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                {/* ── Add/Edit form ── */}
                {showForm && (
                    <div id="budget-form" style={{ marginBottom: 20 }}>
                        <EntryForm
                            initial={formInitial}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            loading={loading}
                        />
                    </div>
                )}

                {/* ── Balance as of date ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#555' }}>Balance as of</span>
                    <input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '0.78rem', color: '#8E8E93' }}>
                        (entries after this date are dimmed)
                    </span>
                </div>

                {/* ── Summary cards ── */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <SummaryCard icon={TrendingUp} label="Total Income" amount={income} color="#34C759" sub="+" />
                    <SummaryCard icon={TrendingDown} label="Total Expenses" amount={outcome} color="#FF3B30" sub="−" />
                    <SummaryCard icon={Scale} label="Balance" amount={net} color={net >= 0 ? '#007AFF' : '#FF3B30'} sub={net >= 0 ? '+' : '−'} />
                </div>

                {/* ── Entry list ── */}
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    {/* List header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[['all', 'All'], ['income', 'Income'], ['outcome', 'Expenses']].map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setTypeFilter(val)}
                                    style={filterBtnStyle(typeFilter === val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#8E8E93' }}>
                            {visibleEntries.length} entr{visibleEntries.length === 1 ? 'y' : 'ies'}
                        </span>
                    </div>

                    {/* Rows */}
                    {loading && entries.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#8E8E93', fontSize: '0.9rem' }}>Loading…</div>
                    ) : visibleEntries.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8E8E93' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💰</div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>No entries yet</div>
                            <div style={{ fontSize: '0.85rem' }}>Add your first income or expense above.</div>
                        </div>
                    ) : (
                        visibleEntries.map(e => (
                            <EntryRow
                                key={e.id}
                                entry={e}
                                cutoff={cutoff}
                                onEdit={openEdit}
                                onDelete={deleteEntry}
                                loading={loading}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Budget;
