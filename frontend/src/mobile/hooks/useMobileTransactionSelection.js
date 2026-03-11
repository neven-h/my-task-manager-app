import { useState, useCallback } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const useMobileTransactionSelection = (activeTabId, setError, fetchTransactions, fetchStats) => {
    const [selectMode, setSelectMode] = useState(false);
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

    const exitSelectMode = useCallback(() => {
        setSelectMode(false);
        setSelectedIds(new Set());
    }, []);

    const enterSelectMode = useCallback(() => setSelectMode(true), []);

    const deleteSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected transactions?`)) return;
        try {
            const res = await fetch(`${API_BASE}/transactions/batch`, {
                method: 'DELETE',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedIds], tab_id: activeTabId }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
            exitSelectMode();
            await fetchTransactions();
            await fetchStats();
        } catch (err) {
            setError(err.message);
        }
    }, [selectedIds, activeTabId, exitSelectMode, fetchTransactions, fetchStats, setError]);

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
            if (isIOS()) {
                window.location.href = url;
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_selected_${selectedIds.size}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (err) {
            setError(err.message);
        }
    }, [selectedIds, activeTabId, setError]);

    return {
        selectMode, selectedIds,
        enterSelectMode, exitSelectMode,
        toggleSelected, selectAll,
        deleteSelected, exportSelected,
    };
};

export default useMobileTransactionSelection;
