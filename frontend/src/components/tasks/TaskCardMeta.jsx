import React from 'react';

const labelStyle = {
    color: '#666', marginBottom: '4px', fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const TaskCardMeta = ({ task }) => (
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
                <div style={labelStyle}>Client</div>
                <div style={{ fontWeight: 700 }}>{task.client}</div>
            </div>
        )}
        <div>
            <div style={labelStyle}>Date</div>
            <div style={{ fontWeight: 700 }}>{new Date(task.task_date).toLocaleDateString()}</div>
        </div>
        {task.task_time && (
            <div>
                <div style={labelStyle}>Time</div>
                <div style={{ fontWeight: 700 }}>{task.task_time}</div>
            </div>
        )}
        {task.duration && (
            <div>
                <div style={labelStyle}>Duration</div>
                <div style={{ fontWeight: 700 }}>{task.duration}h</div>
            </div>
        )}
    </div>
);

export default TaskCardMeta;
