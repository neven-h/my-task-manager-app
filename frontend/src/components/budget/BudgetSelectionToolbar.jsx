import React from 'react';
import { Trash2, Download, X } from 'lucide-react';

const SYS = { border: '#000', accent: '#FF0000', primary: '#0000FF' };

const BudgetSelectionToolbar = ({ count, onDelete, onExport, onCancel }) => {
    if (count === 0) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            border: `2px solid ${SYS.border}`, background: '#f0f0ff', marginBottom: 12,
        }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', marginRight: 'auto' }}>
                {count} selected
            </span>
            <button onClick={onExport} title="Export selected to CSV"
                style={{ padding: '5px 10px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={14} /> CSV
            </button>
            <button onClick={onDelete} title="Delete selected"
                style={{ padding: '5px 10px', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={14} /> Delete
            </button>
            <button onClick={onCancel} title="Cancel selection"
                style={{ padding: '5px 8px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: 'pointer', lineHeight: 0 }}>
                <X size={15} />
            </button>
        </div>
    );
};

export default React.memo(BudgetSelectionToolbar);
