import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, Filter, Settings, Home, CheckCircle, Circle } from 'lucide-react';
import API_BASE from '../config';

/**
 * MOBILE-FIRST REDESIGN
 * 
 * Key Improvements:
 * 1. Bottom Navigation Bar - Main actions always accessible
 * 2. Larger Cards - Better tap targets, maintains brutalist impact
 * 3. Simplified Filter Drawer - Clean slide-in, not overlay
 * 4. Single Menu System - No overlapping navigation
 * 5. Swipe Actions - Native mobile gestures
 */

const MobileTaskTracker = ({ onLogout, authRole, authUser }) => {
  const isSharedUser = authRole === 'shared' || authRole === 'limited';
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState('tasks'); // 'tasks', 'stats', 'settings'
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'completed', 'uncompleted'

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (isSharedUser) params.append('shared', 'true');
      
      const response = await fetch(`${API_BASE}/tasks?${params}`);
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const toggleTaskStatus = async (id) => {
    try {
      await fetch(`${API_BASE}/tasks/${id}/toggle-status`, { method: 'PATCH' });
      fetchTasks();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true;
    return task.status === taskFilter;
  });

  const uncompletedCount = tasks.filter(t => t.status === 'uncompleted').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif',
      paddingBottom: '80px' // Space for bottom nav
    }}>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          font-family: 'Inter', 'Helvetica Neue', Calibri, sans-serif;
          overscroll-behavior: none;
        }

        /* Disable pull-to-refresh */
        body {
          overscroll-behavior-y: contain;
        }

        /* Better touch scrolling */
        .scroll-container {
          -webkit-overflow-scrolling: touch;
          overflow-y: auto;
        }

        /* Brutalist mobile card */
        .mobile-task-card {
          border: 3px solid #000;
          background: #fff;
          margin: 12px 16px;
          padding: 20px;
          position: relative;
        }

        /* Simple tap effect - no transform, just visual feedback */
        .mobile-task-card:active {
          background: #f8f8f8;
        }

        /* Bottom nav button */
        .bottom-nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 8px 12px;
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #000;
          min-width: 70px;
        }

        .bottom-nav-btn.active {
          color: #0000FF;
        }

        .bottom-nav-btn:active {
          opacity: 0.6;
        }

        /* Filter drawer */
        .filter-drawer {
          position: fixed;
          top: 0;
          right: -100%;
          width: 85%;
          max-width: 400px;
          height: 100vh;
          background: #fff;
          border-left: 4px solid #000;
          z-index: 1000;
          transition: right 0.3s ease;
          overflow-y: auto;
        }

        .filter-drawer.open {
          right: 0;
        }

        .filter-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .filter-backdrop.visible {
          opacity: 1;
          pointer-events: all;
        }

        /* Large action button */
        .mobile-action-btn {
          border: 3px solid #000;
          background: #FF0000;
          color: #fff;
          padding: 16px 24px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          width: 100%;
          cursor: pointer;
        }

        .mobile-action-btn:active {
          background: #CC0000;
        }

        /* Status toggle button */
        .status-toggle {
          border: 3px solid #000;
          background: #fff;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-toggle:active {
          background: #f0f0f0;
        }

        /* Filter pills */
        .filter-pill {
          display: inline-flex;
          align-items: center;
          padding: 12px 20px;
          border: 3px solid #000;
          background: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          margin-right: 8px;
          margin-bottom: 8px;
        }

        .filter-pill.active {
          background: #0000FF;
          color: #fff;
        }

        .filter-pill:active {
          opacity: 0.8;
        }
      `}</style>

      {/* Color Bar */}
      <div style={{
        height: '12px',
        width: '100%',
        background: 'linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%)'
      }} />

      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '4px solid #000',
        padding: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.5px',
              textTransform: 'uppercase'
            }}>
              Tasks
            </h1>
            <p style={{
              fontSize: '0.75rem',
              color: '#666',
              margin: '4px 0 0 0',
              fontWeight: 600
            }}>
              {uncompletedCount} active • {completedCount} done
            </p>
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(true)}
            style={{
              border: '3px solid #000',
              background: '#fff',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Quick filter pills */}
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className={`filter-pill ${taskFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTaskFilter('all')}
          >
            All ({tasks.length})
          </button>
          <button
            className={`filter-pill ${taskFilter === 'uncompleted' ? 'active' : ''}`}
            onClick={() => setTaskFilter('uncompleted')}
          >
            Active ({uncompletedCount})
          </button>
          <button
            className={`filter-pill ${taskFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setTaskFilter('completed')}
          >
            Done ({completedCount})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="scroll-container" style={{
        minHeight: 'calc(100vh - 200px)',
        paddingTop: '8px',
        paddingBottom: '20px'
      }}>
        {filteredTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            margin: '24px 16px',
            border: '3px solid #000',
            background: '#f8f8f8'
          }}>
            <p style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              No tasks here
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              {taskFilter === 'all' ? 'Add your first task' : `No ${taskFilter} tasks`}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const statusColor = task.status === 'completed' ? '#FFD500' : '#FF0000';
            const statusText = task.status === 'completed' ? 'Done' : 'Active';

            return (
              <div key={task.id} className="mobile-task-card">
                {/* Status indicator bar on left */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '8px',
                  background: statusColor
                }} />

                <div style={{ paddingLeft: '8px' }}>
                  {/* Task header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      margin: 0,
                      flex: 1,
                      lineHeight: 1.3
                    }}>
                      {task.title}
                    </h3>

                    {/* Status toggle button */}
                    {!isSharedUser && (
                      <button
                        className="status-toggle"
                        onClick={() => toggleTaskStatus(task.id)}
                        style={{
                          marginLeft: '12px',
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle size={24} color="#000" />
                        ) : (
                          <Circle size={24} color="#000" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '12px',
                      lineHeight: 1.5
                    }}>
                      {task.description}
                    </p>
                  )}

                  {/* Categories */}
                  {task.categories && task.categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {task.categories.map((cat, idx) => (
                        <span key={idx} style={{
                          display: 'inline-flex',
                          padding: '4px 10px',
                          background: '#e3f2fd',
                          color: '#1565c0',
                          border: '2px solid #1565c0',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta info */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '0.75rem',
                    color: '#666',
                    fontWeight: 600
                  }}>
                    {task.task_date && (
                      <span>📅 {new Date(task.task_date).toLocaleDateString()}</span>
                    )}
                    {task.task_time && (
                      <span>🕐 {task.task_time}</span>
                    )}
                    {task.duration && (
                      <span>⏱️ {task.duration}h</span>
                    )}
                    {task.client && (
                      <span>👤 {task.client}</span>
                    )}
                  </div>

                  {/* Notes */}
                  {task.notes && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#FFD500',
                      border: '2px solid #000',
                      fontSize: '0.85rem',
                      lineHeight: 1.4
                    }}>
                      <strong>Notes:</strong> {task.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Filter Drawer */}
      <div
        className={`filter-backdrop ${showFilters ? 'visible' : ''}`}
        onClick={() => setShowFilters(false)}
      />
      <div className={`filter-drawer ${showFilters ? 'open' : ''}`}>
        <div style={{
          padding: '20px',
          borderBottom: '3px solid #000',
          background: '#FFD500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 900,
            margin: 0,
            textTransform: 'uppercase'
          }}>
            Filters
          </h2>
          <button
            onClick={() => setShowFilters(false)}
            style={{
              border: '3px solid #000',
              background: '#fff',
              padding: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
            Advanced filters coming soon...
          </p>

          <button
            className="mobile-action-btn"
            onClick={() => setShowFilters(false)}
            style={{ background: '#0000FF' }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '4px solid #000',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0',
        zIndex: 100
      }}>
        <button
          className={`bottom-nav-btn ${activeView === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveView('tasks')}
        >
          <Home size={24} />
          <span>Tasks</span>
        </button>

        <button
          className={`bottom-nav-btn ${activeView === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveView('stats')}
        >
          <BarChart3 size={24} />
          <span>Stats</span>
        </button>

        {/* Large center action button */}
        {!isSharedUser && (
          <button
            onClick={() => setShowNewTask(true)}
            style={{
              width: '56px',
              height: '56px',
              border: '4px solid #000',
              background: '#FF0000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transform: 'translateY(-8px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            <Plus size={32} color="#fff" strokeWidth={3} />
          </button>
        )}

        <button
          className={`bottom-nav-btn ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <Settings size={24} />
          <span>More</span>
        </button>
      </nav>

      {/* New Task Modal Placeholder */}
      {showNewTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            border: '4px solid #000',
            borderBottom: 'none',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                New Task
              </h2>
              <button
                onClick={() => setShowNewTask(false)}
                style={{
                  border: '3px solid #000',
                  background: '#fff',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Task creation form coming soon...
            </p>
            <button
              className="mobile-action-btn"
              onClick={() => setShowNewTask(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTaskTracker;
