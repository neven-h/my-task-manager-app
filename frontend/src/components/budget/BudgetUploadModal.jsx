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

const fileChip = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', marginBottom: 6,
    border: `2px solid ${SYS.border}`, background: '#f8f8f8',
    fontSize: '0.82rem',
};

const xBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.9rem', fontWeight: 800, color: SYS.accent, padding: '0 4px',
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

    const canUpload = h.files.length > 0 && !h.uploading;

    return (
        <div style={overlay} onClick={close}>
            <div style={card} onClick={e => e.stopPropagation()}>

                {/* STEP: idle - file picker */}
                {h.step === 'idle' && (
                    <>
                        <h2 style={heading}>Upload Budget CSV</h2>
                        <input
                            ref={h.fileRef} type="file" multiple accept=".csv,.xlsx,.xls"
                            onChange={h.handleFileSelect}
                            style={{ marginBottom: 12, fontSize: '0.9rem' }}
                        />
                        {h.files.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                                    {h.files.length} file{h.files.length === 1 ? '' : 's'} selected
                                </div>
                                {h.files.map((f, i) => (
                                    <div key={`${f.name}-${i}`} style={fileChip}>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {f.name}
                                        </span>
                                        <span style={{ color: '#888', fontSize: '0.75rem' }}>
                                            {(f.size / 1024).toFixed(1)} KB
                                        </span>
                                        {!h.uploading && (
                                            <button type="button" onClick={() => h.removeFile(i)} style={xBtn} title="Remove">
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {h.uploading && h.uploadProgress && (
                            <div style={{ marginBottom: 16, fontSize: '0.82rem', color: SYS.primary, fontWeight: 600 }}>
                                Uploading file {h.uploadProgress.done + 1} of {h.uploadProgress.total}: {h.uploadProgress.current}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={close}
                                style={{ padding: '12px 24px', border: `3px solid ${SYS.border}`, background: SYS.bg, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                Cancel
                            </button>
                            <button onClick={h.handleUpload} disabled={!canUpload}
                                style={{ flex: 1, padding: '12px', border: `3px solid ${SYS.border}`, background: !canUpload ? '#ccc' : SYS.primary, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: !canUpload ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                                {h.uploading ? 'Uploading...' : (h.files.length > 1 ? `Upload ${h.files.length} & Preview` : 'Upload & Preview')}
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

                {/* Per-file errors */}
                {h.fileErrors.length > 0 && (
                    <div style={{ marginTop: 12, border: `2px solid ${SYS.accent}`, padding: '8px 12px', background: '#fff8f8' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: SYS.accent, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                            {h.fileErrors.length} file{h.fileErrors.length === 1 ? '' : 's'} failed
                        </div>
                        {h.fileErrors.map((fe, i) => (
                            <div key={i} style={{ fontSize: '0.8rem', color: '#600', marginTop: 2 }}>
                                <strong>{fe.name}</strong> — {fe.error}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetUploadModal;
