import React, { useCallback } from 'react';
import { CheckCircle, Circle, Edit2, Copy, Share2, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useSwipeGesture from './hooks/useSwipeGesture';
import { THEME, FONT_STACK } from './theme';

const IOSTaskCard = ({ task }) => {
    const { toggleTaskStatus, deleteTask, duplicateTask, openEditTaskForm, openShareModal } = useTaskContext();
    const isCompleted = task.status === 'completed';

    const handleSwipe = useCallback(() => {
        if (window.confirm('Delete this task?')) {
            deleteTask(task.id);
        }
    }, [deleteTask, task.id]);

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 100,
        onSwipe: handleSwipe
    });

    return (
        <div
            className="task-card"
            style={{
                transform: `translateX(${swipeOffset}px)`,
                borderLeft: `8px solid ${isCompleted ? THEME.secondary : THEME.accent}`
            }}
            {...handlers}
        >
            <div style={{ padding: '20px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    {/* Status toggle */}
                    <button
                        onClick={() => toggleTaskStatus(task.id)}
                        style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            minWidth: '32px', minHeight: '32px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
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
                            fontSize: '1.15rem', fontWeight: 800, margin: 0,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? THEME.muted : THEME.text,
                            fontFamily: FONT_STACK
                        }}>
                            {task.title}
                        </h3>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openEditTaskForm(task)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Edit task">
                            <Edit2 size={20} color={THEME.primary} />
                        </button>
                        <button onClick={() => duplicateTask(task.id)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Duplicate task">
                            <Copy size={20} color={THEME.secondary} />
                        </button>
                        <button onClick={() => openShareModal(task)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Share task">
                            <Share2 size={20} color={THEME.accent} />
                        </button>
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <p style={{
                        fontSize: '0.95rem', color: THEME.muted, margin: '0 0 12px 44px',
                        lineHeight: '1.5', whiteSpace: 'pre-wrap'
                    }}>
                        {task.description}
                    </p>
                )}

                {/* Meta info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginLeft: '44px', fontSize: '0.85rem', color: THEME.muted }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', marginLeft: '44px' }}>
                        {task.categories.map(cat => (
                            <span
                                key={cat.id}
                                style={{
                                    border: '2px solid #000', padding: '4px 10px',
                                    fontSize: '0.75rem', fontWeight: 600,
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
                    position: 'absolute', right: '20px', top: '50%',
                    transform: 'translateY(-50%)', color: THEME.accent,
                    fontWeight: 700, fontSize: '0.9rem'
                }}>
                    <Trash2 size={24} />
                </div>
            )}
        </div>
    );
};

export default React.memo(IOSTaskCard);
