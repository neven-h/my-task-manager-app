import React, { useState } from 'react';
import { Download, X } from 'lucide-react';

const SYS = { border: '#000', bg: '#fff', text: '#000', light: '#666' };

const inputStyle = {
    padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.85rem',
    fontFamily: 'inherit', outline: 'none', background: SYS.bg,
};

const labelStyle = {
    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: SYS.light, marginBottom: 4, display: 'block',
};

const btn = (bg, color) => ({
    padding: '8px 14px', border: `2px solid ${SYS.border}`, background: bg, color,
    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
    textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6,
});

const TaskExportPanel = ({ allCategories = [], onExport, onCancel }) => {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [status, setStatus] = useState('all');
    const [category, setCategory] = useState('all');

    const submit = (e) => {
        e.preventDefault();
        onExport({
            dateStart: dateFrom,
            dateEnd: dateTo,
            status,
            category,
        });
    };

    return (
        <form onSubmit={submit} style={{
            marginTop: 12, padding: 16,
            border: `3px solid ${SYS.border}`, background: '#fafafa',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: SYS.text }}>
                Filter Export
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={labelStyle}>Date From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={labelStyle}>Date To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={labelStyle}>Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }}>
                        <option value="all">All</option>
                        <option value="completed">Completed</option>
                        <option value="uncompleted">Uncompleted</option>
                    </select>
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={labelStyle}>Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }}>
                        <option value="all">All</option>
                        {allCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.label || c.id}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" style={btn('#0000FF', '#fff')}>
                    <Download size={14} /> Export
                </button>
                <button type="button" onClick={onCancel} style={btn('#fff', SYS.text)}>
                    <X size={14} /> Cancel
                </button>
            </div>
        </form>
    );
};

export default TaskExportPanel;
