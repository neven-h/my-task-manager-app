import React from 'react';
import { Calendar, Clock, Users } from 'lucide-react';

const IOSTaskCardMeta = ({ task }) => (
    <>
        {(task.task_date || task.duration || task.client) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: 8, marginLeft: 46, fontSize: '0.8rem', color: '#8E8E93' }}>
                {task.task_date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {new Date(task.task_date).toLocaleDateString('en-GB')}
                    </span>
                )}
                {task.duration && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} />{task.duration}h
                    </span>
                )}
                {task.client && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={13} />{task.client}
                    </span>
                )}
            </div>
        )}
        {task.categories && task.categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 8, marginLeft: 46 }}>
                {task.categories.map(cat => (
                    <span key={cat.id} style={{ borderRadius: 100, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 500, background: cat.color || '#E5E5EA', color: '#fff' }}>
                        {cat.label}
                    </span>
                ))}
            </div>
        )}
    </>
);

export default IOSTaskCardMeta;
