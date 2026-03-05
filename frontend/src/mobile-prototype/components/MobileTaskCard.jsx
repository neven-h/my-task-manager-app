import React, { useState } from 'react';
import { CheckCircle, Circle, Edit2, MoreHorizontal, Copy, Share2, CalendarPlus, Trash2, Calendar, Clock, Users } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import useSwipeGesture from '../../ios/hooks/useSwipeGesture';
import { downloadICS } from '../../utils/generateICS';
import { FONT_STACK, IOS_BLEND } from '../theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileTaskCard = ({ task }) => {
    const {
        toggleTaskStatus, openEditTaskForm, duplicateTask, openShareModal, deleteTask, allCategories
    } = useTaskContext();

    const [isPressed, setIsPressed] = useState(false);
    const [showActions, setShowActions] = useState(false);

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
    const statusColor = isCompleted ? '#34C759' : '#FF3B30';

    const actionItem = (icon, label, onClick, color = '#000') => (
        <button
            onClick={() => { onClick(); setShowActions(false); }}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                fontSize: '1rem', fontWeight: 500, color, cursor: 'pointer',
                fontFamily: FONT_STACK
            }}
        >
            {icon}{label}
        </button>
    );

    return (
        <>
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
                    <div style={{ padding: '14px 12px' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <button
                                onClick={handleToggle}
                                aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                                style={{
                                    background: 'none', border: 'none', padding: 6, cursor: 'pointer',
                                    minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: -6, flexShrink: 0
                                }}
                            >
                                {isCompleted
                                    ? <CheckCircle size={26} color={statusColor} fill={statusColor} />
                                    : <Circle size={26} color={statusColor} strokeWidth={2.5} />}
                            </button>

                            <div style={{ flex: 1, minWidth: 0 }} onClick={() => openEditTaskForm(task)}>
                                <h3 style={{
                                    fontSize: '1rem', fontWeight: 600, margin: 0,
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    color: isCompleted ? '#999' : '#000',
                                    fontFamily: FONT_STACK, lineHeight: 1.35
                                }}>
                                    {task.title}
                                </h3>
                                {/* Inline meta for compact view */}
                                {(task.task_date || task.duration || task.client) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, fontSize: '0.78rem', color: '#888' }}>
                                        {task.task_date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} />{new Date(task.task_date).toLocaleDateString('en-GB')}</span>}
                                        {task.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} />{task.duration}h</span>}
                                        {task.client && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} />{task.client}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Two main actions: Edit + More */}
                            <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                                <button
                                    onClick={() => openEditTaskForm(task)}
                                    aria-label="Edit task"
                                    style={{
                                        background: 'none', border: 'none', padding: 10, cursor: 'pointer',
                                        minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Edit2 size={18} color="#007AFF" />
                                </button>
                                <button
                                    onClick={() => setShowActions(true)}
                                    aria-label="More actions"
                                    style={{
                                        background: 'none', border: 'none', padding: 10, cursor: 'pointer',
                                        minWidth: IOS_BLEND.minTapTarget, minHeight: IOS_BLEND.minTapTarget,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <MoreHorizontal size={18} color="#8E8E93" />
                                </button>
                            </div>
                        </div>

                        {/* Description (if present) */}
                        {task.description && (
                            <p style={{
                                fontSize: '0.88rem', color: '#666', margin: '8px 0 0 38px',
                                lineHeight: 1.45, whiteSpace: 'pre-wrap'
                            }}>
                                {task.description}
                            </p>
                        )}

                        {/* Categories */}
                        {task.categories && task.categories.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, marginLeft: 38 }}>
                                {task.categories.map(catId => {
                                    const cat = allCategories.find(c => c.id === catId);
                                    return (
                                        <span key={catId} style={{
                                            borderRadius: 100, padding: '2px 9px',
                                            fontSize: '0.7rem', fontWeight: 600,
                                            background: cat?.color || '#f0f0f0', color: '#000'
                                        }}>
                                            {cat?.label || catId}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions bottom sheet */}
            {showActions && (
                <>
                    <div
                        onClick={() => setShowActions(false)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(4px)', zIndex: 400
                        }}
                    />
                    <div style={{
                        position: 'fixed', left: 0, right: 0, bottom: 0,
                        background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 401,
                        paddingBottom: 'env(safe-area-inset-bottom)'
                    }}>
                        <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 2, margin: '10px auto 8px' }} />
                        <div style={{ padding: '0 0 12px' }}>
                            {actionItem(<Copy size={18} />, 'Duplicate', () => duplicateTask(task.id))}
                            {actionItem(<Share2 size={18} />, 'Share', () => openShareModal(task))}
                            {actionItem(<CalendarPlus size={18} />, 'Add to Calendar', () => downloadICS(task))}
                            {actionItem(<Trash2 size={18} />, 'Delete', () => deleteTask(task.id), '#FF3B30')}
                        </div>
                        <button
                            onClick={() => setShowActions(false)}
                            style={{
                                width: 'calc(100% - 32px)', margin: '0 16px 16px',
                                padding: '14px', background: '#f2f2f7', border: 'none',
                                borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                                cursor: 'pointer', fontFamily: FONT_STACK
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </>
    );
};

export default React.memo(MobileTaskCard);
