import React, { useState, useEffect, useRef } from 'react';
import { Plus, Filter, CheckCircle, Circle, Edit2, Trash2, X, Calendar, Clock, Tag, DollarSign, Users } from 'lucide-react';
import API_BASE from '../config';

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

const MobileTaskTracker = ({ authRole, authUser }) => {
  const isSharedUser = authRole === 'shared' || authRole === 'limited';
  
  // State
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [activeView, setActiveView] = useState('tasks');
  const [filterMode, setFilterMode] = useState('all'); // all, active, done
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
    shared: false
  });

  // Swipe state
  const [swipeStates, setSwipeStates] = useState({}); // { taskId: offsetX }
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const swipeThreshold = 100; // px to trigger delete

  // Load data
  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchClients();
    fetchTags();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tasks`);
      const data = await response.json();
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`);
      const data = await response.json();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`);
      const data = await response.json();
      setClients(data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_BASE}/tags`);
      const data = await response.json();
      setAllTags(data || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  // Task actions
  const toggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'uncompleted' : 'completed';
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchTasks();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
      await fetchTasks();
      setSwipeStates(prev => {
        const updated = { ...prev };
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

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      await fetchTasks();
      closeModal();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
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
      shared: false
    });
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
      shared: task.shared || false
    });
    setShowTaskModal(true);
  };

  const closeModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
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
      setSwipeStates(prev => ({ ...prev, [taskId]: diff }));
    }
  };

  const handleTouchEnd = (taskId) => {
    const diff = touchCurrentX.current - touchStartX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      // Swiped far enough - show delete confirmation
      deleteTask(taskId);
    }
    
    // Reset swipe
    setSwipeStates(prev => ({ ...prev, [taskId]: 0 }));
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: THEME.bg,
      paddingBottom: '80px',
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
          border: 3px solid #000;
          background: #fff;
          font-family: ${FONT_STACK};
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          padding: 14px 28px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .mobile-btn:active {
          box-shadow: none;
          transform: translate(0, 0);
        }
        
        .mobile-btn-primary {
          background: ${THEME.primary};
          color: #fff;
        }
        
        .mobile-btn-accent {
          background: ${THEME.accent};
          color: #fff;
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
          border: 2px solid #000;
          padding: 6px 14px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          background: #fff;
          font-family: ${FONT_STACK};
        }
        
        .category-pill.selected {
          background: ${THEME.primary};
          color: #fff;
        }
        
        input, textarea, select {
          width: 100%;
          border: 3px solid #000;
          padding: 14px;
          font-size: 1rem;
          font-family: ${FONT_STACK};
          background: #fff;
        }
        
        input:focus, textarea:focus, select:focus {
          outline: none;
          box-shadow: 4px 4px 0px #000;
        }
        
        .color-bar {
          height: 12px;
          width: 100%;
          background: linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%);
        }
      `}</style>

      {/* Header with tri-color bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '3px solid #000'
      }}>
        {/* Tri-color bar - 12px like desktop */}
        <div className="color-bar" />
        
        <div style={{ padding: '16px' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '-0.5px',
            fontFamily: FONT_STACK
          }}>
            TASKS
          </h1>
          
          <p style={{
            fontSize: '0.9rem',
            color: THEME.muted,
            margin: '0 0 16px 0',
            fontFamily: FONT_STACK
          }}>
            {counts.active} active • {counts.done} done
          </p>
          
          {/* Quick filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
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
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
            Loading...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
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
                <div style={{ padding: '20px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
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
                        <CheckCircle size={32} color={THEME.secondary} fill={THEME.secondary} />
                      ) : (
                        <Circle size={32} color={THEME.accent} strokeWidth={3} />
                      )}
                    </button>
                    
                    {/* Title */}
                    <div style={{ flex: 1 }}>
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
                    
                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(task)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={20} color={THEME.primary} />
                    </button>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p style={{
                      fontSize: '0.95rem',
                      color: THEME.muted,
                      margin: '0 0 12px 44px',
                      lineHeight: '1.5'
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(task.task_date).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    {task.duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {task.duration}h
                      </span>
                    )}
                    {task.client && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} />
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
                    <Trash2 size={24} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={openCreateModal}
        style={{
          position: 'fixed',
          bottom: '96px',
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
        <Plus size={32} color="#fff" strokeWidth={3} />
      </button>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '72px',
        background: '#fff',
        borderTop: '3px solid #000',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
        fontFamily: FONT_STACK
      }}>
        <button
          onClick={() => setActiveView('tasks')}
          style={{
            flex: 1,
            height: '100%',
            background: activeView === 'tasks' ? THEME.primary : 'transparent',
            color: activeView === 'tasks' ? '#fff' : THEME.text,
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            letterSpacing: '0.5px'
          }}
        >
          TASKS
        </button>
        <button
          onClick={() => setActiveView('stats')}
          style={{
            flex: 1,
            height: '100%',
            background: activeView === 'stats' ? THEME.primary : 'transparent',
            color: activeView === 'stats' ? '#fff' : THEME.text,
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            letterSpacing: '0.5px'
          }}
        >
          STATS
        </button>
        <button
          onClick={() => setActiveView('more')}
          style={{
            flex: 1,
            height: '100%',
            background: activeView === 'more' ? THEME.primary : 'transparent',
            color: activeView === 'more' ? '#fff' : THEME.text,
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            letterSpacing: '0.5px'
          }}
        >
          MORE
        </button>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxHeight: '90vh',
            background: '#fff',
            borderRadius: '16px 16px 0 0',
            border: '3px solid #000',
            borderBottom: 'none',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '3px solid #000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1
            }}>
              <h2 style={{
                fontSize: '1.5rem',
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
                <X size={28} color={THEME.text} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {/* Title */}
              <div style={{ marginBottom: '20px' }}>
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title..."
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                />
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
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
                    onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Duration & Client */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '20px' }}>
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
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Client name..."
                    list="clients-list"
                  />
                  <datalist id="clients-list">
                    {clients.map(client => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Categories */}
              <div style={{ marginBottom: '20px' }}>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

              {/* Status */}
              <div style={{ marginBottom: '20px' }}>
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
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="uncompleted">Uncompleted</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
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
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Shared checkbox (only for pitz user) */}
              {!isSharedUser && (
                <div style={{ marginBottom: '24px' }}>
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
                      onChange={(e) => setFormData({ ...formData, shared: e.target.checked })}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Share with Benny
                  </label>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={closeModal}
                  className="mobile-btn"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTask}
                  className="mobile-btn mobile-btn-primary"
                  style={{ flex: 1 }}
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
                  style={{ width: '100%', marginTop: '12px' }}
                  disabled={loading}
                >
                  <Trash2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                  Delete Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTaskTracker;
