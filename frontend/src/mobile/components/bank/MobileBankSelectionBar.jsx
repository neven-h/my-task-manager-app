import React from 'react';
import { Trash2, Download, X, CheckSquare } from 'lucide-react';

const BTN = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', border: 'none', borderRadius: 12,
    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
};

const MobileBankSelectionBar = ({ count, onDelete, onExport, onSelectAll, allSelected, onCancel }) => {
    if (count === 0 && !onSelectAll) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderTop: '0.5px solid rgba(0,0,0,0.15)',
            padding: '12px 16px calc(env(safe-area-inset-bottom, 8px) + 12px)',
            display: 'flex', alignItems: 'center', gap: 8,
            zIndex: 200,
        }}>
            <button onClick={onSelectAll} style={{ ...BTN, background: 'rgba(0,0,0,0.06)', color: '#333' }}>
                <CheckSquare size={16} /> {allSelected ? 'Deselect' : 'All'}
            </button>

            <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#333' }}>
                {count > 0 ? `${count} selected` : 'Select items'}
            </span>

            {count > 0 && (
                <>
                    <button onClick={onExport} style={{ ...BTN, background: '#007AFF', color: '#fff' }}>
                        <Download size={16} />
                    </button>
                    <button onClick={onDelete} style={{ ...BTN, background: '#FF3B30', color: '#fff' }}>
                        <Trash2 size={16} />
                    </button>
                </>
            )}

            <button onClick={onCancel} style={{ ...BTN, background: 'rgba(0,0,0,0.06)', color: '#333', padding: '10px' }}>
                <X size={18} />
            </button>
        </div>
    );
};

export default MobileBankSelectionBar;
