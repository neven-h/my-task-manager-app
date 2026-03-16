import React, { useRef } from 'react';
import { X, ArrowLeft, Upload, Check, Undo2 } from 'lucide-react';
import { THEME, FONT_STACK } from '../../../ios/theme';
import useBudgetUpload from '../../../hooks/useBudgetUpload';
import MobileBudgetUploadPreview from './MobileBudgetUploadPreview';

const MobileBudgetUploadFlow = ({ isOpen, onClose, activeTabId, onComplete }) => {
    const {
        step, file, fileRef, uploading, saving,
        parsedData, savedIds, undone, undoing, error,
        reset, handleFileSelect, handleUpload, handleSave, handleUndo,
    } = useBudgetUpload();

    if (!isOpen) return null;

    const close = () => { reset(); onClose(); };

    const titles = { idle: 'Upload Budget', preview: 'Preview Entries', success: undone ? 'Upload Undone' : 'Saved' };
    const title = titles[step] || 'Upload Budget';

    return (
        <>
            {/* Backdrop */}
            <div onClick={close} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 400,
            }} />

            {/* Bottom sheet */}
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh',
                background: '#fff', borderRadius: '16px 16px 0 0', zIndex: 401,
                display: 'flex', flexDirection: 'column', fontFamily: FONT_STACK, overflow: 'hidden',
            }}>
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ddd' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 16px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {step === 'preview' && (
                            <button onClick={reset} style={{
                                background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                                minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ArrowLeft size={20} color={THEME.primary} />
                            </button>
                        )}
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{title}</h2>
                    </div>
                    <button onClick={close} style={{
                        background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <X size={22} color="#8E8E93" />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                    padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                }}>
                    {/* Error banner */}
                    {error && (
                        <div style={{
                            padding: '10px 14px', marginBottom: 14, borderRadius: 12,
                            background: '#FFF0F0', color: '#CC0000', fontSize: '0.84rem', fontWeight: 600,
                        }}>{error}</div>
                    )}

                    {/* Step: idle */}
                    {step === 'idle' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                                onChange={handleFileSelect} style={{ display: 'none' }} />
                            <button onClick={() => fileRef.current?.click()} style={{
                                width: '100%', padding: '16px', borderRadius: 14,
                                border: '1px dashed rgba(0,0,0,0.2)', background: '#fafafa',
                                cursor: 'pointer', fontFamily: FONT_STACK, fontSize: '0.9rem',
                                fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                            }}>
                                <Upload size={18} color={THEME.primary} />
                                {file ? file.name : 'Choose File (.csv, .xlsx, .xls)'}
                            </button>
                            <button onClick={handleUpload} disabled={!file || uploading} style={{
                                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                                background: (!file || uploading) ? '#ccc' : THEME.primary, color: '#fff',
                                fontWeight: 700, fontSize: '0.92rem', fontFamily: FONT_STACK,
                                cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                                <Upload size={16} />
                                {uploading ? 'Uploading...' : 'Upload & Preview'}
                            </button>
                        </div>
                    )}

                    {/* Step: preview */}
                    {step === 'preview' && parsedData && (
                        <MobileBudgetUploadPreview
                            parsedData={parsedData} saving={saving}
                            onSave={() => { handleSave(activeTabId); }}
                            onBack={reset}
                        />
                    )}

                    {/* Step: success */}
                    {step === 'success' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: 16,
                            alignItems: 'center', textAlign: 'center', padding: '24px 0',
                        }}>
                            {undone ? (
                                <>
                                    <Undo2 size={48} color="#8E8E93" />
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Upload Undone</div>
                                        <div style={{ fontSize: '0.85rem', color: '#8E8E93' }}>
                                            {savedIds.length} entries removed
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Check size={48} color="#34C759" />
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                                            {savedIds.length} Entries Saved
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#8E8E93' }}>
                                            Successfully added to budget
                                        </div>
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                                {!undone && savedIds.length > 0 && (
                                    <button onClick={() => { handleUndo(); onComplete?.(); }} disabled={undoing} style={{
                                        flex: 1, padding: 14, borderRadius: 14,
                                        border: '1px solid rgba(0,0,0,0.12)', background: '#fff',
                                        color: '#FF3B30', fontWeight: 700, fontSize: '0.9rem',
                                        cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: FONT_STACK,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}>
                                        <Undo2 size={16} />
                                        {undoing ? 'Undoing...' : 'Undo'}
                                    </button>
                                )}
                                <button onClick={() => { onComplete?.(); close(); }} style={{
                                    flex: 1, padding: 14, borderRadius: 14, border: 'none',
                                    background: THEME.primary, color: '#fff',
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: FONT_STACK,
                                }}>Done</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MobileBudgetUploadFlow;
