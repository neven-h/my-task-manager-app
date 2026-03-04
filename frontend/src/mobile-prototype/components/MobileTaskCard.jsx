import React, { useState } from 'react';
import { CheckCircle, Circle, Edit2, Copy, Share2, CalendarPlus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import useSwipeGesture from '../../ios/hooks/useSwipeGesture';
import { downloadICS } from '../../utils/generateICS';
import { FONT_STACK, IOS_BLEND } from '../theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileTaskCard = ({ task }) => {
    const {
        toggleTaskStatus, openEditTaskForm, duplicateTask, openShareModal, deleteTask
    } = useTaskContext();

    const [isPressed, setIsPressed] = useState(false);

    const handleDelete = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        deleteTask(task.id);
    };

    const handleToggle = () => {
        if (navigator.vibrate) navigator.vibrate(8);
        toggleTaskStatus(task.id);
    };

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 100,
        onSwipe: handleDelete
    });

    const isCompleted = task.status === 'completed';
    const statusColor = isCompleted ? '#FFD500' : '#FF3B30';

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 4 }}>
            {/* Swipe-to-delete reveal */}
            <div style={{
                position: 'absolute', inset: 0,
                background: '#FF3B30',
                borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 20,
                opacity: swipeOffset < -10 ? 1 : 0,
                transition: `opacity 150ms ${SPRING}`
            }}>
                <Trash2 size={22} color="#fff" />
            </div>

            {/* Card */}
            <div
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    transform: `translateX(${swipeOffset}px) scale(${isPressed ? 0.98 : 1})`,
                    transition: swipeOffset === 0 ? `transform 180ms ${SPRING}` : 'none',
                    position: 'relative',
                    zIndex: 1
                }}
                onTouchStart={(e) => { setIsPressed(true); handlers.onTouchStart(e); }}
                onTouchMove={handlers.onTouchMove}
                onTouchEnd={(e) => { setIsPressed(false); handlers.onTouchEnd(e); }}
            >
                <div style={{ padding: '16px 14px 16px 12px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <button
                            onClick={handleToggle}
                            style={{
                                background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
                                minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '-6px',
                                flexShrink: 0
                            }}
                        >
                            {isCompleted
                                ? <CheckCircle size={28} color={statusColor} fill={statusColor} />
                                : <Circle size={28} color={statusColor} strokeWidth={2} />}
                        </button>

                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                fontSize: '1.05rem', fontWeight: 600, margin: 0,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isCompleted ? '#999' : '#000',
                                fontFamily: FONT_STACK, lineHeight: 1.4
                            }}>
                                {task.title}
                            </h3>
                        </div>

                        <div style={{ display: 'flex', gap: '0px', flexShrink: 0 }}>
                            <button onClick={() => openEditTaskForm(task)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer', minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Edit task">
                                <Edit2 size={17} color="#0000FF" />
                            </button>
                            <button onClick={() => duplicateTask(task.id)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer', minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Duplicate task">
                                <Copy size={17} color="#C7C7CC" />
                            </button>
                            <button onClick={() => openShareModal(task)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer', minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Share task">
                                <Share2 size={17} color="#C7C7CC" />
                            </button>
                            <button onClick={() => downloadICS(task)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer', minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Add to Calendar">
                                <CalendarPlus size={17} color="#C7C7CC" />
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    {task.description && (
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 10px 38px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {task.description}
                        </p>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginLeft: '38px', fontSize: '0.8rem', color: '#888' }}>
                        {task.task_date && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} />{new Date(task.task_date).toLocaleDateString('en-GB')}</span>}
                        {task.duration && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} />{task.duration}h</span>}
                        {task.client && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={13} />{task.client}</span>}
                    </div>

                    {/* Categories */}
                    {task.categories && task.categories.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', marginLeft: '38px' }}>
                            {task.categories.map(cat => (
                                <span key={cat.id} style={{
                                    borderRadius: 100, padding: '3px 10px',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    background: cat.color || '#f0f0f0',
                                    color: '#000'
                                }}>
                                    {cat.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MobileTaskCard);
