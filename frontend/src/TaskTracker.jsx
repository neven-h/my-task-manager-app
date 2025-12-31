import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Calendar, Clock, X, BarChart3,
  Check, Edit2, Trash2, Download, RefreshCw, AlertCircle, Tag, Save, DollarSign, Upload
} from 'lucide-react';
import BankTransactions from './BankTransactions';
import ClientsManagement from './ClientsManagement';

const API_BASE = 'http://localhost:5001/api';
const DRAFT_STORAGE_KEY = 'taskTracker_draft';
const BULK_DRAFT_STORAGE_KEY = 'taskTracker_bulkDraft';

const TaskTracker = () => {
  const [appView, setAppView] = useState('tasks'); // 'tasks', 'transactions', or 'clients'
  const [tasks, setTasks] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [view, setView] = useState('list');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkTasksText, setBulkTasksText] = useState('');
  const [taskViewMode, setTaskViewMode] = useState('all'); // 'all', 'completed', 'uncompleted'
  
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    client: '',
    dateStart: '',
    dateEnd: ''
  });
  
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
    notes: ''
  });

  const [tagInput, setTagInput] = useState('');
  const formChangeTimeoutRef = useRef(null);

  // Auto-save draft whenever form changes
  useEffect(() => {
    if (showForm && (formData.title || formData.description)) {
      if (formChangeTimeoutRef.current) {
        clearTimeout(formChangeTimeoutRef.current);
      }
      formChangeTimeoutRef.current = setTimeout(() => {
        saveDraft();
      }, 1000); // Auto-save after 1 second of no changes
    }
  }, [formData, showForm]);

  // Load data on mount
  useEffect(() => {
    fetchCategories();
    fetchClients();
    fetchTasks();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  // Auto-save bulk tasks draft
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

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`);
      const data = await response.json();
      setAllCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.client) params.append('client', filters.client);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateStart) params.append('date_start', filters.dateStart);
      if (filters.dateEnd) params.append('date_end', filters.dateEnd);
      
      const response = await fetch(`${API_BASE}/tasks?${params}`);
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const saveDraft = () => {
    if (!editingTask) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.categories.length === 0) {
      setError('Please select at least one category');
      return;
    }
    
    try {
      setLoading(true);
      const url = editingTask 
        ? `${API_BASE}/tasks/${editingTask.id}`
        : `${API_BASE}/tasks`;
      
      const method = editingTask ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to save task');
      
      await fetchTasks();
      await fetchStats();
      await fetchClients();
      
      clearDraft();
      resetForm();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      await fetchTasks();
      await fetchStats();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}/toggle-status`, {
        method: 'PATCH'
      });
      
      if (!response.ok) throw new Error('Failed to toggle status');
      
      await fetchTasks();
      await fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      categories: task.categories || [],
      client: task.client || '',
      task_date: task.task_date,
      task_time: task.task_time || '',
      duration: task.duration || '',
      status: task.status,
      tags: task.tags || [],
      notes: task.notes || ''
    });
    setShowForm(true);
  };

  const openNewTaskForm = () => {
    const draft = loadDraft();
    if (draft && (draft.title || draft.description)) {
      if (window.confirm('You have an unsaved draft. Would you like to continue from your draft?')) {
        setFormData(draft);
      } else {
        resetFormData();
      }
    } else {
      resetFormData();
    }
    setShowForm(true);
  };

  const resetFormData = () => {
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
      notes: ''
    });
    setTagInput('');
  };

  const resetForm = () => {
    resetFormData();
    setEditingTask(null);
    setShowForm(false);
    setShowExitConfirm(false);
  };

  const attemptCloseForm = () => {
    if (!editingTask && (formData.title || formData.description)) {
      setShowExitConfirm(true);
    } else {
      resetForm();
    }
  };

  const handleDiscardAndClose = () => {
    clearDraft();
    resetForm();
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tagToRemove)});
  };

  const toggleCategory = (categoryId) => {
    if (formData.categories.includes(categoryId)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter(c => c !== categoryId)
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, categoryId]
      });
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
      categories: formData.categories.length > 0 ? formData.categories : [],
      client: formData.client || '',
      task_date: formData.task_date,
      task_time: formData.task_time || '',
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        })
      );

      await Promise.all(promises);

      await fetchTasks();
      await fetchStats();
      await fetchClients();

      setBulkTasksText('');
      clearBulkDraft();
      setShowBulkInput(false);
      setError(null);
    } catch (err) {
      setError('Failed to create bulk tasks');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();

      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.client) params.append('client', filters.client);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateStart) params.append('date_start', filters.dateStart);
      if (filters.dateEnd) params.append('date_end', filters.dateEnd);

      const response = await fetch(`${API_BASE}/export/csv?${params}`);
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
  };

  const exportHoursReport = async () => {
    try {
      const params = new URLSearchParams();

      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.client) params.append('client', filters.client);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateStart) params.append('date_start', filters.dateStart);
      if (filters.dateEnd) params.append('date_end', filters.dateEnd);

      const response = await fetch(`${API_BASE}/export/hours-report?${params}`);
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
  };

  const importHoursReport = async (event) => {
    console.log('[IMPORT] importHoursReport called', event);
    const file = event.target.files[0];
    console.log('[IMPORT] Selected file:', file);
    if (!file) {
      console.log('[IMPORT] No file selected, returning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError(null);
      console.log('[IMPORT] Sending request to:', `${API_BASE}/import/hours-report`);

      const response = await fetch(`${API_BASE}/import/hours-report`, {
        method: 'POST',
        body: formData
      });

      console.log('[IMPORT] Response status:', response.status);
      const result = await response.json();
      console.log('[IMPORT] Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import hours report');
      }

      // Show success message with any errors
      if (result.errors && result.errors.length > 0) {
        setError(`Imported ${result.imported_count} tasks. Some rows had errors: ${result.errors.join(', ')}`);
      } else {
        alert(`Successfully imported ${result.imported_count} tasks!`);
        setError(null);
      }

      // Refresh data
      await fetchTasks();
      await fetchStats();
      await fetchClients();

      // Clear file input
      event.target.value = '';
    } catch (err) {
      console.error('[IMPORT] Error:', err);
      setError(err.message || 'Failed to import hours report');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (categoryId) => {
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.label : categoryId;
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': {bg: '#FFD500', border: '#000', color: '#000'},
      'uncompleted': {bg: '#FF0000', border: '#000', color: '#fff'}
    };
    return colors[status] || colors.uncompleted;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'completed': 'Completed',
      'uncompleted': 'Uncompleted'
    };
    return labels[status] || status;
  };

  // TaskCard component
  const TaskCard = ({ task, statusStyle }) => (
    <div
      className="task-card"
      style={{
        background: '#fff',
        padding: '28px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{task.title}</h3>
            <span className="status-badge" style={{
              background: statusStyle.bg,
              borderColor: statusStyle.border,
              color: statusStyle.color
            }}>
              {getStatusLabel(task.status)}
            </span>
          </div>
          {task.description && (
            <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
              {task.description}
            </p>
          )}
          {task.categories && task.categories.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {task.categories.map((catId, idx) => (
                <span key={idx} className="tag" style={{ background: '#e3f2fd', borderColor: '#1565c0', color: '#1565c0' }}>
                  {getCategoryLabel(catId)}
                </span>
              ))}
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {task.tags.map((tag, idx) => (
                <span key={idx} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginLeft: '24px' }}>
          <button
            onClick={() => toggleTaskStatus(task.id)}
            className="btn"
            style={{ padding: '10px', minWidth: 'auto' }}
            title="Toggle status"
          >
            <Check size={18} />
          </button>
          <button
            onClick={() => startEdit(task)}
            className="btn"
            style={{ padding: '10px', minWidth: 'auto' }}
            title="Edit"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="btn"
            style={{ padding: '10px', minWidth: 'auto' }}
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        padding: '20px',
        background: '#f8f8f8',
        border: '2px solid #000',
        fontSize: '0.9rem'
      }}>
        {task.client && (
          <div>
            <div style={{ color: '#666', marginBottom: '4px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client</div>
            <div style={{ fontWeight: 700 }}>{task.client}</div>
          </div>
        )}

        <div>
          <div style={{ color: '#666', marginBottom: '4px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
          <div style={{ fontWeight: 700 }}>
            {new Date(task.task_date).toLocaleDateString()}
          </div>
        </div>

        {task.task_time && (
          <div>
            <div style={{ color: '#666', marginBottom: '4px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</div>
            <div style={{ fontWeight: 700 }}>
              {task.task_time}
            </div>
          </div>
        )}

        {task.duration && (
          <div>
            <div style={{ color: '#666', marginBottom: '4px', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</div>
            <div style={{ fontWeight: 700 }}>{task.duration}h</div>
          </div>
        )}
      </div>

      {task.notes && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: '#FFD500',
          border: '2px solid #000',
          fontSize: '0.95rem',
          color: '#000'
        }}>
          <strong>Notes:</strong> {task.notes}
        </div>
      )}
    </div>
  );

  // If viewing transactions, show BankTransactions component
  if (appView === 'transactions') {
    return <BankTransactions onBackToTasks={() => setAppView('tasks')} />;
  }

  // If viewing clients, show ClientsManagement component
  if (appView === 'clients') {
    return <ClientsManagement onBackToTasks={() => setAppView('tasks')} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#000'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
        
        * { 
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        }
        
        .task-card {
          transition: all 0.2s ease;
          border: 3px solid #000;
        }
        
        .task-card:hover {
          box-shadow: 8px 8px 0px #000;
          transform: translate(-4px, -4px);
        }
        
        .btn {
          transition: all 0.15s ease;
          cursor: pointer;
          border: 3px solid #000;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.85rem;
          padding: 14px 28px;
          background: #fff;
          color: #000;
        }
        
        .btn:hover:not(:disabled) {
          box-shadow: 4px 4px 0px #000;
          transform: translate(-2px, -2px);
        }
        
        .btn:active {
          box-shadow: none;
          transform: translate(0, 0);
        }
        
        .btn:disabled { 
          opacity: 0.4; 
          cursor: not-allowed; 
        }
        
        .btn-red {
          background: #FF0000;
          color: #fff;
          border-color: #000;
        }
        
        .btn-yellow {
          background: #FFD500;
          color: #000;
          border-color: #000;
        }
        
        .btn-blue {
          background: #0000FF;
          color: #fff;
          border-color: #000;
        }

        .btn-green {
          background: #00AA00;
          color: #fff;
          border-color: #000;
        }

        .btn-white {
          background: #fff;
          color: #000;
          border-color: #000;
        }
        
        input, select, textarea {
          font-family: 'Inter', sans-serif;
          padding: 12px 16px;
          border: 3px solid #000;
          width: 100%;
          font-size: 0.95rem;
          background: #fff;
        }
        
        input:focus, select:focus, textarea:focus {
          outline: none;
          box-shadow: 4px 4px 0px #000;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }
        
        .modal-content {
          background: white;
          border: 4px solid #000;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border: 3px solid #000;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: #fff;
          color: #000;
          border: 2px solid #000;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .tag button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          color: #000;
        }

        .category-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border: 2px solid #000;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .category-pill:hover {
          box-shadow: 2px 2px 0px #000;
          transform: translate(-1px, -1px);
        }

        .category-pill.selected {
          background: #0000FF;
          color: #fff;
        }
        
        .color-bar {
          height: 12px;
          width: 100%;
          background: linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%);
        }
        
        .sidebar {
          border-right: 3px solid #000;
          background: #f8f8f8;
        }
      `}</style>

      {/* Color Bar */}
      <div className="color-bar"></div>

      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '4px solid #000',
        padding: '32px 48px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '3rem',
              fontWeight: 900,
              margin: '0 0 8px 0',
              letterSpacing: '-1px',
              textTransform: 'uppercase'
            }}>
              Task Tracker
            </h1>
            <p style={{
              fontSize: '1rem',
              margin: 0,
              fontWeight: 400,
              color: '#666'
            }}>
              Personal Assistant Management System
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-blue" onClick={() => setAppView('transactions')}>
              <DollarSign size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Bank Transactions
            </button>
            <button className="btn btn-green" onClick={() => setAppView('clients')}>
              <Tag size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Clients
            </button>
            <button className="btn btn-white" onClick={() => setShowBulkInput(true)} disabled={loading}>
              <Plus size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Bulk Add
            </button>
            <button className="btn btn-red" onClick={openNewTaskForm} disabled={loading}>
              <Plus size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              New Task
            </button>
            <button className="btn btn-yellow" onClick={() => setView(view === 'list' ? 'stats' : 'list')}>
              {view === 'list' ? (
                <><BarChart3 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Stats</>
              ) : (
                <>Tasks</>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: '#FF0000',
          color: '#fff',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '3px solid #000'
        }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 180px)' }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ width: '320px', padding: '32px 24px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '0.75rem', 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '16px'
            }}>
              Filters
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Search</label>
                <input
                  type="text"
                  placeholder="Keywords..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Status</label>
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                  <option value="all">All Status</option>
                  <option value="uncompleted">Uncompleted</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Category</label>
                <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
                  <option value="all">All Categories</option>
                  {allCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Client</label>
                <input
                  type="text"
                  placeholder="Client name..."
                  value={filters.client}
                  onChange={(e) => setFilters({...filters, client: e.target.value})}
                  list="clients-list"
                />
                <datalist id="clients-list">
                  {clients.map(client => (
                    <option key={client} value={client} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Date From</label>
                <input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Date To</label>
                <input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
                />
              </div>

              {(filters.search || filters.category !== 'all' || filters.status !== 'all' || 
                filters.client || filters.dateStart || filters.dateEnd) && (
                <button
                  className="btn btn-white"
                  onClick={() => setFilters({
                    search: '',
                    category: 'all',
                    status: 'all',
                    client: '',
                    dateStart: '',
                    dateEnd: ''
                  })}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <button className="btn btn-yellow" onClick={exportHoursReport} disabled={tasks.length === 0} style={{ width: '100%', marginBottom: '12px' }}>
              <Download size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Export Hours Report
            </button>
            <input
              type="file"
              id="import-hours-report"
              accept=".csv,.xlsx,.xls"
              onChange={importHoursReport}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-yellow"
              onClick={() => document.getElementById('import-hours-report').click()}
              disabled={loading}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <Upload size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Import Hours Report
            </button>
            <button className="btn btn-blue" onClick={exportToCSV} disabled={tasks.length === 0} style={{ width: '100%', marginBottom: '12px' }}>
              <Download size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Export CSV
            </button>
            <button className="btn btn-white" onClick={() => { fetchTasks(); fetchStats(); }} disabled={loading} style={{ width: '100%' }}>
              <RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, padding: '48px' }}>
          {view === 'list' ? (
            <>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <p style={{ color: '#666', fontSize: '1rem' }}>{tasks.length} tasks</p>

                {/* Task View Mode Toggle */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    className={`btn ${taskViewMode === 'all' ? 'btn-blue' : 'btn-white'}`}
                    onClick={() => setTaskViewMode('all')}
                  >
                    All Tasks
                  </button>
                  <button
                    className={`btn ${taskViewMode === 'completed' ? 'btn-yellow' : 'btn-white'}`}
                    onClick={() => setTaskViewMode('completed')}
                  >
                    Completed Only
                  </button>
                  <button
                    className={`btn ${taskViewMode === 'uncompleted' ? 'btn-red' : 'btn-white'}`}
                    onClick={() => setTaskViewMode('uncompleted')}
                  >
                    Uncompleted Only
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '64px', fontSize: '1.1rem', color: '#666' }}>
                  Loading...
                </div>
              ) : tasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '64px',
                  border: '3px solid #000',
                  background: '#f8f8f8'
                }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>No tasks found</p>
                  <p style={{ color: '#666' }}>Try adjusting your filters or add a new task</p>
                </div>
              ) : (
                <>
                  {/* Render tasks based on view mode */}
                  {taskViewMode === 'all' ? (
                    <>
                      {/* Uncompleted Tasks Section */}
                      {tasks.filter(t => t.status === 'uncompleted').length > 0 && (
                        <div style={{ marginBottom: '48px' }}>
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            marginBottom: '24px',
                            textTransform: 'uppercase',
                            color: '#FF0000',
                            borderBottom: '4px solid #FF0000',
                            paddingBottom: '12px'
                          }}>
                            Uncompleted Tasks ({tasks.filter(t => t.status === 'uncompleted').length})
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {tasks.filter(t => t.status === 'uncompleted').map(task => {
                              const statusStyle = getStatusColor(task.status);
                              return (
                                <TaskCard key={task.id} task={task} statusStyle={statusStyle} />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Completed Tasks Section */}
                      {tasks.filter(t => t.status === 'completed').length > 0 && (
                        <div>
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            marginBottom: '24px',
                            textTransform: 'uppercase',
                            color: '#FFD500',
                            borderBottom: '4px solid #FFD500',
                            paddingBottom: '12px'
                          }}>
                            Completed Tasks ({tasks.filter(t => t.status === 'completed').length})
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {tasks.filter(t => t.status === 'completed').map(task => {
                              const statusStyle = getStatusColor(task.status);
                              return (
                                <TaskCard key={task.id} task={task} statusStyle={statusStyle} />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {tasks.filter(t => taskViewMode === 'completed' ? t.status === 'completed' : t.status === 'uncompleted').map(task => {
                        const statusStyle = getStatusColor(task.status);
                        return (
                          <TaskCard key={task.id} task={task} statusStyle={statusStyle} />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* Stats View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Statistics</h2>
              
              {stats && (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px'
                  }}>
                    <div style={{ border: '3px solid #000', padding: '32px', background: '#fff' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 900 }}>{stats.overall.total_tasks}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Total Tasks</div>
                    </div>
                    
                    <div style={{ border: '3px solid #000', padding: '32px', background: '#FFD500' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 900 }}>{stats.overall.completed_tasks}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Completed</div>
                    </div>
                    
                    <div style={{ border: '3px solid #000', padding: '32px', background: '#FF0000', color: '#fff' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 900 }}>{stats.overall.uncompleted_tasks}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Uncompleted</div>
                    </div>
                    
                    <div style={{ border: '3px solid #000', padding: '32px', background: '#fff' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 900 }}>
                        {stats.overall.total_duration ? stats.overall.total_duration.toFixed(1) : '0'}h
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Total Hours</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && !showExitConfirm && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') attemptCloseForm();
        }}>
          <div className="modal-content">
            <div style={{
              padding: '32px',
              borderBottom: '3px solid #000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFD500'
            }}>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase' }}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={attemptCloseForm} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Title <span style={{ color: '#FF0000' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Task title..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Details..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Categories <span style={{ color: '#FF0000' }}>*</span> (Select one or more)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {allCategories.map(cat => (
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

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client</label>
                  <input
                    type="text"
                    placeholder="Client..."
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    list="clients-list-form"
                  />
                  <datalist id="clients-list-form">
                    {clients.map(client => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Date <span style={{ color: '#FF0000' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.task_date}
                      onChange={(e) => setFormData({...formData, task_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</label>
                    <input
                      type="time"
                      value={formData.task_time}
                      onChange={(e) => setFormData({...formData, task_time: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration (hours)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="1.5"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Status <span style={{ color: '#FF0000' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="uncompleted">Uncompleted</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="btn btn-white"
                      style={{ padding: '12px 20px' }}
                    >
                      Add
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {formData.tags.map((tag, idx) => (
                        <span key={idx} className="tag">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Additional context..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '32px',
                justifyContent: 'flex-end'
              }}>
                <button type="button" className="btn btn-white" onClick={attemptCloseForm} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-red" disabled={loading}>
                  <Save size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                  {loading ? 'Saving...' : (editingTask ? 'Update' : 'Save Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{
              padding: '32px',
              borderBottom: '3px solid #000',
              background: '#FF0000',
              color: '#fff'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Save Draft?</h2>
            </div>
            <div style={{ padding: '32px' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '24px', lineHeight: '1.6' }}>
                You have unsaved changes. Your work has been automatically saved as a draft. What would you like to do?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn btn-blue"
                  onClick={() => setShowExitConfirm(false)}
                  style={{ width: '100%' }}
                >
                  Continue Editing
                </button>
                <button
                  className="btn btn-yellow"
                  onClick={resetForm}
                  style={{ width: '100%' }}
                >
                  Close & Keep Draft
                </button>
                <button
                  className="btn btn-white"
                  onClick={handleDiscardAndClose}
                  style={{ width: '100%' }}
                >
                  Discard Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Task Input Modal */}
      {showBulkInput && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') setShowBulkInput(false);
        }}>
          <div className="modal-content">
            <div style={{
              padding: '32px',
              borderBottom: '3px solid #000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0000FF',
              color: '#fff'
            }}>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase' }}>
                Bulk Add Uncompleted Tasks
              </h2>
              <button onClick={() => setShowBulkInput(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <X size={28} />
              </button>
            </div>

            <div style={{ padding: '32px' }}>
              <p style={{ fontSize: '1rem', marginBottom: '16px', lineHeight: '1.6', color: '#666' }}>
                Paste or type each task on a new line. All tasks will be created as <strong>uncompleted</strong> with today's date.
                <br />
                <strong>Tip:</strong> Use numbered lists (e.g., "1. Task" or "1) Task") for multi-line task descriptions. Your draft is auto-saved.
              </p>

              {/* Category and Client Selection for Bulk Tasks */}
              <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f8f8', border: '2px solid #000' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Categories (optional - applies to all tasks)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {allCategories.map(cat => (
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

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Client (optional - applies to all tasks)
                  </label>
                  <input
                    type="text"
                    placeholder="Client name..."
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    list="clients-list-bulk"
                  />
                  <datalist id="clients-list-bulk">
                    {clients.map(client => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tasks
                </label>
                <textarea
                  rows={12}
                  placeholder="Simple tasks:&#10;Task 1&#10;Task 2&#10;&#10;Numbered tasks (multi-line):&#10;1. This is a long task&#10;that spans multiple lines&#10;2. Another task"
                  value={bulkTasksText}
                  onChange={(e) => setBulkTasksText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
                />
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                  {parseBulkTasks(bulkTasksText).length} task(s) to create
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-white"
                  onClick={() => {
                    setBulkTasksText('');
                    clearBulkDraft();
                    setShowBulkInput(false);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-red"
                  onClick={handleBulkTaskSubmit}
                  disabled={loading || !bulkTasksText.trim()}
                >
                  <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                  {loading ? 'Creating...' : 'Create All Tasks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTracker;
