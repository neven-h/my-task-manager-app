import React, { useState, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { THEME, FONT_STACK, BAUHAUS } from '../../theme';
import API_BASE from '../../../config';
import { getAuthHeaders } from '../../../api.js';

const IOS = {
    card: '#fff', separator: 'rgba(0,0,0,0.08)', radius: 16,
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
};

const MobileBankUpload = ({ show, onClose, tabs, activeTabId, onSaved }) => {
    const [targetTabId, setTargetTabId] = useState(activeTabId);
    const [transactionType, setTransactionType] = useState('credit');
    const [uploading, setUploading] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const reset = () => {
        setUploadedData(null);
        setError(null);
        setSuccess(null);
        setTargetTabId(activeTabId);
        setTransactionType('credit');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleFileUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const results = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('transaction_type', transactionType);
                const res = await fetch(`${API_BASE}/transactions/upload`, {
                    method: 'POST', headers: getAuthHeaders(false), body: formData,
                });
                const ct = res.headers.get('content-type');
                if (!ct?.includes('application/json')) throw new Error(`${file.name}: unexpected response`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${file.name}: upload failed`);
                results.push(data);
            }
            const allTx = results.flatMap(d => d.transactions);
            setUploadedData({
                transactions: allTx,
                transaction_count: allTx.length,
                total_amount: allTx.reduce((s, t) => s + t.amount, 0),
            });
            setSuccess(`Parsed ${allTx.length} transactions from ${files.length} file(s)`);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }, [transactionType]);

    const handleSave = useCallback(async () => {
        if (!uploadedData || !targetTabId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/transactions/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ transactions: uploadedData.transactions, tab_id: Number(targetTabId) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setSuccess(data.message || `${uploadedData.transaction_count} transactions saved`);
            setUploadedData(null);
            if (onSaved) onSaved(Number(targetTabId));
            setTimeout(handleClose, 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }, [uploadedData, targetTabId, onSaved]);

    if (!show) return null;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 200,
                display: 'flex', alignItems: 'flex-end',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div style={{
                width: '100%', maxHeight: '85vh', background: '#fff',
                borderRadius: `${IOS.radius}px ${IOS.radius}px 0 0`,
                padding: '20px 16px', overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                fontFamily: FONT_STACK,
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                        Upload Transactions
                    </h2>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', padding: 8 }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tab selector */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>
                        Save to Tab
                    </label>
                    <select
                        value={targetTabId || ''}
                        onChange={(e) => setTargetTabId(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', border: '1px solid #ddd',
                            borderRadius: 10, fontSize: '0.9rem', background: '#f9f9f9',
                        }}
                    >
                        <option value="" disabled>Select a tab</option>
                        {tabs.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Transaction type */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>
                        Transaction Type
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['credit', 'cash'].map(t => (
                            <button key={t} onClick={() => setTransactionType(t)} style={{
                                flex: 1, padding: '10px', border: `2px solid ${transactionType === t ? THEME.primary : '#ddd'}`,
                                borderRadius: 10, background: transactionType === t ? 'rgba(0,0,122,0.06)' : '#fff',
                                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                                color: transactionType === t ? THEME.primary : '#666',
                                fontFamily: FONT_STACK,
                            }}>
                                {t === 'credit' ? 'Credit Card' : 'Cash'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* File input */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '16px', border: '2px dashed #ccc', borderRadius: 12,
                        cursor: 'pointer', background: '#fafafa',
                        fontSize: '0.88rem', fontWeight: 600, color: '#666',
                    }}>
                        <Upload size={20} />
                        {uploading ? 'Uploading…' : 'Choose CSV or Excel file'}
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            multiple
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            disabled={uploading}
                        />
                    </label>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 10, color: IOS.red, fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && !uploadedData && (
                    <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, color: IOS.green, fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                        {success}
                    </div>
                )}

                {/* Preview + Save */}
                {uploadedData && (
                    <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <FileText size={18} color={IOS.blue} />
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                {uploadedData.transaction_count} transactions ready
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: 'auto' }}>
                                Total: ₪{Math.abs(uploadedData.total_amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setUploadedData(null); setSuccess(null); }}
                                style={{
                                    flex: 1, padding: '12px', border: '1px solid #ddd',
                                    borderRadius: 10, background: '#fff', fontWeight: 600,
                                    fontSize: '0.88rem', cursor: 'pointer', fontFamily: FONT_STACK,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !targetTabId}
                                style={{
                                    flex: 1, padding: '12px', border: 'none',
                                    borderRadius: 10, background: THEME.primary, color: '#fff',
                                    fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                                    opacity: (saving || !targetTabId) ? 0.5 : 1,
                                    fontFamily: FONT_STACK,
                                }}
                            >
                                {saving ? 'Saving…' : `Save to ${tabs.find(t => String(t.id) === String(targetTabId))?.name || 'tab'}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileBankUpload;
