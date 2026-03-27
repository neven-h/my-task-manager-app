import React, { useState } from 'react';
import { SYS } from './renovationConstants';

export const EMPTY_ITEM_FORM = { name: '', area: '', contractor: '', category: '', estimated_cost: '', status: 'planned', notes: '' };

const RenovationItemForm = ({ initial = EMPTY_ITEM_FORM, onSave, onCancel, saving }) => {
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
                <div style={{ flex: '1 1 140px' }}>
                    <div style={labelStyle}>Category</div>
                    <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Plumbing, Electrical" />
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

export default RenovationItemForm;
