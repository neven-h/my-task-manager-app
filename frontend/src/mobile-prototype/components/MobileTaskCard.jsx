import React from 'react';
import { CheckCircle, Circle, Edit2, Copy, Share2, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import useSwipeGesture from '../../ios/hooks/useSwipeGesture';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileTaskCard = ({ task }) => {
    const {
        toggleTaskStatus, openEditTaskForm, duplicateTask, openShareModal, deleteTask
    } = useTaskContext();

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 100,
        onSwipe: () => deleteTask(task.id)
    });

    const isCompleted = task.status === 'completed';

    return (
        <div
            className="task-card"
            style={{
                transform: `translateX(${swipeOffset}px)`,
                borderLeft: `8px solid ${isCompleted ? '#FFD500' : '#FF0000'}`
            }}
            onTouchStart={handlers.onTouchStart}
            onTouchMove={handlers.onTouchMove}
            onTouchEnd={handlers.onTouchEnd}
        >
            <div style={{ padding: '20px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <button
                        onClick={() => toggleTaskStatus(task.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {isCompleted
                            ? <CheckCircle size={32} color="#FFD500" fill="#FFD500" />
                            : <Circle size={32} color="#FF0000" strokeWidth={3} />}
                    </button>

                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            fontSize: '1.15rem', fontWeight: 800, margin: 0,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? '#666' : '#000', fontFamily: FONT_STACK
                        }}>
                            {task.title}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openEditTaskForm(task)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Edit task">
                            <Edit2 size={20} color="#0000FF" />
                        </button>
                        <button onClick={() => duplicateTask(task.id)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Duplicate task">
                            <Copy size={20} color="#FFD500" />
                        </button>
                        <button onClick={() => openShareModal(task)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} aria-label="Share task">
                            <Share2 size={20} color="#FF0000" />
                        </button>
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <p style={{ fontSize: '0.95rem', color: '#666', margin: '0 0 12px 44px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {task.description}
                    </p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginLeft: '44px', fontSize: '0.85rem', color: '#666' }}>
                    {task.task_date && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} />{new Date(task.task_date).toLocaleDateString('en-GB')}</span>}
                    {task.duration && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} />{task.duration}h</span>}
                    {task.client && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} />{task.client}</span>}
                </div>

                {/* Categories */}
                {task.categories && task.categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', marginLeft: '44px' }}>
                        {task.categories.map(cat => (
                            <span key={cat.id} style={{ border: '2px solid #000', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, background: cat.color || '#f0f0f0' }}>
                                {cat.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {swipeOffset < -20 && (
                <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', color: '#FF0000', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Trash2 size={24} />
                </div>
            )}
        </div>
    );
};

export default React.memo(MobileTaskCard);
