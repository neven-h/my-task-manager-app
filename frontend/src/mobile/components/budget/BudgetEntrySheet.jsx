import React, { useEffect, useState } from 'react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = {
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    green:     '#34C759',
    red:       '#FF3B30',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    bg:        '#F2F2F7',
    spring:    'cubic-bezier(0.22,1,0.36,1)',
};

const today = () => new Date().toISOString().split('T')[0];

export const EntrySheet = ({ initial, onSave, onCancel, loading }) => {
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

export default EntrySheet;
