import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wrench, Plus, ChevronDown, ChevronRight, Trash2, Edit2, X, Check } from 'lucide-react';
import useRenovation from './hooks/useRenovation';
import API_BASE from './config';
import { getAuthHeaders } from './api.js';

const SYS = {
    primary: '#0000FF',
    accent: '#FF0000',
    success: '#00AA00',
    bg: '#fff',
    text: '#000',
    light: '#666',
    border: '#000',
    borderLight: '#ddd',
};

const STATUS_COLORS = {
    planned: '#0000FF',
    in_progress: '#FF8800',
    done: '#00AA00',
};

const STATUS_LABELS = {
    planned: 'Planned',
    in_progress: 'In Progress',
    done: 'Done',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n ?? 0));

const fmtDec = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n ?? 0));

// ── Summary bar ────────────────────────────────────────────────────────────────

const SummaryBar = ({ items }) => {
    const totalEstimated = items.reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
    const totalPaid = items.reduce((s, i) => s + (i.total_paid ?? 0), 0);
    const remaining = totalEstimated - totalPaid;

    return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
                { label: 'Total Estimated', value: totalEstimated, color: SYS.primary },
                { label: 'Total Paid', value: totalPaid, color: SYS.accent },
                { label: 'Remaining', value: remaining, color: remaining <= 0 ? SYS.success : SYS.text },
            ].map(({ label, value, color }) => (
                <div key={label} style={{
                    flex: '1 1 160px', border: `3px solid ${SYS.border}`, padding: '14px 18px', background: SYS.bg,
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: SYS.light, marginBottom: 4 }}>
                        {label}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
                        ₪{fmt(value)}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Status badge ───────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
    <span style={{
        display: 'inline-block', padding: '2px 8px',
        background: STATUS_COLORS[status] || SYS.light,
        color: '#fff', fontSize: '0.68rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
        {STATUS_LABELS[status] || status}
    </span>
);

// ── Item form (add/edit) ────────────────────────────────────────────────────────

const EMPTY_ITEM_FORM = { name: '', area: '', contractor: '', estimated_cost: '', status: 'planned', notes: '' };

const ItemForm = ({ initial = EMPTY_ITEM_FORM, onSave, onCancel, saving }) => {
    const [form, setForm] = useState(initial);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    const inputStyle = {
        border: `2px solid ${SYS.border}`, padding: '6px 10px', fontFamily: 'inherit',
        fontSize: '0.88rem', background: SYS.bg, width: '100%', boxSizing: 'border-box',
    };
    const labelStyle = { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light, marginBottom: 3 };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 200px' }}>
                    <div style={labelStyle}>Name *</div>
                    <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Kitchen cabinets" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={labelStyle}>Area / Room</div>
                    <input style={inputStyle} value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Kitchen" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={labelStyle}>Contractor</div>
                    <input style={inputStyle} value={form.contractor} onChange={e => set('contractor', e.target.value)} placeholder="e.g. Dan Cohen" />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={labelStyle}>Estimated Cost (₪)</div>
                    <input type="number" min="0" step="0.01" style={inputStyle} value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="0" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <div style={labelStyle}>Status</div>
                    <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <div style={{ flex: '2 1 200px' }}>
                    <div style={labelStyle}>Notes</div>
                    <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{
                    padding: '7px 18px', border: `2px solid ${SYS.border}`,
                    background: SYS.primary, color: '#fff', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                }}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={onCancel} style={{
                    padding: '7px 18px', border: `2px solid ${SYS.border}`,
                    background: '#fff', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                }}>
                    Cancel
                </button>
            </div>
        </form>
    );
};

// ── Payment row ────────────────────────────────────────────────────────────────

const PaymentRow = ({ payment, onDelete }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '5px 0', borderBottom: `1px solid ${SYS.borderLight}`, fontSize: '0.85rem',
    }}>
        <span style={{ color: SYS.light, minWidth: 90, fontSize: '0.8rem' }}>{payment.payment_date}</span>
        <span style={{ fontWeight: 700, color: SYS.accent, minWidth: 80 }}>₪{fmtDec(payment.amount)}</span>
        <span style={{ flex: 1, color: SYS.light, fontSize: '0.8rem' }}>{payment.notes}</span>
        <button onClick={() => onDelete(payment)} title="Delete payment" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: SYS.light, padding: '2px 4px',
            display: 'flex', alignItems: 'center',
        }}>
            <X size={14} />
        </button>
    </div>
);

