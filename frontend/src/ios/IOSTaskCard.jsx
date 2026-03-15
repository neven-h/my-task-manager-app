import React, { useCallback, useState } from 'react';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useSwipeGesture from './hooks/useSwipeGesture';
import { THEME, FONT_STACK } from './theme';
import IOSTaskCardMeta from './IOSTaskCardMeta';
import IOSTaskCardActions from './IOSTaskCardActions';

const IOSTaskCard = ({ task }) => {
    const { toggleTaskStatus, deleteTask, duplicateTask, openEditTaskForm, openShareModal } = useTaskContext();
    const isCompleted = task.status === 'completed';
    const [pressed, setPressed] = useState(false);

    const handleSwipe = useCallback(() => {
        if (window.confirm('Delete this task?')) deleteTask(task.id);
    }, [deleteTask, task.id]);

    const { swipeOffset, handlers } = useSwipeGesture({ threshold: 100, onSwipe: handleSwipe });
    const statusColor = isCompleted ? '#34C759' : THEME.accent;

    return (
        <div
            style={{ position: 'relative', transform: `translateX(${swipeOffset}px) scale(${pressed ? 0.98 : 1})`, transition: swipeOffset !== 0 ? 'none' : 'transform 180ms cubic-bezier(0.22,1,0.36,1)', marginBottom: '10px' }}
            onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)} onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
            {...handlers}
        >
            <div style={{ position: 'absolute', inset: 0, background: '#FF3B30', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 24, opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 80) : 0, transition: 'opacity 120ms' }}>
                <Trash2 size={22} color="#fff" />
            </div>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '14px 16px', fontFamily: FONT_STACK, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: '0 4px 4px 0', background: statusColor }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: 8 }}>
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); toggleTaskStatus(task.id); }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {isCompleted ? <CheckCircle size={26} color="#34C759" fill="#34C759" /> : <Circle size={26} color={THEME.accent} strokeWidth={2.5} />}
                    </button>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.4, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#8E8E93' : '#000', fontFamily: FONT_STACK }}>
                            {task.title}
                        </h3>
                    </div>
                    <IOSTaskCardActions task={task} openEditTaskForm={openEditTaskForm} duplicateTask={duplicateTask} openShareModal={openShareModal} />
                </div>
                {task.description && (
                    <p style={{ fontSize: '0.875rem', color: '#8E8E93', margin: '8px 0 0 46px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {task.description}
                    </p>
                )}
                <IOSTaskCardMeta task={task} />
            </div>
        </div>
    );
};

export default React.memo(IOSTaskCard);
