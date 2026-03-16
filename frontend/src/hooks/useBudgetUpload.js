import { useState, useRef } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useBudgetUpload = () => {
    const [step, setStep] = useState('idle'); // idle | preview | saving | success
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [savedIds, setSavedIds] = useState([]);
    const [undone, setUndone] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef(null);

    const reset = () => {
        setStep('idle'); setFile(null); setParsedData(null);
        setSavedIds([]); setUndone(false); setError(null);
    };

    const handleFileSelect = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
        e.target.value = '';
    };

    const handleUpload = async () => {
        if (!file) return;
        setError(null); setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_BASE}/budget/upload`, {
                method: 'POST', headers: getAuthHeaders(false), body: fd
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(data?.error || 'Upload failed'); return; }
            setParsedData(data);
            setStep('preview');
        } catch {
            setError('Upload failed');
        } finally { setUploading(false); }
    };

    const handleSave = async (tabId) => {
        if (!parsedData?.entries || !tabId) return;
        setError(null); setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/budget/save-batch`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ entries: parsedData.entries, tab_id: tabId })
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
        step, file, fileRef, uploading, saving, parsedData,
        savedIds, undone, undoing, error,
        reset, handleFileSelect, handleUpload, handleSave, handleUndo,
    };
};

export default useBudgetUpload;