// ── Add payment form ───────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_PAY = { amount: '', payment_date: today(), notes: '' };

const AddPaymentForm = ({ itemId, onAdded, onCancel }) => {
    const [form, setForm] = useState(EMPTY_PAY);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
            const res = await fetch(`${API_BASE}/renovation/items/${itemId}/payments`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(form.amount), payment_date: form.payment_date, notes: form.notes }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            onAdded(data);
            setForm(EMPTY_PAY);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        border: `2px solid ${SYS.border}`, padding: '5px 8px', fontFamily: 'inherit',
        fontSize: '0.85rem', background: SYS.bg,
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
            <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, marginBottom: 2 }}>Date</div>
                <input type="date" style={inputStyle} value={form.payment_date} onChange={e => set('payment_date', e.target.value)} required />
            </div>
            <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, marginBottom: 2 }}>Amount (₪)</div>
                <input type="number" min="0.01" step="0.01" style={{ ...inputStyle, width: 100 }}
                    value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, marginBottom: 2 }}>Notes</div>
                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
            </div>
            <button type="submit" disabled={saving} style={{
                padding: '7px 14px', border: `2px solid ${SYS.border}`,
                background: SYS.success, color: '#fff', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'inherit',
            }}>
                {saving ? '…' : <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Add</>}
            </button>
            <button type="button" onClick={onCancel} style={{
                padding: '7px 10px', border: `2px solid ${SYS.border}`,
                background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}>
                <X size={14} />
            </button>
            {err && <span style={{ color: SYS.accent, fontSize: '0.8rem', width: '100%' }}>{err}</span>}
        </form>
    );
};

// ── PaymentList ────────────────────────────────────────────────────────────────

