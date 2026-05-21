import React, { useState } from 'react';
import { REPETITION_NONE, REPETITION_OPTIONS } from './budgetConstants';

const SYS = {
    primary:   '#0000FF',
    success:   '#00AA00',
    accent:    '#FF0000',
    bg:        '#fff',
    text:      '#000',
    border:    '#000',
};

export const EntryForm = ({ initial, onSave, onCancel, loading, renovationMode, isEditing = false }) => {
    const [form, setForm] = useState(() => ({
        repetition: REPETITION_NONE,
        recurring_day: '',
        ...initial,
    }));
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const isRecurring = form.repetition && form.repetition !== REPETITION_NONE;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.description.trim() || !form.amount || !form.entry_date) return;
        const payload = {
            ...form,
            amount: parseFloat(form.amount),
        };
        if (!isRecurring) {
            // Strip recurring fields for one-off entries so the backend doesn't
            // accidentally see partial config.
            delete payload.recurring_day;
            payload.repetition = REPETITION_NONE;
        } else if (payload.recurring_day === '' || payload.recurring_day == null) {
            // Default day-of-month to the day from entry_date.
            payload.recurring_day = parseInt(form.entry_date.slice(8, 10), 10);
        } else {
            payload.recurring_day = parseInt(payload.recurring_day, 10);
        }
        onSave(payload);
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
                {[['income', renovationMode ? '↑ FUTURE PAYMENT' : '↑ INCOME'], ['outcome', renovationMode ? '↓ PAID' : '↓ EXPENSE']].map(([t, label]) => (
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

            {/* Repetition (recurring scheduler) — only shown when creating a new
                entry, not when editing one (editing uses RecurringScopeModal). */}
            {!isEditing && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                    <select
                        value={form.repetition || REPETITION_NONE}
                        onChange={(e) => set('repetition', e.target.value)}
                        style={{ ...inputStyle, background: '#fff' }}
                    >
                        {REPETITION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {isRecurring && (
                        <input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day"
                            title="Day of month for the charge (1–31). Defaults to the day from the entry date."
                            value={form.recurring_day}
                            onChange={(e) => set('recurring_day', e.target.value)}
                            style={{ ...inputStyle, width: 90 }}
                        />
                    )}
                </div>
            )}

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

export default EntryForm;
