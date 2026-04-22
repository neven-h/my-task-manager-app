import { useState, useRef } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useBudgetUpload = () => {
    const [step, setStep] = useState('idle'); // idle | preview | saving | success
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null); // { done, total, current }
    const [saving, setSaving] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [fileErrors, setFileErrors] = useState([]); // [{ name, error }]
    const [savedIds, setSavedIds] = useState([]);
    const [undone, setUndone] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef(null);

    const reset = () => {
        setStep('idle'); setFiles([]); setParsedData(null);
        setSavedIds([]); setUndone(false); setError(null);
        setFileErrors([]); setUploadProgress(null);
    };

    const handleFileSelect = (e) => {
        const picked = Array.from(e.target.files || []);
        if (picked.length) setFiles(prev => [...prev, ...picked]);
        e.target.value = '';
    };

    const removeFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const uploadOne = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_BASE}/budget/upload`, {
            method: 'POST', headers: getAuthHeaders(false), body: fd
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
        return data;
    };

    const handleUpload = async () => {
        if (!files.length) return;
        setError(null); setFileErrors([]); setUploading(true);
        setUploadProgress({ done: 0, total: files.length, current: files[0].name });
        const mergedEntries = [];
        const mergedBalances = [];
        const errs = [];
        try {
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                setUploadProgress({ done: i, total: files.length, current: f.name });
                try {
                    const data = await uploadOne(f);
                    if (Array.isArray(data?.entries)) mergedEntries.push(...data.entries);
                    if (Array.isArray(data?.balances)) mergedBalances.push(...data.balances);
                } catch (e) {
                    errs.push({ name: f.name, error: e.message || 'Upload failed' });
                }
            }
            setFileErrors(errs);
            if (!mergedEntries.length) {
                setError(errs.length
                    ? `All ${errs.length} file(s) failed to parse`
                    : 'No entries parsed from selected file(s)');
                return;
            }
            mergedEntries.sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)));
            setParsedData({
                entries: mergedEntries,
                balances: mergedBalances,
                entry_count: mergedEntries.length,
            });
            setStep('preview');
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const handleSave = async (tabId) => {
        if (!parsedData?.entries) return;
        if (!tabId) { setError('Please select a budget tab first'); return; }
        setError(null); setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/budget/save-batch`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ entries: parsedData.entries, balances: parsedData.balances || [], tab_id: tabId })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(data?.error || 'Save failed'); return; }
            setSavedIds(data?.entry_ids || []);
            setStep('success');
        } catch {
            setError('Save failed');
        } finally { setSaving(false); }
    };

    const handleUndo = async () => {
        if (!savedIds.length) return;
        setUndoing(true);
        try {
            const res = await fetch(`${API_BASE}/budget/batch-delete`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ entry_ids: savedIds })
            });
            if (res.ok) { setUndone(true); }
            else {
                const data = await res.json().catch(() => null);
                setError(data?.error || 'Undo failed');
            }
        } catch {
            setError('Undo failed');
        } finally { setUndoing(false); }
    };

    return {
        step, files, fileRef, uploading, uploadProgress, saving, parsedData,
        fileErrors, savedIds, undone, undoing, error,
        reset, handleFileSelect, removeFile, handleUpload, handleSave, handleUndo,
    };
};

export default useBudgetUpload;
