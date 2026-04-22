import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api';

const csvEscape = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;

const taskToRow = (t, getCategoryLabel) => {
    const categories = Array.isArray(t.categories)
        ? t.categories.map(getCategoryLabel).filter(Boolean).join('; ')
        : (t.category || '');
    const tags = Array.isArray(t.tags) ? t.tags.join('; ') : '';
    return [t.title, t.task_date, t.task_time, categories, tags, t.duration, t.status, t.client, t.description]
        .map(csvEscape).join(',');
};

const useTaskSelection = ({ tasks, setTasks, getCategoryLabel, fetchStats }) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setSelectionMode(false);
    }, []);

    const toggleSelectionMode = useCallback(() => {
        setSelectionMode(prev => {
            if (prev) setSelectedIds(new Set());
            return !prev;
        });
    }, []);

    const enterSelectionWith = useCallback((id) => {
        setSelectionMode(true);
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const exportSelected = useCallback(() => {
        const picked = tasks.filter(t => selectedIds.has(t.id));
        if (!picked.length) return;
        const header = 'Title,Date,Time,Categories,Tags,Duration,Status,Client,Description\n';
        const rows = picked.map(t => taskToRow(t, getCategoryLabel)).join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        clearSelection();
    }, [tasks, selectedIds, getCategoryLabel, clearSelection]);

    const shareSelected = useCallback(() => {
        const picked = tasks.filter(t => selectedIds.has(t.id));
        if (!picked.length) return;
        const body = picked.map(t => {
            const dateLine = [t.task_date, t.task_time].filter(Boolean).join(' ');
            const parts = [`• ${t.title}${dateLine ? ` (${dateLine})` : ''}`];
            if (t.description) parts.push(t.description);
            return parts.join('\n');
        }).join('\n\n');
        const subject = `Tasks (${picked.length})`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        clearSelection();
    }, [tasks, selectedIds, clearSelection]);

    const deleteSelected = useCallback(async () => {
        const ids = [...selectedIds];
        if (!ids.length) return;
        if (!window.confirm(`Delete ${ids.length} task${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
        const removed = tasks.filter(t => selectedIds.has(t.id));
        setTasks(prev => prev.filter(t => !selectedIds.has(t.id)));
        clearSelection();
        const results = await Promise.allSettled(ids.map(id =>
            fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
                .then(res => { if (!res.ok) throw new Error(`Failed: ${id}`); })
        ));
        const failed = results
            .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
            .filter(Boolean);
        if (failed.length) {
            const failedSet = new Set(failed);
            const revert = removed.filter(t => failedSet.has(t.id));
            setTasks(prev => [...prev, ...revert]);
            alert(`${failed.length} task${failed.length === 1 ? '' : 's'} could not be deleted.`);
        }
        if (fetchStats) fetchStats();
    }, [tasks, selectedIds, setTasks, clearSelection, fetchStats]);

    return {
        selectionMode, selectedIds,
        toggleSelect, clearSelection, toggleSelectionMode, enterSelectionWith,
        exportSelected, shareSelected, deleteSelected,
    };
};

export default useTaskSelection;
