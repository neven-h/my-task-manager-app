import React from 'react';
import { Download, Mail, Trash2, X } from 'lucide-react';

const btnStyle = (bg, color, border) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', border: `2px solid ${border}`, background: bg, color,
    cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
    textTransform: 'uppercase', letterSpacing: '0.4px',
});

const TaskMultiSelectBar = ({ count, onExport, onShare, onDelete, onClear }) => {
    if (!count) return null;
    return (
        <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '10px 16px', background: '#0000FF', border: '3px solid #000',
            marginBottom: 16,
        }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', flex: '1 1 auto', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {count} selected
            </span>
            <button type="button" onClick={onExport} style={btnStyle('#fff', '#0000FF', '#fff')}>
                <Download size={14} /> CSV
            </button>
            <button type="button" onClick={onShare} style={btnStyle('#fff', '#0000FF', '#fff')}>
                <Mail size={14} /> Email
            </button>
            <button type="button" onClick={onDelete} style={btnStyle('#FF0000', '#fff', '#000')}>
                <Trash2 size={14} /> Delete
            </button>
            <button type="button" onClick={onClear} style={btnStyle('#000', '#fff', '#000')}>
                <X size={14} /> Cancel
            </button>
        </div>
    );
};

export default TaskMultiSelectBar;
