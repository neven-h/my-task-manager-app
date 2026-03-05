import React from 'react';
import { THEME } from '../../theme';

const MobileClientTasksPanel = ({ selectedClient, clientTasks, onClose }) => {
    if (!selectedClient || clientTasks.length === 0) return null;
    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '50vh', background: '#fff', borderTop: '3px solid #000', padding: '16px', overflowY: 'auto', zIndex: 100 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '12px' }}>
                Tasks for {selectedClient}
            </div>
            {clientTasks.map(task => (
                <div
                    key={task.id}
                    style={{ border: '2px solid #000', padding: '12px', marginBottom: '8px', background: task.status === 'completed' ? '#f8f8f8' : '#fff' }}
                >
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ fontSize: '0.8rem', color: THEME.muted }}>
                        {new Date(task.task_date).toLocaleDateString('en-GB')}
                        {task.duration && ` • ${task.duration}h`}
                        {task.status === 'completed' && ' • ✓ Completed'}
                    </div>
                </div>
            ))}
            <button
                onClick={onClose}
                style={{ width: '100%', padding: '12px', border: '3px solid #000', background: THEME.primary, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: '12px' }}
            >
                Close
            </button>
        </div>
    );
};

export default MobileClientTasksPanel;
