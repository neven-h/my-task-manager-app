import React, { useCallback, useState } from 'react';
import { CheckCircle, Circle, Edit2, Copy, Share2, CalendarPlus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useSwipeGesture from './hooks/useSwipeGesture';
import { THEME, FONT_STACK } from './theme';
import { downloadICS } from '../utils/generateICS';

const IOSTaskCard = ({ task }) => {
    const { toggleTaskStatus, deleteTask, duplicateTask, openEditTaskForm, openShareModal } = useTaskContext();
    const isCompleted = task.status === 'completed';
    const [pressed, setPressed] = useState(false);

    const handleSwipe = useCallback(() => {
        if (window.confirm('Delete this task?')) {
            deleteTask(task.id);
        }
    }, [deleteTask, task.id]);

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 100,
        onSwipe: handleSwipe
    });

    const statusColor = isCompleted ? '#34C759' : THEME.accent;

    return (
        <div
            style={{
                position: 'relative',
                transform: `translateX(${swipeOffset}px) scale(${pressed ? 0.98 : 1})`,
                transition: swipeOffset !== 0 ? 'none' : 'transform 180ms cubic-bezier(0.22,1,0.36,1)',
                marginBottom: '10px',
            }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onTouchStart={() => setPressed(true)}
            onTouchEnd={() => setPressed(false)}
            {...handlers}
        >
            {/* Swipe-to-delete background */}
            <div style={{
                position: 'absolute', inset: 0,
                background: '#FF3B30',
                borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 24,
                opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 80) : 0,
                transition: 'opacity 120ms',
            }}>
                <Trash2 size={22} color="#fff" />
            </div>

            {/* Card */}
            <div style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                padding: '14px 16px',
                fontFamily: FONT_STACK,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Status stripe — thin left accent */}
                <div style={{
                    position: 'absolute',
                    left: 0, top: 12, bottom: 12,
                    width: 4,
                    borderRadius: '0 4px 4px 0',
                    background: statusColor,
                }} />

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: 8 }}>
                    {/* Status toggle */}
                    <button
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            toggleTaskStatus(task.id);
                        }}
                        style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            minWidth: '28px', minHeight: '28px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 2,
                        }}
                    >
                        {isCompleted ? (
                            <CheckCircle size={26} color="#34C759" fill="#34C759" />
                        ) : (
                            <Circle size={26} color={THEME.accent} strokeWidth={2.5} />
                        )}
                    </button>

                    {/* Title */}
                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            margin: 0,
                            lineHeight: 1.4,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? '#8E8E93' : '#000',
                            fontFamily: FONT_STACK,
                        }}>
                            {task.title}
                        </h3>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                        <button onClick={() => openEditTaskForm(task)}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}
                            aria-label="Edit task">
                            <Edit2 size={18} color="#8E8E93" />
                        </button>
                        <button onClick={() => duplicateTask(task.id)}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}
                            aria-label="Duplicate task">
                            <Copy size={18} color="#8E8E93" />
                        </button>
                        <button onClick={() => openShareModal(task)}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}
                            aria-label="Share task">
                            <Share2 size={18} color="#8E8E93" />
                        </button>
                        <button onClick={() => downloadICS(task)}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }}
                            aria-label="Add to Calendar">
                            <CalendarPlus size={18} color={THEME.accent} />
                        </button>
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#8E8E93',
                        margin: '8px 0 0 46px',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                    }}>
                        {task.description}
                    </p>
                )}

                {/* Meta info */}
                {(task.task_date || task.duration || task.client) && (
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '10px',
                        marginTop: 8, marginLeft: 46,
                        fontSize: '0.8rem', color: '#8E8E93',
                    }}>
                        {task.task_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={13} />
                                {new Date(task.task_date).toLocaleDateString('en-GB')}
                            </span>
                        )}
                        {task.duration && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                {task.duration}h
                            </span>
                        )}
                        {task.client && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={13} />
                                {task.client}
                            </span>
                        )}
                    </div>
                )}

                {/* Categories — pill badges */}
                {task.categories && task.categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 8, marginLeft: 46 }}>
                        {task.categories.map(cat => (
                            <span
                                key={cat.id}
                                style={{
                                    borderRadius: 100,
                                    padding: '3px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    background: cat.color || '#E5E5EA',
                                    color: '#fff',
                                }}
                            >
                                {cat.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(IOSTaskCard);
