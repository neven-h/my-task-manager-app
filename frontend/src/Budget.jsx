import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Scale, Edit2, Trash2 } from 'lucide-react';
import useBudget from './hooks/useBudget';
import useBudgetTabs from './hooks/useBudgetTabs';

// ── system palette (matches bank/portfolio design) ─────────────────────────────
const SYS = {
    primary:   '#0000FF',
    success:   '#00AA00',
    accent:    '#FF0000',
    secondary: '#FFD500',
    bg:        '#fff',
    text:      '#000',
    light:     '#666',
    border:    '#000',
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

// ── SummaryCard ────────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, amount, color, sub }) => (
    <div style={{
        flex: '1 1 180px',
        background: SYS.bg,
        border: `3px solid ${SYS.border}`,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 6,
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: SYS.light, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.6px',
        }}>
            <Icon size={13} color={color} />
            {label}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1.15 }}>
            {sub}{fmt(amount)}
        </div>
    </div>
);

// ── EntryForm ──────────────────────────────────────────────────────────────────
const EntryForm = ({ initial, onSave, onCancel, loading }) => {
    const [form, setForm] = useState(initial);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.description.trim() || !form.amount || !form.entry_date) return;
        onSave({ ...form, amount: parseFloat(form.amount) });
    };

    const inputStyle = {
        width: '100%', padding: '8px 10px',
        border: `2px solid ${SYS.border}`, fontSize: '0.88rem',
        fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
        outline: 'none',
    };

    return (
        <form onSubmit={handleSubmit} style={{
            background: '#F5F5F5',
            border: `3px solid ${SYS.border}`,
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
            marginBottom: 20,
        }}>
            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
                {[['income', '↑ INCOME'], ['outcome', '↓ EXPENSE']].map(([t, label]) => (
                    <button key={t} type="button"
                        onClick={() => set('type', t)}
                        style={{
                            flex: 1, padding: '8px 0',
                            border: `2px solid ${SYS.border}`,
                            background: form.type === t
                                ? (t === 'income' ? SYS.success : SYS.accent)
                                : '#fff',
                            color: form.type === t ? '#fff' : SYS.text,
                            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                            letterSpacing: '0.5px',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Description + Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input required style={inputStyle} placeholder="Description *"
                    value={form.description} onChange={e => set('description', e.target.value)} />
                <input required type="number" min="0.01" step="0.01"
                    style={{ ...inputStyle, width: 120 }}
                    placeholder="Amount *"
                    value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>

            {/* Date + Category */}
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
                    style={{
                        padding: '8px 20px', border: `2px solid ${SYS.border}`,
                        background: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>
                    Cancel
                </button>
                <button type="submit" disabled={loading}
                    style={{
                        padding: '8px 20px', border: `2px solid ${SYS.border}`,
                        background: SYS.primary, color: '#fff', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.4px', opacity: loading ? 0.6 : 1,
                    }}>
                    {loading ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
};

// ── EntryRow ───────────────────────────────────────────────────────────────────
const EntryRow = ({ entry, cutoff, onEdit, onDelete, loading }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isPast = entry.entry_date <= cutoff;
    const isIncome = entry.type === 'income';
    const amountColor = isIncome ? SYS.success : SYS.accent;
    const sign = isIncome ? '+' : '−';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: `1px solid ${SYS.border}`,
            opacity: isPast ? 1 : 0.4,
        }}>
            {/* Type indicator */}
            <div style={{ width: 8, height: 8, background: amountColor, flexShrink: 0 }} />

            {/* Date */}
            <div style={{ fontSize: '0.78rem', color: SYS.light, width: 68, flexShrink: 0, fontWeight: 600 }}>
                {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>

            {/* Description + category */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.description}
                </div>
                {(entry.category || entry.notes) && (
                    <div style={{ fontSize: '0.74rem', color: SYS.light, marginTop: 2 }}>
                        {[entry.category, entry.notes].filter(Boolean).join(' · ')}
                    </div>
                )}
            </div>

            {/* Amount */}
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: amountColor, flexShrink: 0 }}>
                {sign}{fmt(entry.amount)}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {confirmDelete ? (
                    <>
                        <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                            style={{ padding: '3px 10px', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                            Delete?
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)}
                            style={{ padding: '3px 8px', border: `2px solid ${SYS.border}`, background: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>
                            ✕
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => onEdit(entry)}
                            style={{ background: 'none', border: 'none', padding: '3px 6px', cursor: 'pointer', color: SYS.light }}
                            title="Edit">
                            <Edit2 size={14} />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            style={{ background: 'none', border: 'none', padding: '3px 6px', cursor: 'pointer', color: SYS.light }}
                            title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────
const Budget = ({ onBackToTasks }) => {
    const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry } = useBudget();
    const { tabs, fetchTabs, createTab, deleteTab } = useBudgetTabs();

    const [cutoff, setCutoff]             = useState(today());
    const [typeFilter, setTypeFilter]     = useState('all');
    const [activeTabId, setActiveTabId]   = useState(null);
    const [showForm, setShowForm]         = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formInitial, setFormInitial]   = useState(emptyForm('income'));
    const [newTabName, setNewTabName]     = useState('');
    const [addingTab, setAddingTab]       = useState(false);
    const [confirmDeleteTab, setConfirmDeleteTab] = useState(null);

    useEffect(() => { fetchEntries(); fetchTabs(); }, [fetchEntries, fetchTabs]);

    const tabEntries = useMemo(() =>
        activeTabId === null
            ? entries
            : entries.filter(e => e.tab_id === activeTabId),
        [entries, activeTabId]);

    const income  = useMemo(() => tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const outcome = useMemo(() => tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const net     = income - outcome;

    const visibleEntries = useMemo(() =>
        tabEntries.filter(e => typeFilter === 'all' || e.type === typeFilter),
        [tabEntries, typeFilter]);

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
            const ok = await createEntry({ ...data, tab_id: activeTabId });
            if (ok) setShowForm(false);
        }
    };

    const handleCancel = () => { setShowForm(false); setEditingEntry(null); };

    const handleAddTab = async () => {
        const name = newTabName.trim();
        if (!name) return;
        const tab = await createTab(name);
        if (tab) { setNewTabName(''); setAddingTab(false); setActiveTabId(tab.id); }
    };

    const handleDeleteTab = async (tabId) => {
        const ok = await deleteTab(tabId);
        if (ok && activeTabId === tabId) setActiveTabId(null);
        setConfirmDeleteTab(null);
    };

    // ── shared button styles ───────────────────────────────────────────────────
    const filterBtn = (active, color = SYS.primary) => ({
        padding: '5px 16px',
        border: `2px solid ${SYS.border}`,
        background: active ? color : '#fff',
        color: active ? '#fff' : SYS.text,
        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.4px',
    });

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>

            {/* ── Header ── */}
            <div style={{
                background: SYS.bg,
                borderBottom: `3px solid ${SYS.border}`,
                padding: '14px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button onClick={onBackToTasks}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: SYS.primary, fontWeight: 700, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.4px', padding: 0,
                    }}>
                    ← Tasks
                </button>
                <h1 style={{
                    flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 800,
                    textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                    Budget Planner
                </h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openAdd('income')}
                        style={{
                            padding: '7px 14px', border: `2px solid ${SYS.border}`,
                            background: SYS.success, color: '#fff',
                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                        }}>
                        + Income
                    </button>
                    <button onClick={() => openAdd('outcome')}
                        style={{
                            padding: '7px 14px', border: `2px solid ${SYS.border}`,
                            background: SYS.accent, color: '#fff',
                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                        }}>
                        + Expense
                    </button>
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div style={{
                background: SYS.bg,
                borderBottom: `3px solid ${SYS.border}`,
                padding: '0 20px',
                display: 'flex', alignItems: 'center', gap: 0,
                overflowX: 'auto',
            }}>
                {/* "All" tab */}
                <button type="button" onClick={() => setActiveTabId(null)}
                    style={{
                        padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '0.82rem', fontWeight: 700,
                        color: activeTabId === null ? SYS.primary : SYS.text,
                        borderBottom: activeTabId === null ? `3px solid ${SYS.primary}` : '3px solid transparent',
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                    All
                </button>

                {tabs.map(tab => (
                    <div key={tab.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button type="button" onClick={() => setActiveTabId(tab.id)}
                            style={{
                                padding: '10px 14px 10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 700,
                                color: activeTabId === tab.id ? SYS.primary : SYS.text,
                                borderBottom: activeTabId === tab.id ? `3px solid ${SYS.primary}` : '3px solid transparent',
                                textTransform: 'uppercase', letterSpacing: '0.4px',
                                whiteSpace: 'nowrap',
                            }}>
                            {tab.name}
                        </button>
                        {confirmDeleteTab === tab.id ? (
                            <>
                                <button type="button" onClick={() => handleDeleteTab(tab.id)}
                                    style={{ background: SYS.accent, color: '#fff', border: `2px solid ${SYS.border}`, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginRight: 2, textTransform: 'uppercase' }}>
                                    Delete?
                                </button>
                                <button type="button" onClick={() => setConfirmDeleteTab(null)}
                                    style={{ background: 'none', border: 'none', color: SYS.light, cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px', fontWeight: 700 }}>
                                    ✕
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setConfirmDeleteTab(tab.id)}
                                title="Delete tab"
                                style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px', lineHeight: 1, fontWeight: 700 }}>
                                ✕
                            </button>
                        )}
                    </div>
                ))}

                {/* Add tab */}
                {addingTab ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0 6px 8px', flexShrink: 0 }}>
                        <input
                            autoFocus
                            value={newTabName}
                            onChange={e => setNewTabName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTab(); if (e.key === 'Escape') { setAddingTab(false); setNewTabName(''); } }}
                            placeholder="Tab name…"
                            style={{ padding: '4px 8px', border: `2px solid ${SYS.border}`, fontSize: '0.8rem', width: 120, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button type="button" onClick={handleAddTab}
                            style={{ padding: '4px 10px', border: `2px solid ${SYS.border}`, background: SYS.primary, color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                            Add
                        </button>
                        <button type="button" onClick={() => { setAddingTab(false); setNewTabName(''); }}
                            style={{ background: 'none', border: 'none', color: SYS.light, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                            ✕
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setAddingTab(true)}
                        title="Add tab"
                        style={{ padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: SYS.primary, fontSize: '1.2rem', flexShrink: 0, fontWeight: 700 }}>
                        +
                    </button>
                )}
            </div>

            <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px' }}>

                {/* ── Error ── */}
                {error && (
                    <div style={{
                        background: '#fff0f0', border: `2px solid ${SYS.accent}`,
                        padding: '10px 14px', marginBottom: 16,
                        color: SYS.accent, fontSize: '0.85rem', fontWeight: 600,
                    }}>
                        {error}
                    </div>
                )}

                {/* ── Add/Edit form ── */}
                {showForm && (
                    <div id="budget-form">
                        <EntryForm initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} />
                    </div>
                )}

                {/* ── Balance as of date ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light }}>
                        Balance as of
                    </span>
                    <input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)}
                        style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                    <span style={{ fontSize: '0.75rem', color: SYS.light }}>
                        (future entries are dimmed)
                    </span>
                </div>

                {/* ── Summary cards ── */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <SummaryCard icon={TrendingUp}   label="Total Income"   amount={income}  color={SYS.success} sub="+" />
                    <SummaryCard icon={TrendingDown} label="Total Expenses" amount={outcome} color={SYS.accent}  sub="−" />
                    <SummaryCard icon={Scale}        label="Balance"        amount={net}     color={net >= 0 ? SYS.primary : SYS.accent} sub={net >= 0 ? '+' : '−'} />
                </div>

                {/* ── Entry list ── */}
                <div style={{ background: SYS.bg, border: `3px solid ${SYS.border}`, overflow: 'hidden' }}>
                    {/* List header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', borderBottom: `2px solid ${SYS.border}`,
                        background: '#F5F5F5',
                    }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[['all', 'All'], ['income', 'Income'], ['outcome', 'Expenses']].map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setTypeFilter(val)}
                                    style={filterBtn(typeFilter === val, val === 'income' ? SYS.success : val === 'outcome' ? SYS.accent : SYS.primary)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: SYS.light, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {visibleEntries.length} entr{visibleEntries.length === 1 ? 'y' : 'ies'}
                        </span>
                    </div>

                    {/* Rows */}
                    {loading && entries.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: SYS.light, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Loading…
                        </div>
                    ) : visibleEntries.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: SYS.light }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💰</div>
                            <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>No entries yet</div>
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
