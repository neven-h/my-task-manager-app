import React from 'react';

const IOS = {
    blue: '#007AFF',
    red: '#FF3B30',
    muted: '#8E8E93',
    separator: 'rgba(60,60,67,0.18)',
};

const MobilePortfolioDraftDialog = ({
    showDraftDialog,
    onClose,
    onDismiss,
    onSaveDraft,
    theme,  // kept for API compatibility
}) => {
    if (!showDraftDialog) return null;

    const sheetBg = 'rgba(242,242,247,0.97)';
    const blur = { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                zIndex: 2000,
                padding: '0 16px',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
            onClick={onClose}
        >
            <div
                style={{ width: '100%', maxWidth: '480px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Main action card ──────────────────────────────── */}
                <div style={{
                    ...blur,
                    background: sheetBg,
                    borderRadius: 14,
                    overflow: 'hidden',
                    marginBottom: '8px',
                }}>
                    {/* Header text */}
                    <div style={{
                        padding: '16px 16px 12px',
                        textAlign: 'center',
                        borderBottom: `0.5px solid ${IOS.separator}`,
                    }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
                            Unsaved Changes
                        </div>
                        <div style={{ fontSize: '0.85rem', color: IOS.muted, lineHeight: 1.45 }}>
                            You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
                        </div>
                    </div>

                    {/* Save as Draft */}
                    <button
                        onClick={onSaveDraft}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: IOS.blue,
                            fontFamily: 'inherit',
                            borderBottom: `0.5px solid ${IOS.separator}`,
                        }}
                    >
                        Save as Draft
                    </button>

                    {/* Dismiss */}
                    <button
                        onClick={onDismiss}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            color: IOS.red,
                            fontFamily: 'inherit',
                        }}
                    >
                        Dismiss Changes
                    </button>
                </div>

                {/* ── Cancel pill (separate) ────────────────────────── */}
                <button
                    onClick={onClose}
                    style={{
                        ...blur,
                        width: '100%',
                        padding: '16px',
                        background: sheetBg,
                        border: 'none',
                        borderRadius: 14,
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#000',
                        fontFamily: 'inherit',
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default MobilePortfolioDraftDialog;
