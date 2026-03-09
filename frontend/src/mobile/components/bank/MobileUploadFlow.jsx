import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, Upload, Check, Undo2, Plus, FileText } from 'lucide-react';
import API_BASE from '../../../config';
import { getAuthHeaders } from '../../../api.js';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME, FONT_STACK } from '../../../ios/theme';

const MobileUploadFlow = ({ isOpen, onClose, onUploadComplete }) => {
    // Step: 'config' | 'preview' | 'success'
    const [step, setStep] = useState('config');
    const [transactionType, setTransactionType] = useState('credit');
    const [tabs, setTabs] = useState([]);
    const [selectedTabId, setSelectedTabId] = useState(null);
    const [tabsLoading, setTabsLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [savedIds, setSavedIds] = useState([]);
    const [undone, setUndone] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setStep('config');
            setTransactionType('credit');
            setFile(null);
            setParsedData(null);
            setSavedIds([]);
            setUndone(false);
            setError(null);
            fetchTabs();
        }
    }, [isOpen]);

    const fetchTabs = async () => {
        try {
            setTabsLoading(true);
            const res = await fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (Array.isArray(data)) {
                const normalized = data.map(t => ({ ...t, id: Number(t.id) }));
                setTabs(normalized);
                if (normalized.length > 0 && !selectedTabId) {
                    setSelectedTabId(normalized[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch tabs:', err);
        } finally {
            setTabsLoading(false);
        }
    };

    const handleCreateTab = async () => {
        const name = window.prompt('New tab name:', '');
        if (!name || !name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/transaction-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: name.trim() })
            });
            if (!res.ok) return;
            const newTab = await res.json();
            const id = Number(newTab.id);
            if (id) {
                setTabs(prev => [...prev, { id, name: newTab.name || name.trim() }]);
                setSelectedTabId(id);
            }
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    const handleFileSelect = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
        e.target.value = '';
    };

    const handleUploadAndParse = async () => {
        if (!file || !selectedTabId) return;
        setError(null);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('transaction_type', transactionType);
            const res = await fetch(`${API_BASE}/transactions/upload`, {
                method: 'POST',
                headers: getAuthHeaders(false),
                body: fd
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.error || 'Upload failed');
                return;
            }
            setParsedData(data);
            setStep('preview');
        } catch (err) {
            setError(err?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!parsedData?.transactions || !selectedTabId) return;
        setError(null);
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/transactions/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    transactions: parsedData.transactions,
                    tab_id: selectedTabId
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.error || 'Save failed');
                return;
            }
            setSavedIds(data?.transaction_ids || []);
            setStep('success');
            if (onUploadComplete) onUploadComplete();
        } catch (err) {
            setError(err?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = async () => {
        if (!savedIds.length) return;
        setUndoing(true);
        try {
            const res = await fetch(`${API_BASE}/transactions/batch-delete`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transaction_ids: savedIds })
            });
            if (res.ok) {
                setUndone(true);
                if (onUploadComplete) onUploadComplete();
            } else {
                const data = await res.json().catch(() => null);
                setError(data?.error || 'Undo failed');
            }
        } catch (err) {
            setError(err?.message || 'Undo failed');
        } finally {
            setUndoing(false);
        }
    };

    if (!isOpen) return null;

    const selectedTabName = tabs.find(t => t.id === selectedTabId)?.name || 'Unknown';
    const totalAmount = parsedData?.transactions?.reduce((s, t) => s + (Number(t.amount) || 0), 0) || 0;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 400
                }}
                onClick={onClose}
            />

            {/* Bottom sheet */}
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                maxHeight: '92vh',
                background: '#fff',
                borderRadius: '16px 16px 0 0',
                zIndex: 401,
                display: 'flex',
                flexDirection: 'column',
                fontFamily: FONT_STACK,
                overflow: 'hidden'
            }}>
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#ddd' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 16px 12px',
                    borderBottom: '3px solid #000'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {step === 'preview' && (
                            <button
                                onClick={() => setStep('config')}
                                style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                            {step === 'config' && 'Upload Transactions'}
                            {step === 'preview' && 'Preview'}
                            {step === 'success' && (undone ? 'Undone' : 'Saved')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

                    {/* Error banner */}
                    {error && (
                        <div style={{
                            padding: '12px', marginBottom: '16px',
                            background: '#FFF0F0', border: '2px solid ' + THEME.accent,
                            fontSize: '0.85rem', color: THEME.accent, fontWeight: 700
                        }}>
                            {error}
                        </div>
                    )}

                    {/* ─── STEP: CONFIG ─── */}
                    {step === 'config' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Transaction type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    Transaction Type
                                </label>
                                <div style={{ display: 'flex', border: '3px solid #000', overflow: 'hidden' }}>
                                    {['credit', 'cash'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setTransactionType(type)}
                                            style={{
                                                flex: 1, padding: '12px',
                                                border: 'none',
                                                borderRight: type === 'credit' ? '3px solid #000' : 'none',
                                                background: transactionType === type ? THEME.primary : '#fff',
                                                color: transactionType === type ? '#fff' : THEME.text,
                                                fontWeight: 700, fontSize: '0.9rem',
                                                cursor: 'pointer', fontFamily: FONT_STACK,
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {type === 'credit' ? 'Credit' : 'Cash'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab selector */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    Save to Tab
                                </label>
                                {tabsLoading ? (
                                    <div style={{ padding: '12px', color: THEME.muted, fontSize: '0.85rem' }}>Loading tabs...</div>
                                ) : tabs.length === 0 ? (
                                    <div style={{ padding: '12px', color: THEME.muted, fontSize: '0.85rem' }}>
                                        No tabs yet. Create one to continue.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {tabs.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setSelectedTabId(tab.id)}
                                                style={{
                                                    padding: '12px 16px',
                                                    border: '3px solid #000',
                                                    background: selectedTabId === tab.id ? THEME.primary : '#fff',
                                                    color: selectedTabId === tab.id ? '#fff' : THEME.text,
                                                    fontWeight: 700, fontSize: '0.9rem',
                                                    cursor: 'pointer', fontFamily: FONT_STACK,
                                                    textAlign: 'left'
                                                }}
                                            >
                                                {tab.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={handleCreateTab}
                                    style={{
                                        marginTop: '8px', padding: '10px 16px',
                                        border: '2px dashed #000', background: '#f8f8f8',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        fontFamily: FONT_STACK, width: '100%', textAlign: 'left',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <Plus size={16} /> Create New Tab
                                </button>
                            </div>

                            {/* File picker */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    File
                                </label>
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        width: '100%', padding: '16px',
                                        border: '3px solid #000',
                                        background: file ? '#f0f8ff' : '#f8f8f8',
                                        cursor: 'pointer', fontFamily: FONT_STACK,
                                        fontSize: '0.9rem', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '10px'
                                    }}
                                >
                                    <FileText size={20} color={THEME.muted} />
                                    {file ? file.name : 'Choose .csv, .xlsx, or .xls file'}
                                </button>
                                <input
                                    ref={fileRef} type="file"
                                    accept=".csv,.xlsx,.xls"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {/* Upload button */}
                            <button
                                onClick={handleUploadAndParse}
                                disabled={!file || !selectedTabId || uploading}
                                style={{
                                    width: '100%', padding: '16px',
                                    border: '3px solid #000',
                                    background: (!file || !selectedTabId || uploading) ? '#ccc' : THEME.primary,
                                    color: '#fff', fontWeight: 700, fontSize: '1rem',
                                    cursor: (!file || !selectedTabId || uploading) ? 'not-allowed' : 'pointer',
                                    fontFamily: FONT_STACK, textTransform: 'uppercase',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <Upload size={18} />
                                {uploading ? 'Parsing...' : 'Upload & Preview'}
                            </button>
                        </div>
                    )}

                    {/* ─── STEP: PREVIEW ─── */}
                    {step === 'preview' && parsedData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Summary */}
                            <div style={{
                                padding: '16px', border: '3px solid #000', background: '#f8f8f8',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                flexWrap: 'wrap', gap: '8px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>
                                        {parsedData.transaction_count || parsedData.transactions?.length || 0}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                                        Transactions
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                                        {formatCurrency(totalAmount)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                                        Total
                                    </div>
                                </div>
                            </div>

                            {/* Metadata badges */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    padding: '4px 10px', border: '2px solid #000',
                                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                    background: transactionType === 'cash' ? THEME.secondary : THEME.primary,
                                    color: transactionType === 'cash' ? '#000' : '#fff'
                                }}>
                                    {transactionType}
                                </span>
                                <span style={{
                                    padding: '4px 10px', border: '2px solid #000',
                                    fontSize: '0.75rem', fontWeight: 700, background: '#f0f0f0'
                                }}>
                                    Tab: {selectedTabName}
                                </span>
                            </div>

                            {/* Transaction list */}
                            <div style={{
                                border: '2px solid #000',
                                maxHeight: '40vh',
                                overflowY: 'auto',
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                {(parsedData.transactions || []).slice(0, 30).map((t, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: '10px 12px',
                                            borderBottom: idx < 29 ? '1px solid #e0e0e0' : 'none',
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', gap: '8px'
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.description || '--'}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: THEME.muted }}>
                                                {t.transaction_date || '--'}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                                            color: (Number(t.amount) || 0) < 0 ? THEME.accent : THEME.text
                                        }}>
                                            {formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                ))}
                                {(parsedData.transactions?.length || 0) > 30 && (
                                    <div style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.8rem', color: THEME.muted, fontWeight: 600 }}>
                                        + {parsedData.transactions.length - 30} more transactions
                                    </div>
                                )}
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '16px',
                                    border: '3px solid #000',
                                    background: saving ? '#ccc' : THEME.success,
                                    color: '#fff', fontWeight: 700, fontSize: '1rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontFamily: FONT_STACK, textTransform: 'uppercase',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <Check size={18} />
                                {saving ? 'Saving...' : `Save to "${selectedTabName}"`}
                            </button>
                        </div>
                    )}

                    {/* ─── STEP: SUCCESS ─── */}
                    {step === 'success' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                            {undone ? (
                                <>
                                    <Undo2 size={48} color={THEME.muted} />
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '4px' }}>
                                            Upload Undone
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                                            {savedIds.length} transactions removed from "{selectedTabName}"
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Check size={48} color={THEME.success} />
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '4px' }}>
                                            {parsedData?.transaction_count || savedIds.length} Transactions Saved
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                                            Added to "{selectedTabName}"
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                                {!undone && savedIds.length > 0 && (
                                    <button
                                        onClick={handleUndo}
                                        disabled={undoing}
                                        style={{
                                            flex: 1, padding: '14px',
                                            border: '3px solid #000',
                                            background: undoing ? '#ccc' : '#fff',
                                            color: THEME.accent, fontWeight: 700,
                                            fontSize: '0.9rem', cursor: undoing ? 'not-allowed' : 'pointer',
                                            fontFamily: FONT_STACK, textTransform: 'uppercase',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        <Undo2 size={16} />
                                        {undoing ? 'Undoing...' : 'Undo'}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    style={{
                                        flex: 1, padding: '14px',
                                        border: '3px solid #000',
                                        background: THEME.primary,
                                        color: '#fff', fontWeight: 700,
                                        fontSize: '0.9rem', cursor: 'pointer',
                                        fontFamily: FONT_STACK, textTransform: 'uppercase'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MobileUploadFlow;
