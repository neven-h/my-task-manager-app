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

    const [rtlEnabled, setRtlEnabledState] = useState(() => {
        if (authRole === 'shared') return false;
        return storage.get(STORAGE_KEYS.TASK_RTL_ENABLED) === 'true';
    });
    const setRtlEnabled = useCallback((val) => {
        setRtlEnabledState(val);
        storage.set(STORAGE_KEYS.TASK_RTL_ENABLED, String(val));
    }, []);

    useEffect(() => {
        const savedView = storage.get(STORAGE_KEYS.LAST_ACTIVE_VIEW);
        if (savedView && ['tasks', 'transactions', 'clients', 'portfolio', 'stats', 'notebook', 'budget'].includes(savedView)) {
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
            Promise.all([fetchCategories(), fetchTags(), fetchClients(), loadTasks(), fetchStats()])
                .catch(err => { console.error('Error loading initial data:', err); setError('Failed to load initial data. Please refresh the page.'); })
                .finally(() => setLoading(false));
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
    const toggleTaskStatus = useCallback(async (id) => { if (await toggleTaskStatusRaw(id)) { await loadTasks(); await fetchStats(); } }, [toggleTaskStatusRaw, loadTasks, fetchStats]);
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

    const value = useMemo(() => ({
        authToken, authRole, authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,
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
        rtlEnabled, setRtlEnabled,
    ]);

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export default TaskContext;
