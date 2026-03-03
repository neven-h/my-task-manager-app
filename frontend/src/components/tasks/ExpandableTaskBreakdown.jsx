import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Circle, CheckCircle } from 'lucide-react';

const ExpandableTaskBreakdown = ({
    tasks = [],
    activeCount,
    completedCount,
    totalCount,
    variant = 'desktop'
}) => {
    const [expandedActive, setExpandedActive] = useState(false);
    const [expandedCompleted, setExpandedCompleted] = useState(false);

    const activeTasks = tasks.filter(t => t.status !== 'done');
    const completedTasks = tasks.filter(t => t.status === 'done');

    const isMobile = variant === 'mobile';

    const containerStyle = isMobile
        ? { background: '#fff', border: '3px solid #000', padding: '20px' }
        : { border: '3px solid #000', padding: '32px', background: '#fff' };

    const headerStyle = {
        fontSize: '0.85rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: isMobile ? 'normal' : '1px',
        marginBottom: isMobile ? '16px' : '24px'
    };

    const rowButtonStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '8px 0',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    };

    const taskItemStyle = (isCompleted) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '10px 14px',
        background: isCompleted ? '#f0f9f0' : '#f8f8f8',
        borderRadius: '4px',
        fontSize: isMobile ? '0.9rem' : '0.95rem'
    });

    const taskListContainerStyle = {
        marginLeft: '26px',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '300px',
        overflowY: 'auto'
    };

    return (
        <div style={containerStyle}>
            <h3 style={headerStyle}>Task Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Active Tasks - Expandable */}
                <div>
                    <button
                        onClick={() => setExpandedActive(!expandedActive)}
                        style={rowButtonStyle}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {expandedActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            Active Tasks
                        </span>
                        <span style={{ fontWeight: 700 }}>{activeCount ?? activeTasks.length}</span>
                    </button>
                    {expandedActive && activeTasks.length > 0 && (
                        <div style={taskListContainerStyle}>
                            {activeTasks.map(task => (
                                <div key={task.id} style={taskItemStyle(false)}>
                                    <Circle size={16} color="#666" />
                                    <span style={{
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {task.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed - Expandable */}
                <div>
                    <button
                        onClick={() => setExpandedCompleted(!expandedCompleted)}
                        style={rowButtonStyle}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {expandedCompleted ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            Completed
                        </span>
                        <span style={{ fontWeight: 700 }}>{completedCount ?? completedTasks.length}</span>
                    </button>
                    {expandedCompleted && completedTasks.length > 0 && (
                        <div style={taskListContainerStyle}>
                            {completedTasks.map(task => (
                                <div key={task.id} style={taskItemStyle(true)}>
                                    <CheckCircle size={16} color="#22c55e" />
                                    <span style={{
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: '#666'
                                    }}>
                                        {task.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Total - Static */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span>Total</span>
                    <span style={{ fontWeight: 700 }}>{totalCount ?? tasks.length}</span>
                </div>
            </div>
        </div>
    );
};

export default ExpandableTaskBreakdown;
