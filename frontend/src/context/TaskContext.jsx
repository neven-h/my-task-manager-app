import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import useTaskData from '../hooks/useTaskData';
import useTaskFilters from '../hooks/useTaskFilters';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const TaskContext = createContext(null);

export const useTaskContext = () => {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTaskContext must be used within a TaskProvider');
    return ctx;
};

export const TaskProvider = ({ authToken, authRole, authUser, onLogout, children }) => {
    const isSharedUser = authRole === 'shared';
    const isLimitedUser = authRole === 'limited';
    const isAdmin = authRole === 'admin';

    // Data layer
    const data = useTaskData();
    const {
        tasks, setTasks,
        allCategories, allTags, clients, stats,
        loading, setLoading, error, setError,
        fetchCategories, fetchTags, fetchClients, fetchTasks: fetchTasksRaw, fetchStats,
        createCategory: createCategoryRaw, createTag: createTagRaw,
        deleteTask: deleteTaskRaw, duplicateTask: duplicateTaskRaw, toggleTaskStatus: toggleTaskStatusRaw,
        exportToCSV: exportToCSVRaw, exportHoursReport: exportHoursReportRaw, importHoursReport: importHoursReportRaw
    } = data;

    // Filter layer
    const filterData = useTaskFilters();
    const { filters, setFilters, taskViewMode, setTaskViewMode, debouncedFilters, buildFilterParams } = filterData;

    // View state
    const [appView, setAppView] = useState('tasks');
    const [view, setView] = useState('list');

    // Modal controls
    const [formModalState, setFormModalState] = useState({ isOpen: false, editingTask: null });
    const [showBulkInput, setShowBulkInput] = useState(false);
    const [shareModalState, setShareModalState] = useState({ isOpen: false, sharingTask: null });

    // RTL preference (admin + limited only)
    const [rtlEnabled, setRtlEnabledState] = useState(() => {
        if (authRole === 'shared') return false;
        return localStorage.getItem('taskRtlEnabled') === 'true';
    });
    const setRtlEnabled = useCallback((val) => {
        setRtlEnabledState(val);
        localStorage.setItem('taskRtlEnabled', String(val));
    }, []);

    // Persist appView
    useEffect(() => {
        const savedView = localStorage.getItem('lastActiveView');
        if (savedView && ['tasks', 'transactions', 'clients', 'portfolio'].includes(savedView)) {
            setAppView(savedView);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('lastActiveView', appView);
    }, [appView]);

    // Load initial data
    useEffect(() => {
        if (authUser && authRole) {
            setLoading(true);
            Promise.all([
                fetchCategories(),
                fetchTags(),
                fetchClients(),
                loadTasks(),
                fetchStats()
            ])
            .catch(err => {
                console.error('Error loading initial data:', err);
                setError('Failed to load initial data. Please refresh the page.');
            })
            .finally(() => setLoading(false));
        }
    }, [authUser, authRole]);

    // Debounced filter effect
    useEffect(() => {
        if (authUser && authRole) {
            loadTasks(debouncedFilters);
        }
    }, [debouncedFilters, authUser, authRole]);

    // Load tasks with client-side tag filtering
    const loadTasks = useCallback(async (overrideFilters) => {
        const activeFilters = overrideFilters || filters;
        const params = buildFilterParams(activeFilters);
        let taskData = await fetchTasksRaw(params);

        // Client-side filtering by tags
        if (activeFilters.tags && activeFilters.tags.length > 0) {
            taskData = taskData.filter(task =>
                task.tags && activeFilters.tags.some(filterTag =>
                    task.tags.includes(filterTag)
                )
            );
        }

        setTasks(taskData);
        setError(null);
    }, [filters, buildFilterParams, fetchTasksRaw, setTasks, setError]);

    // Memoized filtered lists
    const { completedTasks, uncompletedTasks } = useMemo(() => ({
        completedTasks: tasks.filter(t => t.status === 'completed'),
        uncompletedTasks: tasks.filter(t => t.status === 'uncompleted')
    }), [tasks]);

    // Helpers
    const getCategoryLabel = useCallback((categoryId) => {
        const category = allCategories.find(c => c.id === categoryId);
        return category ? category.label : categoryId;
    }, [allCategories]);

    const getStatusColor = useCallback((status) => {
        const colors = {
            'completed': { bg: '#FFD500', border: '#000', color: '#000' },
            'uncompleted': { bg: '#FF0000', border: '#000', color: '#fff' }
        };
        return colors[status] || colors.uncompleted;
    }, []);

    const getStatusLabel = useCallback((status) => {
        const labels = { 'completed': 'Completed', 'uncompleted': 'Uncompleted' };
        return labels[status] || status;
    }, []);

    // Wrapped CRUD that refreshes data
    const deleteTask = useCallback(async (id) => {
        const success = await deleteTaskRaw(id);
        if (success) {
            await loadTasks();
            await fetchStats();
        }
    }, [deleteTaskRaw, loadTasks, fetchStats]);

    const duplicateTask = useCallback(async (id) => {
        const success = await duplicateTaskRaw(id);
        if (success) {
            await loadTasks();
            await fetchStats();
        }
    }, [duplicateTaskRaw, loadTasks, fetchStats]);

    const toggleTaskStatus = useCallback(async (id) => {
        const success = await toggleTaskStatusRaw(id);
        if (success) {
            await loadTasks();
            await fetchStats();
        }
    }, [toggleTaskStatusRaw, loadTasks, fetchStats]);

    const createCategory = useCallback(async (name, color, icon) => {
        return await createCategoryRaw(name, color, icon, authUser);
    }, [createCategoryRaw, authUser]);

    const createTag = useCallback(async (tagName) => {
        return await createTagRaw(tagName, authUser);
    }, [createTagRaw, authUser]);

    const exportToCSV = useCallback(async () => {
        const params = buildFilterParams();
        await exportToCSVRaw(params);
    }, [buildFilterParams, exportToCSVRaw]);

    const exportHoursReport = useCallback(async () => {
        const params = buildFilterParams();
        await exportHoursReportRaw(params);
    }, [buildFilterParams, exportHoursReportRaw]);

    const importHoursReport = useCallback(async (event) => {
        const success = await importHoursReportRaw(event);
        if (success) {
            await loadTasks();
            await fetchStats();
            await fetchClients();
        }
    }, [importHoursReportRaw, loadTasks, fetchStats, fetchClients]);

    // Submit task (create or update)
    const submitTask = useCallback(async (formData, editingTask) => {
        try {
            setLoading(true);
            const url = editingTask
                ? `${API_BASE}/tasks/${editingTask.id}`
                : `${API_BASE}/tasks`;

            const method = editingTask ? 'PUT' : 'POST';
            const { attachments, newAttachments, removedAttachmentIds, ...payload } = formData;

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save task');
            }

            const responseData = await response.json().catch(() => ({}));
            const taskId = editingTask ? editingTask.id : responseData.id;

            if (taskId) {
                for (const { file, name } of (newAttachments || [])) {
                    const fd = new FormData();
                    fd.append('file', file, name || file.name || `image-${Date.now()}.png`);
                    const upRes = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
                        method: 'POST',
                        headers: getAuthHeaders(false),
                        body: fd
                    });
                    if (!upRes.ok) {
                        const upErr = await upRes.json().catch(() => ({}));
                        throw new Error(upErr.error || 'Failed to upload attachment');
                    }
                }
                for (const attId of (removedAttachmentIds || [])) {
                    await fetch(`${API_BASE}/tasks/${taskId}/attachments/${attId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                }
            }

            await loadTasks();
            await fetchStats();
            await fetchClients();
            setError(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [loadTasks, fetchStats, fetchClients, setLoading, setError]);

    // Bulk task submit
    const submitBulkTasks = useCallback(async (taskTitles, categories, client, taskDate, taskTime) => {
        const tasksToCreate = taskTitles.map(title => ({
            title,
            description: '',
            categories: categories.length > 0 ? categories : [],
            client: client || '',
            task_date: taskDate,
            task_time: taskTime || '',
            duration: '',
            status: 'uncompleted',
            tags: [],
            notes: ''
        }));

        try {
            setLoading(true);
            const promises = tasksToCreate.map(task =>
                fetch(`${API_BASE}/tasks`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(task)
                })
            );

            await Promise.all(promises);
            await loadTasks();
            await fetchStats();
            await fetchClients();
            setError(null);
            return true;
        } catch (err) {
            setError('Failed to create bulk tasks');
            return false;
        } finally {
            setLoading(false);
        }
    }, [loadTasks, fetchStats, fetchClients, setLoading, setError]);

    // Share task
    const shareTask = useCallback(async (taskId, email) => {
        if (!email.trim()) {
            alert('Please enter an email address');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return false;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${taskId}/share`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: email.trim() })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to share task');
            }

            alert(`Task shared successfully with ${email}!`);
            return true;
        } catch (err) {
            alert(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    // Modal control helpers
    const openNewTaskForm = useCallback(() => {
        setFormModalState({ isOpen: true, editingTask: null });
    }, []);

    const openEditTaskForm = useCallback((task) => {
        setFormModalState({ isOpen: true, editingTask: task });
    }, []);

    const closeFormModal = useCallback(() => {
        setFormModalState({ isOpen: false, editingTask: null });
    }, []);

    const openShareModal = useCallback((task) => {
        setShareModalState({ isOpen: true, sharingTask: task });
    }, []);

    const closeShareModal = useCallback(() => {
        setShareModalState({ isOpen: false, sharingTask: null });
    }, []);

    const value = {
        // Auth
        authToken, authRole, authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,

        // Data
        tasks, allCategories, allTags, clients, stats,
        loading, error, setError,
        completedTasks, uncompletedTasks,

        // Filters
        filters, setFilters,
        taskViewMode, setTaskViewMode,
        buildFilterParams,
        hasActiveFilters: filterData.hasActiveFilters,
        clearFilters: filterData.clearFilters,

        // View
        appView, setAppView, view, setView,

        // CRUD
        fetchTasks: loadTasks, fetchStats, fetchClients, fetchCategories, fetchTags,
        deleteTask, toggleTaskStatus, duplicateTask,
        createCategory, createTag,
        submitTask, submitBulkTasks, shareTask,
        exportToCSV, exportHoursReport, importHoursReport,

        // Helpers
        getCategoryLabel, getStatusColor, getStatusLabel,

        // Modal controls
        formModal: formModalState,
        openNewTaskForm, openEditTaskForm, closeFormModal,
        showBulkInput, setShowBulkInput,
        shareModal: shareModalState,
        openShareModal, closeShareModal,

        // Display preferences
        rtlEnabled, setRtlEnabled,
    };

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export default TaskContext;
