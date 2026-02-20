import React from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import TaskCard from './TaskCard';

const TaskList = () => {
    const {
        isAdmin, isLimitedUser, loading, tasks,
        taskViewMode, setTaskViewMode,
        completedTasks, uncompletedTasks,
        openNewTaskForm, setShowBulkInput,
        getStatusColor,
        rtlEnabled, setRtlEnabled,
    } = useTaskContext();

    return (
        <>
            {/* Primary Action - New Task is the core action */}
            {(isAdmin || isLimitedUser) && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        className="btn btn-red"
                        onClick={openNewTaskForm}
                        disabled={loading}
                        style={{
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            padding: '14px 32px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}
                    >
                        <Plus size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px' }} />
                        New Task
                    </button>
                    {isAdmin && (
                        <button
                            className="btn btn-yellow"
                            onClick={() => setShowBulkInput(true)}
                            disabled={loading}
                            style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                padding: '12px 24px'
                            }}
                        >
                            <Plus size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                            Bulk Add
                        </button>
                    )}
                </div>
            )}

            <div style={{marginBottom: '32px'}}>
                {/* Date row */}
                <div>
                    <h2 style={{fontSize: '2rem', fontWeight: 900, marginBottom: '8px'}}>
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </h2>
                    <p style={{color: '#666', fontSize: '1rem'}}>{tasks.length} tasks</p>
                </div>

                {/* Filter toggles row */}
                <div className="task-view-toggle" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '24px', flexWrap: 'wrap', rowGap: '8px'}}>
                    {/* Left group: status filters */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', rowGap: '8px'}}>
                        <button
                            className={`btn ${taskViewMode === 'all' ? 'btn-blue' : 'btn-white'}`}
                            onClick={() => setTaskViewMode('all')}
                        >
                            All Tasks
                        </button>
                        <button
                            className={`btn btn-narrow ${taskViewMode === 'completed' ? 'btn-yellow' : 'btn-white'}`}
                            onClick={() => setTaskViewMode('completed')}
                        >
                            Completed Only
                        </button>
                        <button
                            className={`btn btn-narrow ${taskViewMode === 'uncompleted' ? 'btn-red' : 'btn-white'}`}
                            onClick={() => setTaskViewMode('uncompleted')}
                        >
                            Uncompleted Only
                        </button>
                    </div>
                    {/* Right group: RTL toggle — always visible, never pushed off-screen */}
                    <button
                        className={`btn btn-narrow ${rtlEnabled ? 'btn-blue' : 'btn-white'}`}
                        onClick={() => setRtlEnabled(!rtlEnabled)}
                        title="Toggle right-to-left text direction (for Hebrew / Arabic)"
                    >
                        RTL
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{textAlign: 'center', padding: '64px', fontSize: '1.1rem', color: '#666'}}>
                    Loading...
                </div>
            ) : tasks.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '64px',
                    border: '3px solid #000',
                    background: '#f8f8f8'
                }}>
                    <p style={{fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#dc3545'}}>
                        {(isAdmin || isLimitedUser) ? '📋 Add Your First Task' : '📋 No Tasks Yet'}
                    </p>
                    <p style={{color: '#666', fontSize: '1rem'}}>
                        {(isAdmin || isLimitedUser) ? 'Click the "New Task" button above to get started' : 'Contact your administrator to add tasks'}
                    </p>
                </div>
            ) : (
                <>
                    {taskViewMode === 'all' ? (
                        <>
                            {/* Uncompleted Tasks Section */}
                            {uncompletedTasks.length > 0 && (
                                <div style={{marginBottom: '48px'}}>
                                    <h3 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 900,
                                        marginBottom: '24px',
                                        textTransform: 'uppercase',
                                        color: '#FF0000',
                                        borderBottom: '4px solid #FF0000',
                                        paddingBottom: '12px'
                                    }}>
                                        Uncompleted Tasks
                                        ({uncompletedTasks.length})
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                                        {uncompletedTasks.map(task => (
                                            <TaskCard key={task.id} task={task} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Completed Tasks Section */}
                            {completedTasks.length > 0 && (
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
                                        Completed Tasks
                                        ({completedTasks.length})
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                                        {completedTasks.map(task => (
                                            <TaskCard key={task.id} task={task} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                            {(taskViewMode === 'completed' ? completedTasks : uncompletedTasks).map(task => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default TaskList;
