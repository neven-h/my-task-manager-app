import React from 'react';
import { Trash2, Download, X } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = { blue: '#007AFF', red: '#FF3B30' };

const MobileBudgetSelectionBar = ({ count, onDelete, onExport, onCancel }) => {
    if (count === 0) return null;

    const btn = (bg, color, onClick, icon, label) => (
        <button onClick={onClick}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, background: bg, color, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: FONT_STACK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {icon} {label}
        </button>
    );

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', paddingTop: 10,
            paddingLeft: 16, paddingRight: 16,
            background: 'rgba(242,242,247,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderTop: '0.5px solid rgba(0,0,0,0.12)', fontFamily: FONT_STACK,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{count} selected</span>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>
                    <X size={18} color={IOS.blue} />
                </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                {btn('#E5E5EA', '#000', onExport, <Download size={15} />, 'Export')}
                {btn(IOS.red, '#fff', onDelete, <Trash2 size={15} />, 'Delete')}
            </div>
        </div>
    );
};

export default React.memo(MobileBudgetSelectionBar);
