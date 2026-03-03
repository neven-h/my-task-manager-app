import React from 'react';
import { FONT_STACK } from '../theme';


const MobileDiscardConfirm = ({ isOpen, isEditing, onKeepEditing, onDiscard }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 250, display: 'flex', alignItems: 'flex-end', padding: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) onKeepEditing(); }}
        >
            <div
                style={{ width: '100%', background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px', borderTop: '3px solid #000', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', fontFamily: FONT_STACK }}
                onClick={e => e.stopPropagation()}
            >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 12px 0', textTransform: 'uppercase', color: '#000' }}>Unsaved changes</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '1rem', color: '#666', lineHeight: 1.5 }}>
                    {isEditing
                        ? 'You have unsaved changes. Are you sure you want to close without saving?'
                        : 'You have unsaved changes. Are you sure you want to discard this draft?'}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={onKeepEditing} className="mobile-btn" style={{ flex: 1 }}>Keep editing</button>
                    <button type="button" onClick={onDiscard} className="mobile-btn mobile-btn-accent" style={{ flex: 1 }}>Discard</button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MobileDiscardConfirm);
