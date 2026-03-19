import { useState, useEffect, useRef } from 'react';
import API_BASE from '../../../config';
import { getAuthHeaders } from '../../../api.js';

const useMobileUploadFlow = ({ isOpen, onClose, onUploadComplete }) => {
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
                if (normalized.length > 0 && !selectedTabId) setSelectedTabId(normalized[0].id);
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
                method: 'POST', headers: getAuthHeaders(false), body: fd
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(data?.error || 'Upload failed'); return; }
            setParsedData(data);
            setStep('preview');
        } catch (err) {
            setError('Upload failed');
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
                    tab_id: selectedTabId,
                    last_balance: parsedData.last_balance ?? null,
                    balance_date: parsedData.balance_date ?? null,
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(data?.error || 'Save failed'); return; }
            setSavedIds(data?.transaction_ids || []);
            setStep('success');
            if (onUploadComplete) onUploadComplete();
        } catch (err) {
            setError('Save failed');
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
            setError('Undo failed');
        } finally {
            setUndoing(false);
        }
    };

    return {
        step, setStep,
        transactionType, setTransactionType,
        tabs, selectedTabId, setSelectedTabId,
        tabsLoading, file, fileRef,
        uploading, saving, parsedData,
        savedIds, undone, undoing, error,
        handleCreateTab, handleFileSelect,
        handleUploadAndParse, handleSave, handleUndo,
    };
};

export default useMobileUploadFlow;
