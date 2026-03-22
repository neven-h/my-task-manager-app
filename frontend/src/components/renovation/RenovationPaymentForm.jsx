import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { SYS, fmtDec, today } from './renovationConstants';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const EMPTY_PAY = { amount: '', payment_date: today(), notes: '' };

const RenovationPaymentForm = ({ itemId, onAdded, onCancel }) => {
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
            setForm({ ...EMPTY_PAY, payment_date: today() });
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

export default RenovationPaymentForm;
