import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import useTaskData from '../hooks/useTaskData';
import useTaskFilters from '../hooks/useTaskFilters';
import useTaskSubmit from '../hooks/useTaskSubmit';
import storage, { STORAGE_KEYS } from '../utils/storage';

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

    const data = useTaskData();
    const {
        tasks, setTasks, allCategories, allTags, clients, stats,
        loading, setLoading, error, setError,
        fetchCategories, fetchTags, fetchClients, fetchTasks: fetchTasksRaw, fetchStats,
        createCategory: createCategoryRaw, deleteCategory: deleteCategoryRaw, createTag: createTagRaw,
        deleteTask: deleteTaskRaw, duplicateTask: duplicateTaskRaw, toggleTaskStatus: toggleTaskStatusRaw,
        exportToCSV: exportToCSVRaw, exportHoursReport: exportHoursReportRaw, importHoursReport: importHoursReportRaw
    } = data;

    const filterData = useTaskFilters();
    const { filters, setFilters, taskViewMode, setTaskViewMode, debouncedFilters, buildFilterParams, hasActiveFilters, clearFilters } = filterData;

    const [appView, setAppView] = useState('tasks');
    const [view, setView] = useState('list');
    const [formModalState, setFormModalState] = useState({ isOpen: false, editingTask: null });
    const [showBulkInput, setShowBulkInput] = useState(false);
    const [shareModalState, setShareModalState] = useState({ isOpen: false, sharingTask: null });
    const [calendarModalState, setCalendarModalState] = useState({ isOpen: false, task: null });

    const [rtlEnabled, setRtlEnabledState] = useState(() => {
        if (authRole === 'shared') return false;
        return storage.get(STORAGE_KEYS.TASK_RTL_ENABLED) === 'true';
    });
    const setRtlEnabled = useCallback((val) => {
        setRtlEnabledState(val);
        storage.set(STORAGE_KEYS.TASK_RTL_ENABLED, String(val));
    }, []);

    // Nav visibility — persisted in localStorage so each user controls their own menu
    const [navVisibility, setNavVisibilityState] = useState(() => {
        try {
            const saved = localStorage.getItem('nav_visible_tabs');
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return { transactions: true, clients: true, portfolio: true, budget: true, notebook: true, renovation: false };
    });
    const setNavVisibility = useCallback((key, value) => {
        setNavVisibilityState(prev => {
            const next = { ...prev, [key]: value };
            localStorage.setItem('nav_visible_tabs', JSON.stringify(next));
            return next;
        });
    }, []);

    useEffect(() => {
        const savedView = storage.get(STORAGE_KEYS.LAST_ACTIVE_VIEW);
        if (savedView && ['tasks', 'transactions', 'clients', 'portfolio', 'stats', 'notebook', 'budget', 'renovation'].includes(savedView)) {
            setAppView(savedView);
        }
    }, []);

    useEffect(() => { storage.set(STORAGE_KEYS.LAST_ACTIVE_VIEW, appView); }, [appView]);

    const loadTasks = useCallback(async (overrideFilters) => {
        const activeFilters = overrideFilters || filters;
        const params = buildFilterParams(activeFilters);
        let taskData = await fetchTasksRaw(params);
        if (activeFilters.tags && activeFilters.tags.length > 0) {
            taskData = taskData.filter(task => task.tags && activeFilters.tags.some(ft => task.tags.includes(ft)));
        }
        setTasks(taskData);
        setError(null);
    }, [filters, buildFilterParams, fetchTasksRaw, setTasks, setError]);

    useEffect(() => {
        if (authUser && authRole) {
            setLoading(true);
            // Load tasks first so the UI unblocks immediately, then fetch the rest in background
            loadTasks()
                .catch(err => { console.error('Error loading tasks:', err); setError('Failed to load initial data. Please refresh the page.'); })
                .finally(() => setLoading(false));
            Promise.all([fetchCategories(), fetchTags(), fetchClients(), fetchStats()])
                .catch(err => console.error('Error loading background data:', err));
        }
    }, [authUser, authRole]);

    useEffect(() => {
        if (authUser && authRole) loadTasks(debouncedFilters);
    }, [debouncedFilters, authUser, authRole]);

    const { completedTasks, uncompletedTasks } = useMemo(() => ({
        completedTasks: tasks.filter(t => t.status === 'completed'),
        uncompletedTasks: tasks.filter(t => t.status === 'uncompleted')
    }), [tasks]);

    const getCategoryLabel = useCallback((id) => allCategories.find(c => c.id === id)?.label ?? id, [allCategories]);
    const getStatusColor = useCallback((status) => ({ completed: { bg: '#FFD500', border: '#000', color: '#000' }, uncompleted: { bg: '#FF0000', border: '#000', color: '#fff' } })[status] || { bg: '#FF0000', border: '#000', color: '#fff' }, []);
    const getStatusLabel = useCallback((status) => ({ completed: 'Completed', uncompleted: 'Uncompleted' })[status] || status, []);

    const deleteTask = useCallback(async (id) => { if (await deleteTaskRaw(id)) { await loadTasks(); await fetchStats(); } }, [deleteTaskRaw, loadTasks, fetchStats]);
    const duplicateTask = useCallback(async (id) => { if (await duplicateTaskRaw(id)) { await loadTasks(); await fetchStats(); } }, [duplicateTaskRaw, loadTasks, fetchStats]);
    const toggleTaskStatus = useCallback(async (id) => {
        // Optimistic update — flip the task locally so the UI responds instantly
        let prevStatus;
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            prevStatus = t.status;
            return { ...t, status: t.status === 'completed' ? 'uncompleted' : 'completed' };
        }));
        const ok = await toggleTaskStatusRaw(id);
        if (!ok) {
            // Revert on server error
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: prevStatus } : t));
        } else {
            // Refresh stats silently in background — no loading spinner
            fetchStats();
        }
    }, [toggleTaskStatusRaw, setTasks, fetchStats]);
    const createCategory = useCallback((name, color, icon) => createCategoryRaw(name, color, icon, authUser), [createCategoryRaw, authUser]);
    const deleteCategory = useCallback((categoryId) => deleteCategoryRaw(categoryId), [deleteCategoryRaw]);
    const createTag = useCallback((tagName) => createTagRaw(tagName, authUser), [createTagRaw, authUser]);
    const exportToCSV = useCallback(async () => exportToCSVRaw(buildFilterParams()), [buildFilterParams, exportToCSVRaw]);
    const exportHoursReport = useCallback(async () => exportHoursReportRaw(buildFilterParams()), [buildFilterParams, exportHoursReportRaw]);
    const importHoursReport = useCallback(async (event) => {
        if (await importHoursReportRaw(event)) { await loadTasks(); await fetchStats(); await fetchClients(); }
    }, [importHoursReportRaw, loadTasks, fetchStats, fetchClients]);

    const { submitTask, submitBulkTasks, shareTask } = useTaskSubmit({ setLoading, setError, loadTasks, fetchStats, fetchClients });

    const openNewTaskForm = useCallback(() => setFormModalState({ isOpen: true, editingTask: null }), []);
    const openEditTaskForm = useCallback((task) => setFormModalState({ isOpen: true, editingTask: task }), []);
    const closeFormModal = useCallback(() => setFormModalState({ isOpen: false, editingTask: null }), []);
    const openShareModal = useCallback((task) => setShareModalState({ isOpen: true, sharingTask: task }), []);
    const closeShareModal = useCallback(() => setShareModalState({ isOpen: false, sharingTask: null }), []);
    const openCalendarModal = useCallback((task) => setCalendarModalState({ isOpen: true, task }), []);
    const closeCalendarModal = useCallback(() => setCalendarModalState({ isOpen: false, task: null }), []);

    const value = useMemo(() => ({
        authToken, authRole, authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,
        navVisibility, setNavVisibility,
        tasks, allCategories, allTags, clients, stats, loading, error, setError,
        completedTasks, uncompletedTasks,
        filters, setFilters, taskViewMode, setTaskViewMode, buildFilterParams,
        hasActiveFilters, clearFilters,
        appView, setAppView, view, setView,
        fetchTasks: loadTasks, fetchStats, fetchClients, fetchCategories, fetchTags,
        deleteTask, toggleTaskStatus, duplicateTask, createCategory, deleteCategory, createTag,
        submitTask, submitBulkTasks, shareTask,
        exportToCSV, exportHoursReport, importHoursReport,
        getCategoryLabel, getStatusColor, getStatusLabel,
        formModal: formModalState, openNewTaskForm, openEditTaskForm, closeFormModal,
        showBulkInput, setShowBulkInput,
        shareModal: shareModalState, openShareModal, closeShareModal,
        calendarModal: calendarModalState, openCalendarModal, closeCalendarModal,
        rtlEnabled, setRtlEnabled,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [
        authToken, authRole, authUser, onLogout,
        tasks, allCategories, allTags, clients, stats, loading, error, setError,
        completedTasks, uncompletedTasks,
        filters, setFilters, taskViewMode, setTaskViewMode, buildFilterParams,
        hasActiveFilters, clearFilters,
        appView, setAppView, view, setView,
        loadTasks, fetchStats, fetchClients, fetchCategories, fetchTags,
        deleteTask, toggleTaskStatus, duplicateTask, createCategory, deleteCategory, createTag,
        submitTask, submitBulkTasks, shareTask,
        exportToCSV, exportHoursReport, importHoursReport,
        getCategoryLabel, getStatusColor, getStatusLabel,
        formModalState, openNewTaskForm, openEditTaskForm, closeFormModal,
        showBulkInput,
        shareModalState, openShareModal, closeShareModal,
        calendarModalState, openCalendarModal, closeCalendarModal,
        rtlEnabled, setRtlEnabled,
        navVisibility, setNavVisibility,
    ]);

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export default TaskContext;