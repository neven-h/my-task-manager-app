import React from 'react';
import { AlertCircle } from 'lucide-react';

const MobilePortfolioDraftDialog = ({
    showDraftDialog,
    onClose,
    onDismiss,
    onSaveDraft,
    theme
}) => {
    if (!showDraftDialog) return null;

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', padding: '24px', width: '100%', maxWidth: '400px', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <AlertCircle size={28} color={theme.accent} style={{ marginRight: '12px' }} />
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem', color: '#000' }}>
                        Unsaved Changes
                    </h2>
                </div>
                <p style={{ margin: '0 0 24px 0', fontSize: '0.95rem', lineHeight: '1.5', color: theme.muted }}>
                    You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
                </p>
                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                    <button
                        onClick={onDismiss}
                        style={{ padding: '14px', background: '#fff', border: '3px solid #000', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#000', touchAction: 'manipulation' }}
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={onSaveDraft}
                        style={{ padding: '14px', background: theme.secondary, border: '3px solid #000', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#000', touchAction: 'manipulation' }}
                    >
                        Save as Draft
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobilePortfolioDraftDialog;
