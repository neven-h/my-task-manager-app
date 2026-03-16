import React from 'react';
import useBudgetUpload from '../../hooks/useBudgetUpload';
import BudgetUploadPreview from './BudgetUploadPreview';

const SYS = {
    primary: '#0000FF', success: '#00AA00', accent: '#FF0000',
    border: '#000', bg: '#fff',
};

const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const card = {
    background: SYS.bg, border: `3px solid ${SYS.border}`,
    boxShadow: '8px 8px 0px #000', padding: '28px 32px',
    width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
};

const heading = {
    margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.5px',
};

const BudgetUploadModal = ({ show, onClose, activeTabId, onComplete }) => {
    const h = useBudgetUpload();

    if (!show) return null;

    const close = () => { h.reset(); onClose(); };
    const done = () => { onComplete?.(); close(); };
    const saveAndComplete = () => {
        h.handleSave(activeTabId).then(() => onComplete?.());
    };
    const undoAndComplete = () => {
        h.handleUndo().then(() => onComplete?.());
    };

    return (
        <div style={overlay} onClick={close}>
            <div style={card} onClick={e => e.stopPropagation()}>

                {/* STEP: idle - file picker */}
                {h.step === 'idle' && (
                    <>
                        <h2 style={heading}>Upload Budget CSV</h2>
                        <input
                            ref={h.fileRef} type="file" accept=".csv,.xlsx,.xls"
                            onChange={h.handleFileSelect}
                            style={{ marginBottom: 16, fontSize: '0.9rem' }}
                        />
                        {h.file && (
                            <div style={{ marginBottom: 16, fontSize: '0.85rem', color: '#444' }}>
                                Selected: <strong>{h.file.name}</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={close}
                                style={{ padding: '12px 24px', border: `3px solid ${SYS.border}`, background: SYS.bg, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                Cancel
                            </button>
                            <button onClick={h.handleUpload} disabled={!h.file || h.uploading}
                                style={{ flex: 1, padding: '12px', border: `3px solid ${SYS.border}`, background: (!h.file || h.uploading) ? '#ccc' : SYS.primary, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: (!h.file || h.uploading) ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                                {h.uploading ? 'Uploading...' : 'Upload & Preview'}
                            </button>
                        </div>
                    </>
                )}

                {/* STEP: preview */}
                {h.step === 'preview' && h.parsedData && (
                    <>
                        <h2 style={heading}>Preview Entries</h2>
                        <BudgetUploadPreview
                            parsedData={h.parsedData}
                            saving={h.saving}
                            onSave={() => saveAndComplete()}
                            onBack={() => h.reset()}
                        />
                    </>
                )}

                {/* STEP: success */}
                {h.step === 'success' && (
                    <>
                        <h2 style={heading}>
                            {h.undone ? 'Upload Undone' : `${h.savedIds.length} Entries Saved`}
                        </h2>
                        {!h.undone ? (
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={undoAndComplete} disabled={h.undoing}
                                    style={{ padding: '12px 24px', border: `3px solid ${SYS.border}`, background: SYS.accent, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: h.undoing ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                                    {h.undoing ? 'Undoing...' : 'Undo'}
                                </button>
                                <button onClick={done}
                                    style={{ flex: 1, padding: '12px', border: `3px solid ${SYS.border}`, background: SYS.success, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                    Done
                                </button>
                            </div>
                        ) : (
                            <button onClick={done}
                                style={{ width: '100%', padding: '12px', border: `3px solid ${SYS.border}`, background: SYS.primary, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                Close
                            </button>
                        )}
                    </>
                )}

                {/* Error banner */}
                {h.error && (
                    <div style={{ marginTop: 16, background: '#fff0f0', border: `2px solid ${SYS.accent}`, padding: '10px 14px', color: SYS.accent, fontSize: '0.85rem', fontWeight: 600 }}>
                        {h.error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetUploadModal;
