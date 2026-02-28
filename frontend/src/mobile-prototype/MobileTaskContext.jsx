/**
 * MobileTaskContext — local state & data context for the mobile-prototype version.
 *
 * This is intentionally separate from the desktop TaskProvider (context/TaskContext.jsx)
 * so the mobile-prototype maintains its own independent data layer.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

const MobileTaskContext = createContext(null);

export const useMobileTask = () => {
    const ctx = useContext(MobileTaskContext);
    if (!ctx) throw new Error('useMobileTask must be used inside MobileTaskProvider');
    return ctx;
};

const defaultFormData = () => ({
    title: '', description: '', categories: [], client: '',
    task_date: new Date().toISOString().split('T')[0],
    task_time: new Date().toTimeString().slice(0, 5),
    duration: '', status: 'uncompleted', tags: [], notes: '',
    shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
});

export const MobileTaskProvider = ({ children, authRole, authUser, onLogout }) => {
    const isSharedUser = authRole === 'shared';
    const isLimitedUser = authRole === 'limited';
    const isAdmin = authRole === 'admin';

    // ── Data state ──────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(false);

    // ── View / UI state ──────────────────────────────────────────────────────
    const [appView, setAppView] = useState('tasks');
    const [filterMode, setFilterMode] = useState('all');
    const [showSidebar, setShowSidebar] = useState(false);
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);

    // ── Search filters ───────────────────────────────────────────────────────
    const [searchFilters, setSearchFilters] = useState({
        search: '', category: 'all', status: 'all', client: '',
        dateStart: '', dateEnd: '', tags: [], hasAttachment: false
    });

    const hasActiveFilters = !!(
        searchFilters.search || searchFilters.category !== 'all' ||
        searchFilters.status !== 'all' || searchFilters.client ||
        searchFilters.dateStart || searchFilters.dateEnd ||
        searchFilters.tags.length > 0 || searchFilters.hasAttachment
    );

    const clearFilters = useCallback(() => {
        const cleared = { search: '', category: 'all', status: 'all', client: '', dateStart: '', dateEnd: '', tags: [], hasAttachment: false };
        setSearchFilters(cleared);
        fetchTasks(cleared);
    }, []);

    // ── Task form modal ──────────────────────────────────────────────────────
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // ── Bulk modal ───────────────────────────────────────────────────────────
    const [showBulkInput, setShowBulkInput] = useState(false);

    // ── Share modal ──────────────────────────────────────────────────────────
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingTask, setSharingTask] = useState(null);

    // ── Swipe state ──────────────────────────────────────────────────────────
    const [swipeStates, setSwipeStates] = useState({});
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);
    const swipeThreshold = 100;

    // ── Draft state ──────────────────────────────────────────────────────────
    const [formData, setFormData] = useState(defaultFormData);
    const [tagInput, setTagInput] = useState('');
    const formChangeTimeoutRef = useRef(null);

    // ── Load data on mount ───────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([fetchTasks(), fetchCategories(), fetchClients(), fetchTags()]);
    }, [authUser, authRole]);

    // ── Auto-save task draft ─────────────────────────────────────────────────
    useEffect(() => {
        if (!showTaskModal || (!formData.title && !formData.description)) return;
        if (formChangeTimeoutRef.current) clearTimeout(formChangeTimeoutRef.current);
        formChangeTimeoutRef.current = setTimeout(() => {
            storage.set(STORAGE_KEYS.MOBILE_TASK_DRAFT, formData);
        }, 1000);
        return () => { if (formChangeTimeoutRef.current) clearTimeout(formChangeTimeoutRef.current); };
    }, [formData, showTaskModal]);

    // ── API helpers ──────────────────────────────────────────────────────────
    const buildFilterParams = (f) => {
        const params = new URLSearchParams();
        if (f.category !== 'all') params.append('category', f.category);
        if (f.status !== 'all') params.append('status', f.status);
        if (f.client) params.append('client', f.client);
        if (f.search) params.append('search', f.search);
        if (f.dateStart) params.append('date_start', f.dateStart);
        if (f.dateEnd) params.append('date_end', f.dateEnd);
        if (f.hasAttachment) params.append('has_attachment', 'true');
        return params;
    };

    const fetchTasks = useCallback(async (overrideFilters) => {
        const activeFilters = overrideFilters || searchFilters;
        try {
            setLoading(true);
            const params = buildFilterParams(activeFilters);
            const res = await fetch(`${API_BASE}/tasks?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
            let list = await res.json();
            if (!Array.isArray(list)) list = [];
            if (activeFilters.tags.length > 0) {
                list = list.filter(task => task.tags && activeFilters.tags.some(tag => task.tags.includes(tag)));
            }
            list.sort((a, b) => {
                if (a.status === 'uncompleted' && b.status === 'completed') return -1;
                if (a.status === 'completed' && b.status === 'uncompleted') return 1;
                return 0;
            });
            setTasks(list);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [searchFilters]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch { setCategories([]); }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setClients(list.map(c => typeof c === 'string' ? c : c.name || c.client || c));
        } catch { setClients([]); }
    };

    const fetchTags = async () => {
        try {
            const res = await fetch(`${API_BASE}/tags`, { headers: getAuthHeaders() });
            const data = await res.json();
            setAllTags(Array.isArray(data) ? data : []);
        } catch { setAllTags([]); }
    };

    // ── Task CRUD ────────────────────────────────────────────────────────────
    const toggleTaskStatus = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'uncompleted' : 'completed';
        await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ status: newStatus }) });
        await fetchTasks();
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE', headers: getAuthHeaders() });
        await fetchTasks();
        setSwipeStates(prev => { const u = { ...prev }; delete u[taskId]; return u; });
    };

    const saveTask = async () => {
        try {
            setLoading(true);
            const method = editingTask ? 'PUT' : 'POST';
            const url = editingTask ? `${API_BASE}/tasks/${editingTask.id}` : `${API_BASE}/tasks`;
            const { attachments, newAttachments, removedAttachmentIds, ...payload } = formData;
            const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(`Save failed: ${res.status}`);
            const data = await res.json().catch(() => ({}));
            const taskId = editingTask ? editingTask.id : data.id;
            if (taskId) {
                for (const { file, name } of (newAttachments || [])) {
                    const fd = new FormData();
                    fd.append('file', file, name || file.name || `image-${Date.now()}.png`);
                    await fetch(`${API_BASE}/tasks/${taskId}/attachments`, { method: 'POST', headers: getAuthHeaders(false), body: fd });
                }
                for (const attId of (removedAttachmentIds || [])) {
                    await fetch(`${API_BASE}/tasks/${taskId}/attachments/${attId}`, { method: 'DELETE', headers: getAuthHeaders() });
                }
            }
            await fetchTasks();
            storage.remove(STORAGE_KEYS.MOBILE_TASK_DRAFT);
            setShowTaskModal(false);
            setEditingTask(null);
        } catch (err) {
            console.error('Failed to save task:', err);
            alert('Failed to save task. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkTaskSubmit = async (bulkText, bulkCategory, bulkClient, parsedTitles) => {
        if (!parsedTitles.length) return;
        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().slice(0, 5);
        const toCreate = parsedTitles.map(title => ({
            title, description: '', categories: bulkCategory.length > 0 ? bulkCategory : [],
            client: bulkClient || '', task_date: today, task_time: time,
            duration: '', status: 'uncompleted', tags: [], notes: ''
        }));
        try {
            setLoading(true);
            await Promise.all(toCreate.map(t => fetch(`${API_BASE}/tasks`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(t) })));
            await fetchTasks();
            await fetchClients();
            return true;
        } catch (err) {
            console.error('Failed to create bulk tasks:', err);
            alert('Failed to create bulk tasks. See console for details.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const shareTask = async (taskId, email) => {
        if (!email.trim()) { alert('Please enter an email address'); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email address'); return false; }
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/tasks/${taskId}/share`, {
                method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ email: email.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to share task');
            alert(`Task shared successfully with ${email}!`);
            return true;
        } catch (err) { alert(err.message); return false; }
        finally { setLoading(false); }
    };

    // ── Form helpers ─────────────────────────────────────────────────────────
    const openCreateModal = () => {
        setEditingTask(null);
        const draft = storage.get(STORAGE_KEYS.MOBILE_TASK_DRAFT);
        if (draft && typeof draft === 'object') {
            setFormData({ ...defaultFormData(), ...draft, newAttachments: [], removedAttachmentIds: draft.removedAttachmentIds || [] });
        } else {
            setFormData(defaultFormData());
        }
        setTagInput('');
        setShowTaskModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title || '', description: task.description || '',
            categories: task.categories || [], client: task.client || '',
            task_date: task.task_date || new Date().toISOString().split('T')[0],
            task_time: task.task_time || '', duration: task.duration || '',
            status: task.status || 'uncompleted', tags: task.tags || [],
            notes: task.notes || '', shared: task.shared || false,
            attachments: task.attachments || [], newAttachments: [], removedAttachmentIds: []
        });
        setTagInput('');
        setShowTaskModal(true);
    };

    const duplicateTask = (task) => {
        setEditingTask(null);
        setFormData({
            ...defaultFormData(),
            title: task.title + ' (copy)', description: task.description || '',
            categories: task.categories || [], client: task.client || '',
            duration: task.duration || '', tags: task.tags || [],
            notes: task.notes || '', shared: task.shared || false
        });
        setTagInput('');
        setShowTaskModal(true);
    };

    const openShareModal = (task) => { setSharingTask(task); setShowShareModal(true); };
    const closeShareModal = () => { setShowShareModal(false); setSharingTask(null); };

    const hasUnsavedChanges = () => {
        const attChanged = (formData.newAttachments?.length > 0) || (formData.removedAttachmentIds?.length > 0);
        if (editingTask) {
            return formData.title !== editingTask.title ||
                formData.description !== (editingTask.description || '') ||
                JSON.stringify(formData.categories) !== JSON.stringify(editingTask.categories || []) ||
                formData.client !== (editingTask.client || '') ||
                formData.task_date !== editingTask.task_date ||
                formData.task_time !== (editingTask.task_time || '') ||
                formData.duration !== (editingTask.duration || '') ||
                formData.status !== editingTask.status ||
                JSON.stringify(formData.tags) !== JSON.stringify(editingTask.tags || []) ||
                formData.notes !== (editingTask.notes || '') ||
                formData.shared !== (editingTask.shared || false) || attChanged;
        }
        return !!(formData.title || formData.description || attChanged);
    };

    // ── Swipe handlers ───────────────────────────────────────────────────────
    const handleTouchStart = (e, taskId) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e, taskId) => {
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchCurrentX.current - touchStartX.current;
        if (diff < 0) setSwipeStates(prev => ({ ...prev, [taskId]: diff }));
    };
    const handleTouchEnd = (taskId) => {
        const diff = touchCurrentX.current - touchStartX.current;
        if (Math.abs(diff) > swipeThreshold) deleteTask(taskId);
        setSwipeStates(prev => ({ ...prev, [taskId]: 0 }));
    };

    const value = {
        // data
        tasks, categories, clients, allTags, loading,
        // auth
        authRole, authUser, onLogout, isAdmin, isSharedUser, isLimitedUser,
        // view
        appView, setAppView, filterMode, setFilterMode,
        showSidebar, setShowSidebar, showSearchDrawer, setShowSearchDrawer,
        // filters
        searchFilters, setSearchFilters, hasActiveFilters, clearFilters,
        // task form modal
        showTaskModal, setShowTaskModal, editingTask, setEditingTask,
        formData, setFormData, tagInput, setTagInput,
        // modals
        showBulkInput, setShowBulkInput,
        showShareModal, closeShareModal, sharingTask,
        // swipe
        swipeStates, handleTouchStart, handleTouchMove, handleTouchEnd,
        // actions
        fetchTasks, toggleTaskStatus, deleteTask, saveTask,
        handleBulkTaskSubmit, shareTask, openCreateModal, openEditModal,
        duplicateTask, openShareModal, hasUnsavedChanges
    };

    return <MobileTaskContext.Provider value={value}>{children}</MobileTaskContext.Provider>;
};

export default MobileTaskContext;
