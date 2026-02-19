import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTaskData = () => {
    const [tasks, setTasks] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
            const data = await response.json();
            setAllCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setAllCategories([]);
        }
    }, []);

    const fetchTags = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/tags`, { headers: getAuthHeaders() });
            const data = await response.json();
            setAllTags(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching tags:', err);
            setAllTags([]);
        }
    }, []);

    const fetchClients = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
            const data = await response.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching clients:', err);
            setClients([]);
        }
    }, []);

    const fetchTasks = useCallback(async (filterParams) => {
        try {
            setLoading(true);
            const params = filterParams || new URLSearchParams();

            const response = await fetch(`${API_BASE}/tasks?${params}`, { headers: getAuthHeaders() });
            let data = await response.json();
            if (!Array.isArray(data)) {
                data = [];
            }
            return data;
        } catch (err) {
            setError('Failed to fetch tasks');
            console.error('Error fetching tasks:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
            const data = await response.json();
            setStats(response.ok && data && typeof data === 'object' && !data.error ? data : null);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setStats(null);
        }
    }, []);

    const createCategory = useCallback(async (name, color, icon, owner) => {
        if (!name.trim()) {
            setError('Category name is required');
            return false;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE}/categories`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    label: name,
                    color: color,
                    icon: icon,
                    owner: owner
                })
            });

            if (response.ok) {
                await fetchCategories();
                return true;
            } else {
                const errorData = await response.json();
                console.error('Failed to create category:', errorData);
                setError(`Failed to create category: ${errorData.error || 'Unknown error'}`);
                return false;
            }
        } catch (err) {
            console.error('Error creating category:', err);
            setError(`Failed to create category: ${err.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    }, [fetchCategories]);

    const createTag = useCallback(async (tagName, owner) => {
        try {
            const response = await fetch(`${API_BASE}/tags`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: tagName,
                    color: '#0d6efd',
                    owner: owner
                })
            });

            if (response.ok) {
                await fetchTags();
            }
        } catch (err) {
            console.error('Error creating tag:', err);
        }
    }, [fetchTags]);

    const deleteTask = useCallback(async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete task');
            setError(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const duplicateTask = useCallback(async (id) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${id}/duplicate`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to duplicate task');
            setError(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleTaskStatus = useCallback(async (id) => {
        try {
            const response = await fetch(`${API_BASE}/tasks/${id}/toggle-status`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to toggle status');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    const exportToCSV = useCallback(async (filterParams) => {
        try {
            const params = filterParams || new URLSearchParams();
            const response = await fetch(`${API_BASE}/export/csv?${params}`, { headers: getAuthHeaders() });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export CSV');
        }
    }, []);

    const exportHoursReport = useCallback(async (filterParams) => {
        try {
            const params = filterParams || new URLSearchParams();
            const response = await fetch(`${API_BASE}/export/hours-report?${params}`, { headers: getAuthHeaders() });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hours_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export hours report');
        }
    }, []);

    const importHoursReport = useCallback(async (event) => {
        console.log('[IMPORT] importHoursReport called', event);
        const file = event.target.files[0];
        console.log('[IMPORT] Selected file:', file);
        if (!file) {
            console.log('[IMPORT] No file selected, returning');
            return;
        }

        const fd = new FormData();
        fd.append('file', file);

        try {
            setLoading(true);
            setError(null);
            console.log('[IMPORT] Sending request to:', `${API_BASE}/import/hours-report`);

            const response = await fetch(`${API_BASE}/import/hours-report`, {
                method: 'POST',
                headers: getAuthHeaders(false),
                body: fd
            });

            console.log('[IMPORT] Response status:', response.status);
            const result = await response.json();
            console.log('[IMPORT] Response data:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to import hours report');
            }

            if (result.errors && result.errors.length > 0) {
                setError(`Imported ${result.imported_count} tasks. Some rows had errors: ${result.errors.join(', ')}`);
            } else {
                alert(`Successfully imported ${result.imported_count} tasks!`);
                setError(null);
            }

            event.target.value = '';
            return true;
        } catch (err) {
            console.error('[IMPORT] Error:', err);
            setError(err.message || 'Failed to import hours report');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        tasks, setTasks,
        allCategories, setAllCategories,
        allTags, setAllTags,
        clients, setClients,
        stats, setStats,
        loading, setLoading,
        error, setError,
        fetchCategories, fetchTags, fetchClients, fetchTasks, fetchStats,
        createCategory, createTag,
        deleteTask, duplicateTask, toggleTaskStatus,
        exportToCSV, exportHoursReport, importHoursReport
    };
};

export default useTaskData;
