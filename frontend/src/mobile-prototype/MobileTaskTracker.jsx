import React, {useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    CheckCircle,
    Circle,
    Edit2,
    Trash2,
    X,
    Calendar,
    Clock,
    Tag,
    DollarSign,
    Users,
    Menu,
    LogOut,
    Download,
    Upload,
    RefreshCw,
    Copy,
    AlertCircle,
    BarChart3,
    Settings,
    ArrowLeft,
    Share2,
    TrendingUp,
    TrendingDown,
    PieChart,
    Banknote,
    CreditCard,
    MoreVertical,
    Save,
    FileDown,
    Paperclip
} from 'lucide-react';
import CustomAutocomplete from '../components/CustomAutocomplete';
import API_BASE from '../config';
import { formatCurrency, formatCurrencyWithCode } from '../utils/formatCurrency';

// Import extracted view components
import MobileStatsView from './views/MobileStatsView';
import MobileBankTransactionsView from './views/MobileBankTransactionsView';
import MobileStockPortfolioView from './views/MobileStockPortfolioView';
import MobileClientsView from './views/MobileClientsView';

const DRAFT_STORAGE_KEY = 'taskTracker_mobile_draft';
const BULK_DRAFT_STORAGE_KEY = 'taskTracker_mobile_bulkDraft';

// Brutalist theme - EXACTLY matching desktop TaskTracker
const THEME = {
    bg: '#fff',
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    text: '#000',
    muted: '#666',
    success: '#00AA00',
    border: '#000'
};