const PaymentList = ({ itemId, onPaymentAdded, onPaymentDeleted }) => {
    const [payments, setPayments] = useState(null);
    const [loadingPay, setLoadingPay] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        setLoadingPay(true);
        fetch(`${API_BASE}/renovation/items/${itemId}/payments`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(d => setPayments(Array.isArray(d) ? d : []))
            .catch(() => setPayments([]))
            .finally(() => setLoadingPay(false));
    }, [itemId]);

    const handleAdded = (payment) => {
        setPayments(prev => [...(prev || []), payment]);
        setShowAddForm(false);
        onPaymentAdded(payment);
    };

    const handleDelete = async (payment) => {
        if (!window.confirm(`Delete payment of ₪${fmtDec(payment.amount)} on ${payment.payment_date}?`)) return;
        try {
            const res = await fetch(`${API_BASE}/renovation/payments/${payment.id}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed');
            setPayments(prev => prev.filter(p => p.id !== payment.id));
            onPaymentDeleted(payment);
        } catch (_) {}
    };

    if (loadingPay) return <div style={{ padding: '8px 0', color: SYS.light, fontSize: '0.82rem' }}>Loading payments…</div>;

    return (
        <div style={{ paddingLeft: 16, paddingTop: 4, paddingBottom: 8 }}>
            {payments && payments.length > 0 ? (
                payments.map(p => <PaymentRow key={p.id} payment={p} onDelete={handleDelete} />)
            ) : (
                <div style={{ color: SYS.light, fontSize: '0.82rem', padding: '4px 0' }}>No payments yet.</div>
            )}
            {showAddForm ? (
                <AddPaymentForm itemId={itemId} onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
            ) : (
                <button onClick={() => setShowAddForm(true)} style={{
                    marginTop: 8, background: 'none', border: `1px dashed ${SYS.border}`,
                    padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8rem', color: SYS.primary, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <Plus size={13} /> Add Payment
                </button>
            )}
        </div>
    );
};

// ── RenovationItem ─────────────────────────────────────────────────────────────

const RenovationItem = ({ item, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localItem, setLocalItem] = useState(item);

    useEffect(() => { setLocalItem(item); }, [item]);

    const handleSave = async (form) => {
        setSaving(true);
        try {
            const updated = await onUpdate(item.id, {
                name: form.name,
                area: form.area || null,
                contractor: form.contractor || null,
                estimated_cost: form.estimated_cost !== '' ? parseFloat(form.estimated_cost) : null,
                status: form.status,
                notes: form.notes || null,
            });
            setLocalItem(updated);
            setEditing(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${localItem.name}" and all its payments?`)) return;
        try { await onDelete(item.id); } catch (e) { alert(e.message); }
    };

    const remaining = (localItem.estimated_cost ?? 0) - (localItem.total_paid ?? 0);

    if (editing) {
        return (
            <div style={{ border: `2px solid ${SYS.primary}`, padding: '16px', marginBottom: 8, background: '#f5f8ff' }}>
                <ItemForm
                    initial={{
                        name: localItem.name || '',
                        area: localItem.area || '',
                        contractor: localItem.contractor || '',
                        estimated_cost: localItem.estimated_cost != null ? String(localItem.estimated_cost) : '',
                        status: localItem.status || 'planned',
                        notes: localItem.notes || '',
                    }}
                    onSave={handleSave}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                />
            </div>
        );
    }

    return (
        <div style={{ border: `2px solid ${SYS.borderLight}`, marginBottom: 6, background: SYS.bg }}>
            {/* Item row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
                <button onClick={() => setExpanded(e => !e)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: SYS.light,
                    display: 'flex', alignItems: 'center',
                }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <span style={{ flex: '2 1 140px', fontWeight: 700, fontSize: '0.92rem' }}>{localItem.name}</span>

                {localItem.contractor && (
                    <span style={{ flex: '1 1 100px', fontSize: '0.82rem', color: SYS.light }}>{localItem.contractor}</span>
                )}

                <StatusBadge status={localItem.status} />

                <div style={{ flex: '1 1 120px', textAlign: 'right', fontSize: '0.85rem' }}>
                    {localItem.estimated_cost != null ? (
                        <>
                            <span style={{ color: SYS.accent, fontWeight: 700 }}>₪{fmt(localItem.total_paid)}</span>
                            <span style={{ color: SYS.light }}> / </span>
                            <span style={{ fontWeight: 700 }}>₪{fmt(localItem.estimated_cost)}</span>
                            {remaining > 0 && (
                                <span style={{ color: SYS.light, fontSize: '0.78rem' }}> (₪{fmt(remaining)} left)</span>
                            )}
                            {remaining <= 0 && localItem.estimated_cost > 0 && (
                                <span style={{ color: SYS.success, fontSize: '0.78rem' }}> ✓</span>
                            )}
                        </>
                    ) : (
                        <span style={{ color: SYS.accent, fontWeight: 700 }}>₪{fmt(localItem.total_paid)}</span>
                    )}
                </div>

                <button onClick={() => setEditing(true)} title="Edit" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: SYS.light, padding: '2px 4px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <Edit2 size={14} />
                </button>
                <button onClick={handleDelete} title="Delete" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: SYS.accent, padding: '2px 4px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <Trash2 size={14} />
                </button>
            </div>

            {localItem.notes && (
                <div style={{ padding: '0 12px 6px 36px', fontSize: '0.8rem', color: SYS.light }}>
                    {localItem.notes}
                </div>
            )}

            {/* Payments */}
            {expanded && (
                <div style={{ borderTop: `1px solid ${SYS.borderLight}`, padding: '8px 12px 4px 36px' }}>
                    <PaymentList
                        itemId={item.id}
                        onPaymentAdded={(payment) => {
                            setLocalItem(prev => ({ ...prev, total_paid: (prev.total_paid || 0) + payment.amount }));
                        }}
                        onPaymentDeleted={(payment) => {
                            setLocalItem(prev => ({ ...prev, total_paid: Math.max(0, (prev.total_paid || 0) - payment.amount) }));
                        }}
                    />
                </div>
            )}
        </div>
    );
};

