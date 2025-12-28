import React, {useEffect, useState} from 'react';
import {
    AlertCircle,
    BarChart3,
    Calendar,
    Check,
    Clock,
    Download,
    Edit2,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X
} from 'lucide-react';

const API_BASE = 'http://192.168.31.152:5001/api';

const TaskTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'stats'
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    client: '',
    dateStart: '',
    dateEnd: ''
  });
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'insurance',
    client: '',
    task_date: new Date().toISOString().split('T')[0],
    task_time: new Date().toTimeString().slice(0, 5),
    duration: '',
    status: 'completed',
    notes: ''
  });

  // Fetch data on mount
  useEffect(() => {
    fetchCategories();
    fetchClients();
    fetchTasks();
    fetchStats();
  }, []);

  // Refetch tasks when filters change
  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`);
      const data = await response.json();
      setCategories(data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
      await fetchClients(); // Refresh clients list
      
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
      category: task.category,
      client: task.client || '',
      task_date: task.task_date,
      task_time: task.task_time || '',
      duration: task.duration || '',
      status: task.status,
      notes: task.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'insurance',
      client: '',
      task_date: new Date().toISOString().split('T')[0],
      task_time: new Date().toTimeString().slice(0, 5),
      duration: '',
      status: 'completed',
      notes: ''
    });
    setEditingTask(null);
    setShowForm(false);
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

  const getCategoryLabel = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.label : categoryId;
  };

  const getCategoryColor = (categoryId) => {
    const colors = {
      'insurance': '#2D5A8C',
      'emails': '#8B4789',
      'customer-support': '#C65D3B',
      'banking': '#2C6B4F',
      'scheduling': '#A67C52',
      'documentation': '#5A7BA6',
      'phone-calls': '#9B6B4B',
      'research': '#6B5B8C',
      'other': '#5A5A5A'
    };
    return colors[categoryId] || colors.other;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f1e8 0%, #e8e3d6 100%)',
      fontFamily: '"Newsreader", Georgia, serif',
      color: '#2a2a2a'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        .task-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 4px solid;
        }
        
        .task-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .btn {
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.75rem;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
        }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .btn:active {
          transform: translateY(0);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background: #2D5A8C;
          color: white;
        }
        
        .btn-secondary {
          background: #6B5B8C;
          color: white;
        }
        
        .btn-danger {
          background: #C65D3B;
          color: white;
        }
        
        .btn-outline {
          background: transparent;
          border: 2px solid #2a2a2a;
          color: #2a2a2a;
        }
        
        input, select, textarea {
          font-family: 'Newsreader', Georgia, serif;
          transition: all 0.2s ease;
          padding: 0.75rem;
          border: 2px solid #d4d4d4;
          border-radius: 4px;
          width: 100%;
        }
        
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #2D5A8C;
          box-shadow: 0 0 0 3px rgba(45, 90, 140, 0.1);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }
        
        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .status-completed {
          background: #d4edda;
          color: #155724;
        }
        
        .status-uncompleted {
          background: #fff3cd;
          color: #856404;
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: '#2a2a2a',
        color: '#f5f1e8',
        padding: '2rem',
        borderBottom: '4px solid #d4a574',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '2.5rem',
            fontWeight: 700,
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em'
          }}>
            PA TASK TRACKER
          </h1>
          <p style={{
            fontSize: '1.1rem',
            margin: 0,
            opacity: 0.8,
            fontStyle: 'italic'
          }}>
            Document, search, and analyze your daily work
          </p>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Action Bar */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}Add Task
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setView(view === 'list' ? 'stats' : 'list')}
          >
            {view === 'list' ? (
              <><BarChart3 size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Stats</>
            ) : (
              <>List View</>
            )}
          </button>
          
          <button
            className="btn btn-outline"
            onClick={exportToCSV}
            disabled={tasks.length === 0}
          >
            <Download size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}Export CSV
          </button>
          
          <button
            className="btn btn-outline"
            onClick={() => {
              fetchTasks();
              fetchStats();
            }}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}Refresh
          </button>
        </div>

        {view === 'list' ? (
          <>
            {/* Filters */}
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {/* Search */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Search
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '0.75rem', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: '#888'
                      }} 
                    />
                    <input
                      type="text"
                      placeholder="Keywords in title, description..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="uncompleted">Uncompleted</option>
                  </select>
                </div>

                {/* Client */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Client
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by client..."
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

                {/* Date Start */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
                  />
                </div>

                {/* Date End */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(filters.search || filters.category !== 'all' || filters.status !== 'all' || 
                filters.client || filters.dateStart || filters.dateEnd) && (
                <button
                  className="btn btn-outline"
                  onClick={() => setFilters({
                    search: '',
                    category: 'all',
                    status: 'all',
                    client: '',
                    dateStart: '',
                    dateEnd: ''
                  })}
                  style={{ marginTop: '1rem' }}
                >
                  <X size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  {' '}Clear Filters
                </button>
              )}
            </div>

            {/* Task List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: '#888' }}>
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', color: '#888' }}>
                  No tasks found
                </p>
                <p style={{ margin: 0, color: '#aaa' }}>
                  Try adjusting your filters or add a new task
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="task-card"
                    style={{
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      borderLeftColor: getCategoryColor(task.category)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>
                            {task.title}
                          </h3>
                          <span
                            className={`status-badge status-${task.status}`}
                          >
                            {task.status === 'completed' ? (
                              <><Check size={12} /> Completed</>
                            ) : (
                              <>Uncompleted</>
                            )}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.95rem' }}>
                          {task.description}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          style={{
                            background: 'transparent',
                            border: '2px solid #2C6B4F',
                            color: '#2C6B4F',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Toggle completion status"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => startEdit(task)}
                          style={{
                            background: 'transparent',
                            border: '2px solid #2D5A8C',
                            color: '#2D5A8C',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Edit task"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          style={{
                            background: 'transparent',
                            border: '2px solid #C65D3B',
                            color: '#C65D3B',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#f8f8f8',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      <div>
                        <div style={{ color: '#888', marginBottom: '0.25rem', fontWeight: 600 }}>Category</div>
                        <div style={{ 
                          color: getCategoryColor(task.category),
                          fontWeight: 600
                        }}>
                          {getCategoryLabel(task.category)}
                        </div>
                      </div>
                      
                      {task.client && (
                        <div>
                          <div style={{ color: '#888', marginBottom: '0.25rem', fontWeight: 600 }}>Client</div>
                          <div>{task.client}</div>
                        </div>
                      )}
                      
                      <div>
                        <div style={{ color: '#888', marginBottom: '0.25rem', fontWeight: 600 }}>Date</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />
                          {new Date(task.task_date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {task.task_time && (
                        <div>
                          <div style={{ color: '#888', marginBottom: '0.25rem', fontWeight: 600 }}>Time</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} />
                            {task.task_time}
                          </div>
                        </div>
                      )}
                      
                      {task.duration && (
                        <div>
                          <div style={{ color: '#888', marginBottom: '0.25rem', fontWeight: 600 }}>Duration</div>
                          <div>{task.duration} hours</div>
                        </div>
                      )}
                    </div>

                    {task.notes && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#fffbf0',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        color: '#666'
                      }}>
                        <strong>Notes:</strong> {task.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Statistics View - continues in next message due to length */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {stats && (
              <>
                {/* Overall Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2D5A8C' }}>
                      {stats.overall.total_tasks}
                    </div>
                    <div style={{ color: '#888', marginTop: '0.5rem' }}>Total Tasks</div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2C6B4F' }}>
                      {stats.overall.completed_tasks}
                    </div>
                    <div style={{ color: '#888', marginTop: '0.5rem' }}>Completed</div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#C65D3B' }}>
                      {stats.overall.uncompleted_tasks}
                    </div>
                    <div style={{ color: '#888', marginTop: '0.5rem' }}>Uncompleted</div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B4789' }}>
                      {stats.overall.total_duration ? stats.overall.total_duration.toFixed(1) : '0'}h
                    </div>
                    <div style={{ color: '#888', marginTop: '0.5rem' }}>Total Hours</div>
                  </div>
                </div>

                {/* Category Stats */}
                <div style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                    Tasks by Category
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.by_category.map(cat => (
                      <div key={cat.category} style={{
                        padding: '1rem',
                        background: '#f8f8f8',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${getCategoryColor(cat.category)}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                              {getCategoryLabel(cat.category)}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>
                              {cat.count} tasks · {cat.completed} completed · {cat.total_duration ? cat.total_duration.toFixed(1) : '0'}h total
                            </div>
                          </div>
                          <div style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: getCategoryColor(cat.category)
                          }}>
                            {cat.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client Stats */}
                {stats.by_client.length > 0 && (
                  <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                      Top Clients
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {stats.by_client.map(client => (
                        <div key={client.client} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem',
                          background: '#f8f8f8',
                          borderRadius: '4px'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{client.client}</div>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>
                              {client.total_duration ? client.total_duration.toFixed(1) : '0'}h total
                            </div>
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2D5A8C' }}>
                            {client.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly Stats */}
                <div style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                    Monthly Activity
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.monthly.map(month => (
                      <div key={month.month} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: '#f8f8f8',
                        borderRadius: '4px'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#888' }}>
                            {month.total_duration ? month.total_duration.toFixed(1) : '0'}h total
                          </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2D5A8C' }}>
                          {month.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Task Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') {
            resetForm();
          }
        }}>
          <div className="modal-content">
            <div style={{
              padding: '2rem',
              borderBottom: '2px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Task Title <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Reviewed insurance claim #12345"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional details about the task..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Category <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Client */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Client
                    </label>
                    <input
                      type="text"
                      placeholder="Client name"
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Date */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Date <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.task_date}
                      onChange={(e) => setFormData({...formData, task_date: e.target.value})}
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Time (optional)
                    </label>
                    <input
                      type="time"
                      value={formData.task_time}
                      onChange={(e) => setFormData({...formData, task_time: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Duration */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="e.g., 1.5"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Status <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="completed">Completed</option>
                      <option value="uncompleted">Uncompleted</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any additional notes or context..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingTask ? 'Update Task' : 'Add Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTracker;
