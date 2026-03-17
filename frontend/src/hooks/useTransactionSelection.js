import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTransactionSelection = (activeTabId, setError) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleSelected = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const selectAll = useCallback((ids) => {
        setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
    }, []);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const deleteSelected = useCallback(async () => {
        if (selectedIds.size === 0) return false;
        if (!window.confirm(`Delete ${selectedIds.size} selected transactions?`)) return false;
        try {
            const res = await fetch(`${API_BASE}/transactions/batch`, {
                method: 'DELETE',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedIds], tab_id: activeTabId }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
            clearSelection();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [selectedIds, activeTabId, clearSelection, setError]);

    const exportSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;
        try {
            const res = await fetch(`${API_BASE}/export/transactions/csv/selected`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedIds], tab_id: activeTabId }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_selected_${selectedIds.size}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    }, [selectedIds, activeTabId, setError]);

    const renameSelected = useCallback(async (newDescription) => {
        if (selectedIds.size === 0 || !newDescription.trim()) return false;
        try {
            const res = await fetch(`${API_BASE}/transactions/batch/rename-ids`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedIds], tab_id: activeTabId, new_description: newDescription.trim() }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Rename failed');
            clearSelection();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [selectedIds, activeTabId, clearSelection, setError]);

    return { selectedIds, toggleSelected, selectAll, clearSelection, deleteSelected, exportSelected, renameSelected };
};

export default useTransactionSelection;
