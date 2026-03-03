import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const ClientTaskList = ({ clientName, tasks, colors }) => (
    <div style={{ border: `3px solid ${colors.border}`, background: colors.surface, padding: '2rem', boxShadow: '4px 4px 0px #000' }}>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem', textTransform: 'uppercase', color: colors.text, letterSpacing: '-0.5px' }}>
            Tasks for {clientName}
        </h3>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {tasks.map(task => (
                <div
                    key={task.id}
                    style={{
                        padding: '1.25rem',
                        marginBottom: '1rem',
                        border: `3px solid ${colors.border}`,
                        background: task.status === 'completed' ? '#f8f8f8' : colors.surface,
                        boxShadow: '4px 4px 0px #000',
                        borderLeft: task.status === 'completed' ? `4px solid ${colors.success}` : `4px solid ${colors.primary}`
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: colors.text }}>
                                {task.title}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: colors.muted, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span>{new Date(task.task_date).toLocaleDateString('en-GB')}</span>
                                {task.duration && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={14} /> {task.duration}h
                                    </span>
                                )}
                                {task.status === 'completed' && (
                                    <span style={{ color: colors.success, display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                        <CheckCircle size={14} /> Completed
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {task.description && (
                        <div style={{ fontSize: '0.9rem', color: colors.muted, marginTop: '0.5rem', lineHeight: '1.5' }}>
                            {task.description}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

export default ClientTaskList;