// ── Area group ─────────────────────────────────────────────────────────────────

const AreaGroup = ({ area, items, onUpdate, onDelete }) => (
    <div style={{ marginBottom: 24 }}>
        <div style={{
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
            color: SYS.light, borderBottom: `2px solid ${SYS.border}`, paddingBottom: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 8,
        }}>
            {area}
            <span style={{ fontWeight: 400, fontSize: '0.68rem' }}>({items.length})</span>
        </div>
        {items.map(item => (
            <RenovationItem key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const Renovation = ({ onBackToTasks }) => {
    const { items, loading, error, fetchItems, createItem, updateItem, deleteItem } = useRenovation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const grouped = useMemo(() => {
        const map = {};
        items.forEach(item => {
            const key = (item.area || '').trim() || 'Other';
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        const entries = Object.entries(map).sort(([a], [b]) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
        });
        return entries;
    }, [items]);

    const handleCreate = async (form) => {
        setSaving(true);
        try {
            await createItem({
                name: form.name,
                area: form.area || null,
                contractor: form.contractor || null,
                estimated_cost: form.estimated_cost !== '' ? parseFloat(form.estimated_cost) : null,
                status: form.status,
                notes: form.notes || null,
            });
            setShowAddForm(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{
                background: SYS.bg, borderBottom: `4px solid ${SYS.border}`,
                padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                {onBackToTasks && (
                    <button onClick={onBackToTasks} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: SYS.primary, fontWeight: 700, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.4px', padding: 0,
                    }}>
                        ← Back
                    </button>
                )}
                <Wrench size={20} color={SYS.primary} />
                <h1 style={{
                    flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                    Renovation Tracker
                </h1>
                <button onClick={() => setShowAddForm(s => !s)} style={{
                    padding: '8px 16px', border: `2px solid ${SYS.border}`,
                    background: showAddForm ? SYS.border : SYS.primary, color: '#fff',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <Plus size={15} /> Add Item
                </button>
            </div>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>

                {/* Add item form */}
                {showAddForm && (
                    <div style={{ border: `3px solid ${SYS.primary}`, padding: '20px', marginBottom: 28, background: '#f5f8ff' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 14 }}>
                            New Renovation Item
                        </div>
                        <ItemForm
                            onSave={handleCreate}
                            onCancel={() => setShowAddForm(false)}
                            saving={saving}
                        />
                    </div>
                )}

                {/* Summary */}
                {items.length > 0 && <SummaryBar items={items} />}

                {/* Loading / error */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '32px', color: SYS.light, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Loading…
                    </div>
                )}
                {error && (
                    <div style={{ border: `2px solid ${SYS.accent}`, padding: '12px 16px', color: SYS.accent, marginBottom: 20, fontWeight: 600 }}>
                        Error: {error}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && items.length === 0 && !showAddForm && (
                    <div style={{ border: `3px solid ${SYS.border}`, padding: '48px 24px', textAlign: 'center' }}>
                        <Wrench size={40} color={SYS.light} style={{ marginBottom: 16 }} />
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No renovation items yet</div>
                        <div style={{ color: SYS.light, marginBottom: 24 }}>Add your first work item to start tracking your renovation.</div>
                        <button onClick={() => setShowAddForm(true)} style={{
                            padding: '10px 24px', border: `2px solid ${SYS.border}`,
                            background: SYS.primary, color: '#fff', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                        }}>
                            + Add First Item
                        </button>
                    </div>
                )}

                {/* Area groups */}
                {!loading && grouped.map(([area, areaItems]) => (
                    <AreaGroup
                        key={area}
                        area={area}
                        items={areaItems}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                    />
                ))}
            </div>
        </div>
    );
};

export default Renovation;