// Font stack - EXACTLY matching desktop
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileTaskTracker = ({authRole, authUser, onLogout}) => {
    const navigate = useNavigate();
    const isSharedUser = authRole === 'shared';
    const isLimitedUser = authRole === 'limited';
    const isAdmin = authRole === 'admin';

    // State
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [appView, setAppView] = useState('tasks'); // 'tasks', 'transactions', 'stats', 'portfolio', 'clients'
    const [filterMode, setFilterMode] = useState('all'); // all, active, done
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharingTask, setSharingTask] = useState(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showBulkInput, setShowBulkInput] = useState(false);
    const [bulkTasksText, setBulkTasksText] = useState('');
    const [bulkCategory, setBulkCategory] = useState([]);
    const [bulkClient, setBulkClient] = useState('');
    const formChangeTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categories: [],
        client: '',
        task_date: new Date().toISOString().split('T')[0],
        task_time: new Date().toTimeString().slice(0, 5),
        duration: '',
        status: 'uncompleted',
        tags: [],
        notes: '',
        shared: false,
        attachments: [],
        newAttachments: [],
        removedAttachmentIds: []
    });

    // Swipe state
    const [swipeStates, setSwipeStates] = useState({}); // { taskId: offsetX }
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);
    const swipeThreshold = 100; // px to trigger delete

    // Auto-save draft
    useEffect(() => {
        if (showTaskModal && (formData.title || formData.description)) {
            if (formChangeTimeoutRef.current) {
                clearTimeout(formChangeTimeoutRef.current);
            }
            formChangeTimeoutRef.current = setTimeout(() => {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
            }, 1000);
        }
        // cleanup to avoid leaking timers
        return () => {
            if (formChangeTimeoutRef.current) {
                clearTimeout(formChangeTimeoutRef.current);
            }
        };
    }, [formData, showTaskModal]);

    // Auto-save bulk draft
    useEffect(() => {
        if (showBulkInput && bulkTasksText) {
            const timeoutId = setTimeout(() => {
                saveBulkDraft();
            }, 1000); // Auto-save after 1 second of no changes
            return () => clearTimeout(timeoutId);
        }
    }, [bulkTasksText, showBulkInput]);

    // Load bulk draft when modal opens
    useEffect(() => {
        if (showBulkInput && !bulkTasksText) {
            const draft = loadBulkDraft();
            if (draft) {
                setBulkTasksText(draft);
            }
        }
    }, [showBulkInput]);

    const saveDraft = () => {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    };

    const loadDraft = () => {
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
            return JSON.parse(draft);
        }
        return null;
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    };

    const saveBulkDraft = () => {
        if (bulkTasksText.trim()) {
            localStorage.setItem(BULK_DRAFT_STORAGE_KEY, bulkTasksText);
        }
    };

    const loadBulkDraft = () => {
        const draft = localStorage.getItem(BULK_DRAFT_STORAGE_KEY);
        return draft || '';
    };

    const clearBulkDraft = () => {
        localStorage.removeItem(BULK_DRAFT_STORAGE_KEY);
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            await Promise.all([
                fetchTasks(),
                fetchCategories(),
                fetchClients(),
                fetchTags()
            ]);
        };
        loadData();
    }, [authUser, authRole]); // reload when auth context changes

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks?username=${authUser}&role=${authRole}`);
            if (!response.ok) throw new Error(`Tasks fetch failed: ${response.status}`);
            const data = await response.json();
            const list = Array.isArray(data) ? data : [];
            const sorted = list.sort((a, b) => {
                if (a.status === 'uncompleted' && b.status === 'completed') return -1;
                if (a.status === 'completed' && b.status === 'uncompleted') return 1;
                return 0;
            });
            setTasks(sorted);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE}/categories`);
            if (!response.ok) throw new Error(`Categories fetch failed: ${response.status}`);
            const data = await response.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            setCategories([]);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE}/clients`);
            if (!response.ok) throw new Error(`Clients fetch failed: ${response.status}`);
            const data = await response.json();
            const list = Array.isArray(data) ? data : [];
            const clientNames = list.map(client =>
                typeof client === 'string' ? client : client.name || client.client || client
            );
            setClients(clientNames);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
            setClients([]);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch(`${API_BASE}/tags?username=${authUser}&role=${authRole}`);
            if (!response.ok) throw new Error(`Tags fetch failed: ${response.status}`);
            const data = await response.json();
            setAllTags(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
            setAllTags([]);
        }
    };

    // Task actions
    const toggleTaskStatus = async (taskId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'uncompleted' : 'completed';
            await fetch(`${API_BASE}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({status: newStatus})
            });
            await fetchTasks();
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;

        try {
            await fetch(`${API_BASE}/tasks/${taskId}`, {method: 'DELETE'});
            await fetchTasks();
            setSwipeStates(prev => {
                const updated = {...prev};
                delete updated[taskId];
                return updated;
            });
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    const saveTask = async () => {
        try {
            setLoading(true);
            const method = editingTask ? 'PUT' : 'POST';
            const url = editingTask
                ? `${API_BASE}/tasks/${editingTask.id}`
                : `${API_BASE}/tasks`;
            const { attachments, newAttachments, removedAttachmentIds, ...payload } = formData;
            const body = { ...payload, username: authUser, role: authRole };

            const response = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => null);
                throw new Error(`Save failed: ${response.status} ${errBody || ''}`);
            }

            const data = await response.json().catch(() => ({}));
            const taskId = editingTask ? editingTask.id : data.id;

            if (taskId) {
                for (const { file, name } of (newAttachments || [])) {
                    const fd = new FormData();
                    fd.append('file', file, name || file.name || `image-${Date.now()}.png`);
                    const upRes = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
                        method: 'POST',
                        body: fd
                    });
                    if (!upRes.ok) {
                        const upErr = await upRes.json().catch(() => ({}));
                        throw new Error(upErr.error || 'Failed to upload attachment');
                    }
                }
                for (const attId of (removedAttachmentIds || [])) {
                    await fetch(`${API_BASE}/tasks/${taskId}/attachments/${attId}`, {
                        method: 'DELETE'
                    });
                }
            }

            await fetchTasks();
            clearDraft();
            setShowTaskModal(false);
            setEditingTask(null);
        } catch (err) {
            console.error('Failed to save task:', err);
            alert('Failed to save task. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const parseBulkTasks = (text) => {
        const lines = text.split('\n');
        const tasksToCreate = [];
        let currentTask = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Check if line starts with a number followed by . or )
            const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);

            if (numberedMatch) {
                // This is a new numbered task
                if (currentTask) {
                    // Save previous task
                    tasksToCreate.push(currentTask.trim());
                }
                // Start new task
                currentTask = numberedMatch[2];
            } else {
                // This is either a continuation of current task or a new unnumbered task
                if (currentTask) {
                    // Append to current task (multi-line task)
                    currentTask += '\n' + line;
                } else {
                    // Unnumbered single-line task
                    tasksToCreate.push(line);
                }
            }
        }

        // Add the last numbered task if exists
        if (currentTask) {
            tasksToCreate.push(currentTask.trim());
        }

        return tasksToCreate;
    };

    const handleBulkTaskSubmit = async () => {
        if (!bulkTasksText.trim()) return;

        const taskTitles = parseBulkTasks(bulkTasksText);
        if (taskTitles.length === 0) return;

        const tasksToCreate = taskTitles.map(title => ({
            title,
            description: '',
            categories: bulkCategory.length > 0 ? bulkCategory : [],
            client: bulkClient || '',
            task_date: formData.task_date,
            task_time: formData.task_time || '',
            duration: '',
            status: 'uncompleted',
            tags: [],
            notes: '',
            username: authUser,
            role: authRole
        }));

        try {
            setLoading(true);
            const promises = tasksToCreate.map(task =>
                fetch(`${API_BASE}/tasks`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(task)
                })
            );

            await Promise.all(promises);

            await fetchTasks();
            await fetchClients();

            setBulkTasksText('');
            setBulkCategory([]);
            setBulkClient('');
            clearBulkDraft();
            setShowBulkInput(false);
        } catch (err) {
            console.error('Failed to create bulk tasks:', err);
            alert('Failed to create bulk tasks. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTask(null);
        const draft = loadDraft();
        if (draft) {
            setFormData({
                ...draft,
                attachments: draft.attachments || [],
                newAttachments: [],
                removedAttachmentIds: draft.removedAttachmentIds || []
            });
        } else {
            setFormData({
                title: '',
                description: '',
                categories: [],
                client: '',
                task_date: new Date().toISOString().split('T')[0],
                task_time: new Date().toTimeString().slice(0, 5),
                duration: '',
                status: 'uncompleted',
                tags: [],
                notes: '',
                shared: false,
                attachments: [],
                newAttachments: [],
                removedAttachmentIds: []
            });
        }
        setShowTaskModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            categories: task.categories || [],
            client: task.client || '',
            task_date: task.task_date || new Date().toISOString().split('T')[0],
            task_time: task.task_time || '',
            duration: task.duration || '',
            status: task.status || 'uncompleted',
            tags: task.tags || [],
            notes: task.notes || '',
            shared: task.shared || false,
            attachments: task.attachments || [],
            newAttachments: [],
            removedAttachmentIds: []
        });
        setShowTaskModal(true);
    };

    const hasUnsavedChanges = () => {
        const attachmentChanged =
            (formData.newAttachments && formData.newAttachments.length > 0) ||
            (formData.removedAttachmentIds && formData.removedAttachmentIds.length > 0);
        if (editingTask) {
            return (
                formData.title !== editingTask.title ||
                formData.description !== (editingTask.description || '') ||
                JSON.stringify(formData.categories) !== JSON.stringify(editingTask.categories || []) ||
                formData.client !== (editingTask.client || '') ||
                formData.task_date !== editingTask.task_date ||
                formData.task_time !== (editingTask.task_time || '') ||
                formData.duration !== (editingTask.duration || '') ||
                formData.status !== editingTask.status ||
                JSON.stringify(formData.tags) !== JSON.stringify(editingTask.tags || []) ||
                formData.notes !== (editingTask.notes || '') ||
                formData.shared !== (editingTask.shared || false) ||
                attachmentChanged
            );
        }
        return !!(formData.title || formData.description || attachmentChanged);
    };

    const addAttachment = (file) => {
        if (!file) return;
        const name = file.name || `image-${Date.now()}.png`;
        setFormData(prev => ({
            ...prev,
            newAttachments: [...(prev.newAttachments || []), { file, name }]
        }));
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) addAttachment(file);
        e.target.value = '';
    };

    const removeNewAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            newAttachments: (prev.newAttachments || []).filter((_, i) => i !== index)
        }));
    };

    const removeExistingAttachment = (att) => {
        setFormData(prev => ({
            ...prev,
            removedAttachmentIds: [...(prev.removedAttachmentIds || []), att.id]
        }));
    };

    const closeModal = () => {
        if (hasUnsavedChanges()) {
            setShowDiscardConfirm(true);
        } else {
            setShowTaskModal(false);
            setEditingTask(null);
        }
    };

    const confirmDiscardAndClose = () => {
        if (!editingTask) {
            clearDraft();
        }
        setShowDiscardConfirm(false);
        setShowTaskModal(false);
        setEditingTask(null);
    };

    const duplicateTask = (task) => {
        setEditingTask(null);
        setFormData({
            title: task.title + ' (copy)',
            description: task.description || '',
            categories: task.categories || [],
            client: task.client || '',
            task_date: new Date().toISOString().split('T')[0],
            task_time: new Date().toTimeString().slice(0, 5),
            duration: task.duration || '',
            status: 'uncompleted',
            tags: task.tags || [],
            notes: task.notes || '',
            shared: task.shared || false
        });
        setShowTaskModal(true);
    };

    const openShareModal = (task) => {
        setSharingTask(task);
        setShareEmail('');
        setShowShareModal(true);
    };

    const closeShareModal = () => {
        setShowShareModal(false);
        setSharingTask(null);
        setShareEmail('');
    };

    const shareTask = async () => {
        if (!shareEmail.trim()) {
            alert('Please enter an email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(shareEmail)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${sharingTask.id}/share`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: shareEmail.trim()})
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to share task');
            }

            alert(`Task shared successfully with ${shareEmail}!`);
            closeShareModal();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Swipe handlers
    const handleTouchStart = (e, taskId) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e, taskId) => {
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchCurrentX.current - touchStartX.current;

        // Only allow left swipe (negative diff)
        if (diff < 0) {
            setSwipeStates(prev => ({...prev, [taskId]: diff}));
        }
    };

    const handleTouchEnd = (taskId) => {
        const diff = touchCurrentX.current - touchStartX.current;

        if (Math.abs(diff) > swipeThreshold) {
            // Swiped far enough - show delete confirmation
            deleteTask(taskId);
        }

        // Reset swipe
        setSwipeStates(prev => ({...prev, [taskId]: 0}));
    };

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (filterMode === 'active') return task.status !== 'completed';
        if (filterMode === 'done') return task.status === 'completed';
        return true;
    });

    const counts = {
        all: tasks.length,
        active: tasks.filter(t => t.status !== 'completed').length,
        done: tasks.filter(t => t.status === 'completed').length
    };

    // Toggle category in form
    const toggleCategory = (catId) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(catId)
                ? prev.categories.filter(id => id !== catId)
                : [...prev.categories, catId]
        }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: THEME.bg,
            paddingBottom: '20px',
            fontFamily: FONT_STACK
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
        
        * {
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
        }
        
        body {
          font-family: ${FONT_STACK};
        }
        
        .mobile-btn {
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 10px;
          background: #fff;
          font-family: ${FONT_STACK};
          font-weight: 600;
          text-transform: none;
          font-size: 1rem;
          padding: 14px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-btn:active {
          opacity: 0.7;
        }

        .mobile-btn-primary {
          background: ${THEME.primary};
          color: #fff;
          border-color: ${THEME.primary};
        }

        .mobile-btn-accent {
          background: ${THEME.accent};
          color: #fff;
          border-color: ${THEME.accent};
        }
        
        .filter-pill {
          border: 3px solid #000;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.9rem;
          background: #fff;
          cursor: pointer;
          font-family: ${FONT_STACK};
          text-transform: none;
        }
        
        .filter-pill.active {
          background: ${THEME.primary};
          color: #fff;
        }
        
        .task-card {
          border: 3px solid #000;
          background: #fff;
          margin-bottom: 12px;
          position: relative;
          transition: transform 0.2s ease;
        }
        
        .category-pill {
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 16px;
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          background: #f5f5f5;
          font-family: ${FONT_STACK};
          transition: all 0.2s ease;
        }

        .category-pill.selected {
          background: ${THEME.primary};
          color: #fff;
          border-color: ${THEME.primary};
        }
        
        input, textarea, select {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 12px;
          font-size: 1rem;
          font-family: ${FONT_STACK};
          background: #fff;
        }

        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .color-bar {
          height: 12px;
          width: 100%;
          background: linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%);
        }
      `}</style>

            {/* Conditional View Rendering */}
            {appView === 'stats' && (
                <MobileStatsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'transactions' && (
                <MobileBankTransactionsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'portfolio' && (
                <MobileStockPortfolioView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'clients' && (
                <MobileClientsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'tasks' && (<>
                {/* Header with tri-color bar - aligned with desktop TaskTracker */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: '#fff',
                    borderBottom: '4px solid #000'
                }}>
                    {/* Tri-color bar - 12px like desktop */}
                    <div className="color-bar"/>

                    <div style={{
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h1 style={{
                                fontFamily: FONT_STACK,
                                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                                fontWeight: 900,
                                margin: '0 0 4px 0',
                                letterSpacing: '-1px',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap'
                            }}>
                                Task Tracker
                            </h1>

                            <p style={{
                                fontSize: '0.85rem',
                                color: THEME.muted,
                                margin: 0,
                                fontFamily: FONT_STACK
                            }}>
                                {counts.active} active • {counts.done} done
                            </p>
                        </div>

                        {/* Hamburger Menu Button */}
                        <button
                            onClick={() => setShowMobileSidebar(true)}
                            style={{
                                background: '#fff',
                                border: '3px solid #000',
                                padding: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Menu size={24} color={THEME.text}/>
                        </button>
                    </div>

                    {/* Quick filters - below header */}
                    <div style={{padding: '0 16px 16px 16px'}}>
                        <div style={{display: 'flex', gap: '8px', overflowX: 'auto'}}>
                            <div
                                className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterMode('all')}
                            >
                                All ({counts.all})
                            </div>
                            <div
                                className={`filter-pill ${filterMode === 'active' ? 'active' : ''}`}
                                onClick={() => setFilterMode('active')}
                            >
                                Active ({counts.active})
                            </div>
                            <div
                                className={`filter-pill ${filterMode === 'done' ? 'active' : ''}`}
                                onClick={() => setFilterMode('done')}
                            >
                                Done ({counts.done})
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task List */}
                <div style={{padding: '16px'}}>
                    {loading ? (
                        <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                            Loading...
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                            No tasks found
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const swipeOffset = swipeStates[task.id] || 0;
                            const isCompleted = task.status === 'completed';

                            return (
                                <div
                                    key={task.id}
                                    className="task-card"
                                    style={{
                                        transform: `translateX(${swipeOffset}px)`,
                                        borderLeft: `8px solid ${isCompleted ? THEME.secondary : THEME.accent}`
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, task.id)}
                                    onTouchMove={(e) => handleTouchMove(e, task.id)}
                                    onTouchEnd={() => handleTouchEnd(task.id)}
                                >
                                    <div style={{padding: '20px'}}>
                                        {/* Header row */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            marginBottom: '12px'
                                        }}>
                                            {/* Status toggle */}
                                            <button
                                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    minWidth: '32px',
                                                    minHeight: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle size={32} color={THEME.secondary}
                                                                 fill={THEME.secondary}/>
                                                ) : (
                                                    <Circle size={32} color={THEME.accent} strokeWidth={3}/>
                                                )}
                                            </button>

                                            {/* Title */}
                                            <div style={{flex: 1}}>
                                                <h3 style={{
                                                    fontSize: '1.15rem',
                                                    fontWeight: 800,
                                                    margin: 0,
                                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                                    color: isCompleted ? THEME.muted : THEME.text,
                                                    fontFamily: FONT_STACK
                                                }}>
                                                    {task.title}
                                                </h3>
                                            </div>

                                            {/* Action buttons - Edit first (primary), then Duplicate, then Share */}
                                            <div style={{display: 'flex', gap: '4px'}}>
                                                <button
                                                    onClick={() => openEditModal(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                    aria-label="Edit task"
                                                >
                                                    <Edit2 size={20} color={THEME.primary}/>
                                                </button>
                                                <button
                                                    onClick={() => duplicateTask(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                    aria-label="Duplicate task"
                                                >
                                                    <Copy size={20} color={THEME.secondary}/>
                                                </button>
                                                <button
                                                    onClick={() => openShareModal(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                    aria-label="Share task"
                                                >
                                                    <Share2 size={20} color={THEME.accent}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description with proper line breaks */}
                                        {task.description && (
                                            <p style={{
                                                fontSize: '0.95rem',
                                                color: THEME.muted,
                                                margin: '0 0 12px 44px',
                                                lineHeight: '1.5',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Meta info */}
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            marginLeft: '44px',
                                            fontSize: '0.85rem',
                                            color: THEME.muted
                                        }}>
                                            {task.task_date && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Calendar size={14}/>
                                                    {new Date(task.task_date).toLocaleDateString('en-GB')}
                      </span>
                                            )}
                                            {task.duration && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Clock size={14}/>
                                                    {task.duration}h
                      </span>
                                            )}
                                            {task.client && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Users size={14}/>
                                                    {task.client}
                      </span>
                                            )}
                                        </div>

                                        {/* Categories */}
                                        {task.categories && task.categories.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '6px',
                                                marginTop: '12px',
                                                marginLeft: '44px'
                                            }}>
                                                {task.categories.map(cat => (
                                                    <span
                                                        key={cat.id}
                                                        style={{
                                                            border: '2px solid #000',
                                                            padding: '4px 10px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            background: cat.color || '#f0f0f0'
                                                        }}
                                                    >
                          {cat.label}
                        </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Swipe indicator */}
                                    {swipeOffset < -20 && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '20px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: THEME.accent,
                                            fontWeight: 700,
                                            fontSize: '0.9rem'
                                        }}>
                                            <Trash2 size={24}/>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Floating Action Buttons */}
                {/* Bulk Add Button */}
                <button
                    onClick={() => setShowBulkInput(true)}
                    style={{
                        position: 'fixed',
                        bottom: '100px',
                        right: '20px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: THEME.accent,
                        border: '3px solid #000',
                        boxShadow: '4px 4px 0px #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 90,
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#000'
                    }}
                    title="Bulk Add Tasks"
                >
                    ≡
                </button>

                {/* Main Add Button */}
                <button
                    onClick={openCreateModal}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: THEME.primary,
                        border: '3px solid #000',
                        boxShadow: '4px 4px 0px #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 90
                    }}
                >
                    <Plus size={32} color="#fff" strokeWidth={3}/>
                </button>
            </>)/* End of tasks view */}

            {/* Mobile Sidebar Menu */}
            {showMobileSidebar && (
                <>
                    {/* Overlay */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 300
                        }}
                        onClick={() => setShowMobileSidebar(false)}
                    />

                    {/* Sidebar */}
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '85%',
                        maxWidth: '350px',
                        background: '#fff',
                        borderLeft: '3px solid #000',
                        zIndex: 301,
                        overflowY: 'auto',
                        padding: '24px',
                        fontFamily: FONT_STACK
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowMobileSidebar(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                padding: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} color={THEME.text}/>
                        </button>

                        {/* User info - only show for admin */}
                        {isAdmin && (
                            <div style={{marginBottom: '32px', paddingTop: '8px'}}>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    margin: '0 0 8px 0',
                                    textTransform: 'uppercase',
                                    fontFamily: FONT_STACK
                                }}>
                                    Menu
                                </h2>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: THEME.muted,
                                    margin: 0,
                                    fontFamily: FONT_STACK
                                }}>
                                    👤 {authUser} (admin)
                                </p>
                            </div>
                        )}

                        {!isAdmin && (
                            <div style={{marginBottom: '32px', paddingTop: '8px'}}>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    margin: 0,
                                    textTransform: 'uppercase',
                                    fontFamily: FONT_STACK
                                }}>
                                    Menu
                                </h2>
                            </div>
                        )}

                        {/* Menu sections */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                            {/* Quick Actions */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Quick Actions
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn mobile-btn-primary"
                                        onClick={() => {
                                            openCreateModal();
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <Plus size={16} style={{marginRight: '8px'}}/>
                                        New Task
                                    </button>
                                    <button
                                        className="mobile-btn"
                                        onClick={async () => {
                                            await fetchTasks();
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <RefreshCw size={16} style={{marginRight: '8px'}}/>
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Export / Import */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Export / Import
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn"
                                        onClick={() => {
                                            // Export CSV logic here
                                            setShowMobileSidebar(false);
                                        }}
                                        disabled={tasks.length === 0}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <Download size={16} style={{marginRight: '8px'}}/>
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Stats - for ALL users */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Analytics
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn"
                                        onClick={() => {
                                            setAppView('stats');
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <BarChart3 size={16} style={{marginRight: '8px'}}/>
                                        View Stats
                                    </button>
                                </div>
                            </div>

                            {/* Bank Transactions - for ALL users (admin, shared, limited) */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Bank Transactions
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('transactions');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <DollarSign size={16} style={{marginRight: '8px'}}/>
                                            View Transactions
                                        </button>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                document.getElementById('mobile-transaction-upload').click();
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <Upload size={16} style={{marginRight: '8px'}}/>
                                            Upload File
                                        </button>
                                        <input
                                            type="file"
                                            id="mobile-transaction-upload"
                                            accept=".csv,.xlsx,.xls"
                                            style={{display: 'none'}}
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const uploadFormData = new FormData();
                                                uploadFormData.append('file', file);
                                                uploadFormData.append('transaction_type', 'credit'); // default to credit
                                                uploadFormData.append('username', authUser); // tag with username

                                                try {
                                                    const response = await fetch(`${API_BASE}/transactions/upload`, {
                                                        method: 'POST',
                                                        body: uploadFormData
                                                    });

                                                    const data = await response.json().catch(() => null);

                                                    if (response.ok) {
                                                        alert(`Successfully uploaded ${data?.transaction_count || '0'} transactions!`);
                                                    } else {
                                                        alert(`Error: ${data?.error || 'Upload failed'}`);
                                                    }
                                                } catch (err) {
                                                    alert(`Error uploading file: ${err?.message || err}`);
                                                }

                                                setShowMobileSidebar(false);
                                                e.target.value = ''; // Reset input
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Stock Portfolio - for ALL users */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Stock Portfolio
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('portfolio');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <TrendingUp size={16} style={{marginRight: '8px'}}/>
                                            View Portfolio
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Clients Management - for ALL users */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Clients
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('clients');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <Users size={16} style={{marginRight: '8px'}}/>
                                            Manage Clients
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Account */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Account
                                </h3>
                                <button
                                    className="mobile-btn mobile-btn-accent"
                                    onClick={() => {
                                        navigate('/settings');
                                        setShowMobileSidebar(false);
                                    }}
                                    style={{width: '100%', justifyContent: 'flex-start', marginBottom: '12px'}}
                                >
                                    <Settings size={16} style={{marginRight: '8px'}}/>
                                    Settings
                                </button>
                                <button
                                    className="mobile-btn mobile-btn-accent"
                                    onClick={() => {
                                        setShowMobileSidebar(false);
                                        if (onLogout) onLogout();
                                    }}
                                    style={{width: '100%', justifyContent: 'flex-start'}}
                                >
                                    <LogOut size={16} style={{marginRight: '8px'}}/>
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Close button at bottom */}
                        <button
                            className="mobile-btn"
                            onClick={() => setShowMobileSidebar(false)}
                            style={{width: '100%', marginTop: '32px'}}
                        >
                            Close Menu
                        </button>
                    </div>
                </>
            )}

            {/* Task Modal */}
            {showTaskModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '94vh',
                        maxHeight: '94vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                        paddingBottom: 'env(safe-area-inset-bottom, 0)'
                    }}>
                        {/* Modal Header - fixed, no scroll */}
                        <div style={{
                            flexShrink: 0,
                            padding: '16px 20px',
                            paddingTop: 'max(16px, env(safe-area-inset-top, 0))',
                            borderBottom: '1px solid rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#fff',
                            zIndex: 1
                        }}>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 900,
                                margin: 0,
                                textTransform: 'uppercase',
                                fontFamily: FONT_STACK
                            }}>
                                {editingTask ? 'Edit Task' : 'New Task'}
                            </h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={28} color={THEME.text}/>
                            </button>
                        </div>

                        {/* Modal Body - only this area scrolls to avoid layout shift */}
                        <div
                            style={{
                                flex: '1 1 0',
                                minHeight: 0,
                                overflowY: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                padding: '16px',
                                paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
                                scrollPaddingBottom: '120px'
                            }}
                        >
                            {/* Title */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="Task title..."
                                />
                            </div>

                            {/* Description */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Description
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Task description..."
                                />
                            </div>

                            {/* Date & Time */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.task_date}
                                        onChange={(e) => setFormData({...formData, task_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.task_time}
                                        onChange={(e) => setFormData({...formData, task_time: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Duration & Client */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '100px 1fr',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Hours
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Client
                                    </label>
                                    <CustomAutocomplete
                                        value={formData.client}
                                        onChange={(value) => setFormData({...formData, client: value})}
                                        options={clients.map(c => typeof c === 'string' ? c : String(c))}
                                        placeholder="Client name..."
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Categories
                                </label>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`category-pill ${formData.categories.includes(cat.id) ? 'selected' : ''}`}
                                            onClick={() => toggleCategory(cat.id)}
                                        >
                                            {cat.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Tags
                                </label>
                                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Add tag..."
                                        list="tags-list"
                                        style={{flex: 1}}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="mobile-btn mobile-btn-primary"
                                        style={{padding: '14px 20px'}}
                                    >
                                        <Plus size={16}/>
                                    </button>
                                </div>
                                <datalist id="tags-list">
                                    {allTags.map(tag => {
                                        const name = typeof tag === 'object' ? tag.name : tag;
                                        const key = typeof tag === 'object' ? (tag.id ?? tag.name ?? name) : tag;
                                        return <option key={key} value={name}/>;
                                    })}
                                </datalist>
                                {formData.tags.length > 0 && (
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px'}}>
                                        {formData.tags.map(tag => (
                                            <div
                                                key={tag}
                                                style={{
                                                    border: '2px solid #000',
                                                    padding: '4px 10px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    background: THEME.primary,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {tag}
                                                <X
                                                    size={14}
                                                    onClick={() => removeTag(tag)}
                                                    style={{cursor: 'pointer'}}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="uncompleted">Uncompleted</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Additional notes..."
                                />
                            </div>

                            {/* Attachments */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Attachments
                                </label>
                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px'}}>
                                    <button
                                        type="button"
                                        className="mobile-btn"
                                        style={{padding: '10px 16px'}}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Paperclip size={16} style={{marginRight: '6px', verticalAlign: 'middle'}}/>
                                        Attach file
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                                        onChange={handleFileInputChange}
                                        style={{display: 'none'}}
                                    />
                                </div>
                                {(formData.attachments || []).filter(a => !(formData.removedAttachmentIds || []).includes(a.id)).length > 0 && (
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px'}}>
                                        {(formData.attachments || []).filter(a => !(formData.removedAttachmentIds || []).includes(a.id)).map(att => {
                                            const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
                                            const fullUrl = att.cloudinary_url || (att.url?.startsWith('http') ? att.url : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/tasks/attachments/${att.id}/file`));
                                            return (
                                                <div key={att.id} style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    border: '2px solid #000',
                                                    padding: '6px 10px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600
                                                }}>
                                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                                                    <button type="button" onClick={() => removeExistingAttachment(att)} style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer'}} aria-label="Remove">
                                                        <X size={14}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {(formData.newAttachments || []).length > 0 && (
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                        {(formData.newAttachments || []).map((na, idx) => (
                                            <div key={idx} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                border: '2px solid #000',
                                                padding: '6px 10px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                background: THEME.secondary
                                            }}>
                                                <span>{na.name}</span>
                                                <button type="button" onClick={() => removeNewAttachment(idx)} style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer'}} aria-label="Remove">
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Shared checkbox (only for admin) */}
                            {isAdmin && (
                                <div style={{marginBottom: '24px'}}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.shared}
                                            onChange={(e) => setFormData({...formData, shared: e.target.checked})}
                                            style={{width: 'auto', margin: 0}}
                                        />
                                        Share with other users
                                    </label>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button
                                    onClick={closeModal}
                                    className="mobile-btn"
                                    style={{flex: 1}}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveTask}
                                    className="mobile-btn mobile-btn-primary"
                                    style={{flex: 1}}
                                    disabled={loading || !formData.title.trim()}
                                >
                                    {loading ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                                </button>
                            </div>

                            {/* Delete button (only when editing) */}
                            {editingTask && (
                                <button
                                    onClick={() => {
                                        deleteTask(editingTask.id);
                                        closeModal();
                                    }}
                                    className="mobile-btn mobile-btn-accent"
                                    style={{width: '100%', marginTop: '12px'}}
                                    disabled={loading}
                                >
                                    <Trash2 size={16}
                                            style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                                    Delete Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* In-app discard confirmation (replaces browser confirm) */}
            {showDiscardConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 250,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowDiscardConfirm(false);
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            background: THEME.bg,
                            borderRadius: '16px 16px 0 0',
                            padding: '24px',
                            borderTop: `3px solid ${THEME.border}`,
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                            fontFamily: FONT_STACK
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{
                            fontSize: '1.2rem',
                            fontWeight: 900,
                            margin: '0 0 12px 0',
                            textTransform: 'uppercase',
                            fontFamily: FONT_STACK,
                            color: THEME.text
                        }}>
                            Unsaved changes
                        </h3>
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '1rem',
                            color: THEME.muted,
                            lineHeight: 1.5
                        }}>
                            {editingTask
                                ? 'You have unsaved changes. Are you sure you want to close without saving?'
                                : 'You have unsaved changes. Are you sure you want to discard this draft?'}
                        </p>
                        <div style={{display: 'flex', gap: '12px'}}>
                            <button
                                type="button"
                                onClick={() => setShowDiscardConfirm(false)}
                                className="mobile-btn"
                                style={{flex: 1}}
                            >
                                Keep editing
                            </button>
                            <button
                                type="button"
                                onClick={confirmDiscardAndClose}
                                className="mobile-btn mobile-btn-accent"
                                style={{flex: 1}}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Tasks Modal */}
            {showBulkInput && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowBulkInput(false);
                        }
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '94vh',
                        height: '94vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                        paddingBottom: 'env(safe-area-inset-bottom, 0)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            paddingTop: 'max(16px, env(safe-area-inset-top, 0))',
                            borderBottom: '1px solid rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            background: THEME.accent,
                            zIndex: 1
                        }}>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 900,
                                margin: 0,
                                textTransform: 'uppercase',
                                fontFamily: FONT_STACK,
                                color: '#000'
                            }}>
                                Bulk Add Tasks
                            </h2>
                            <button
                                onClick={() => setShowBulkInput(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={28} color="#000"/>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{
                            padding: '16px',
                            paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))'
                        }}>
                            <p style={{
                                marginBottom: '16px',
                                fontSize: '0.9rem',
                                color: '#666',
                                lineHeight: '1.5'
                            }}>
                                Enter each task on a new line. You can use numbered lists (1., 2.) or just plain text.
                            </p>

                            {/* Task List Textarea */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Tasks ({parseBulkTasks(bulkTasksText).length})
                                </label>
                                <textarea
                                    rows={10}
                                    value={bulkTasksText}
                                    onChange={(e) => setBulkTasksText(e.target.value)}
                                    placeholder={"1. First task\n2. Second task\n3. Third task"}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        border: '3px solid #000',
                                        borderRadius: '0',
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        lineHeight: '1.6',
                                        boxSizing: 'border-box',
                                        resize: 'vertical',
                                        minHeight: '200px'
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* Categories */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Category (Optional)
                                </label>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`category-pill ${bulkCategory.includes(cat.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                if (bulkCategory.includes(cat.id)) {
                                                    setBulkCategory(bulkCategory.filter(c => c !== cat.id));
                                                } else {
                                                    setBulkCategory([...bulkCategory, cat.id]);
                                                }
                                            }}
                                        >
                                            {cat.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Client */}
                            <div style={{marginBottom: '24px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Client (Optional)
                                </label>
                                <CustomAutocomplete
                                    value={bulkClient}
                                    onChange={(value) => setBulkClient(value)}
                                    options={clients.map(c => typeof c === 'string' ? c : String(c))}
                                    placeholder="Client name..."
                                />
                            </div>

                            {/* Action buttons */}
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button
                                    onClick={() => {
                                        setBulkTasksText('');
                                        setBulkCategory([]);
                                        setBulkClient('');
                                        clearBulkDraft();
                                        setShowBulkInput(false);
                                    }}
                                    className="mobile-btn"
                                    style={{flex: 1}}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkTaskSubmit}
                                    className="mobile-btn mobile-btn-accent"
                                    style={{flex: 1}}
                                    disabled={loading || !bulkTasksText.trim()}
                                >
                                    {loading ? 'Creating...' : `Create ${parseBulkTasks(bulkTasksText).length} Tasks`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Task Modal */}
            {showShareModal && sharingTask && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                    onClick={closeShareModal}
                >
                    <div
                        style={{
                            width: '100%',
                            maxHeight: '65vh',
                            background: '#fff',
                            borderRadius: '16px 16px 0 0',
                            padding: '20px',
                            fontFamily: FONT_STACK,
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                Share Task
                            </h2>
                            <button onClick={closeShareModal} style={{background: 'none', border: 'none', padding: '8px'}}>
                                <X size={28} />
                            </button>
                        </div>

                        <p style={{color: THEME.muted, marginBottom: '24px', fontSize: '0.95rem'}}>
                            Share "{sharingTask.title}" via email
                        </p>

                        <div style={{marginBottom: '24px'}}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.85rem',
                                letterSpacing: '0.5px'
                            }}>
                                Email Address *
                            </label>
                            <input
                                type="email"
                                placeholder="recipient@example.com"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && shareEmail.trim()) {
                                        shareTask();
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #000',
                                    fontSize: '1rem',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '12px'}}>
                            <button
                                onClick={closeShareModal}
                                className="mobile-btn"
                                style={{flex: 1}}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={shareTask}
                                className="mobile-btn mobile-btn-primary"
                                style={{flex: 1}}
                                disabled={loading || !shareEmail.trim()}
                            >
                                <Share2 size={16} style={{marginRight: '8px'}}/>
                                {loading ? 'Sharing...' : 'Share'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileTaskTracker;