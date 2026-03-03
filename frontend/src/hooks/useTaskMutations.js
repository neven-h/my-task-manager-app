import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTaskMutations = (setError, setLoading, fetchCategories, fetchTags) => {
    const createCategory = useCallback(async (name, color, icon, owner) => {
        if (!name.trim()) { setError('Category name is required'); return false; }
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/categories`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id: name.toLowerCase().replace(/\s+/g, '-'), label: name, color, icon, owner })
            });
            if (response.ok) { await fetchCategories(); return true; }
            const errorData = await response.json();
            console.error('Failed to create category:', errorData);
            setError(`Failed to create category: ${errorData.error || 'Unknown error'}`);
            return false;
        } catch (err) {
            console.error('Error creating category:', err);
            setError(`Failed to create category: ${err.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setError, setLoading, fetchCategories]);

    const createTag = useCallback(async (tagName, owner) => {
        try {
            const response = await fetch(`${API_BASE}/tags`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: tagName, color: '#0d6efd', owner })
            });
            if (response.ok) { await fetchTags(); }
        } catch (err) {
            console.error('Error creating tag:', err);
        }
    }, [fetchTags]);

    const deleteTask = useCallback(async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to delete task');
            setError(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setError, setLoading]);

    const duplicateTask = useCallback(async (id) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${id}/duplicate`, { method: 'POST', headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to duplicate task');
            setError(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setError, setLoading]);

    const toggleTaskStatus = useCallback(async (id) => {
        try {
            const response = await fetch(`${API_BASE}/tasks/${id}/toggle-status`, { method: 'PATCH', headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to toggle status');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [setError]);

    return { createCategory, createTag, deleteTask, duplicateTask, toggleTaskStatus };
};

export default useTaskMutations;
