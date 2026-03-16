import React, { useCallback, useState } from 'react';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useSwipeGesture from './hooks/useSwipeGesture';
import { THEME, FONT_STACK } from './theme';
import IOSTaskCardMeta from './IOSTaskCardMeta';
import IOSTaskCardActions from './IOSTaskCardActions';

const SNAP_WIDTH = 88;

const DeleteConfirmModal = ({ onConfirm, onCancel }) => (
    <div
        onClick={onCancel}
        style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 32px',
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#2C2C2E', borderRadius: 14, padding: '20px 16px', width: '100%', maxWidth: 280 }}
        >
            <p style={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5, fontFamily: FONT_STACK }}>
                This task will be deleted. This action cannot be undone.
            </p>
            <button
                onClick={onConfirm}
                style={{ width: '100%', background: '#3A3A3C', border: 'none', borderRadius: 10, padding: '13px', color: '#FF3B30', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginBottom: 8, fontFamily: FONT_STACK }}
            >
                Delete
            </button>
            <button
                onClick={onCancel}
                style={{ width: '100%', background: '#3A3A3C', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontFamily: FONT_STACK }}
            >
                Cancel
            </button>
        </div>
    </div>
);

const IOSTaskCard = ({ task }) => {
    const { toggleTaskStatus, deleteTask, duplicateTask, openEditTaskForm, openShareModal } = useTaskContext();
    const isCompleted = task.status === 'completed';
    const [pressed, setPressed] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { swipeOffset, isOpen, isTracking, reset, handlers } = useSwipeGesture({ snapWidth: SNAP_WIDTH });
    const statusColor = isCompleted ? '#34C759' : THEME.accent;

    const handleDeletePress = useCallback(() => setShowConfirm(true), []);

    const handleConfirmDelete = useCallback(() => {
        setShowConfirm(false);
        reset();
        deleteTask(task.id);
    }, [deleteTask, task.id, reset]);

    const handleCancelDelete = useCallback(() => {
        setShowConfirm(false);
        reset();
    }, [reset]);

    return (
        <>
            {showConfirm && <DeleteConfirmModal onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
            <div style={{ position: 'relative', marginBottom: 10, overflow: 'hidden', borderRadius: 16 }}>
                {/* Delete button — always behind the card, revealed on swipe */}
                <div
                    onClick={handleDeletePress}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: SNAP_WIDTH, background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Trash2 size={22} color="#fff" />
                </div>

                {/* Sliding card */}
                <div
                    style={{
                        transform: `translateX(${swipeOffset}px) scale(${pressed ? 0.98 : 1})`,
                        transition: isTracking ? 'none' : 'transform 300ms cubic-bezier(0.22,1,0.36,1)',
                        position: 'relative',
                    }}
                    onMouseDown={() => setPressed(true)}
                    onMouseUp={() => setPressed(false)}
                    onMouseLeave={() => setPressed(false)}
                    onTouchStart={(e) => { setPressed(true); handlers.onTouchStart(e); }}
                    onTouchMove={handlers.onTouchMove}
                    onTouchEnd={(e) => { setPressed(false); handlers.onTouchEnd(e); }}
                >
                    {/* Invisible overlay: tapping the card while open closes it */}
                    {isOpen && (
                        <div onClick={reset} style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 16 }} />
                    )}

                    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '14px 16px', fontFamily: FONT_STACK, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: '0 4px 4px 0', background: statusColor }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: 8 }}>
                            <button
                                onClick={() => { if (navigator.vibrate) navigator.vibrate(10); toggleTaskStatus(task.id); }}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
                            >
                                {isCompleted
                                    ? <CheckCircle size={26} color="#34C759" fill="#34C759" />
                                    : <Circle size={26} color={THEME.accent} strokeWidth={2.5} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.4, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#8E8E93' : '#000', fontFamily: FONT_STACK, wordBreak: 'break-word' }}>
                                    {task.title}
                                </h3>
                            </div>
                            <IOSTaskCardActions task={task} openEditTaskForm={openEditTaskForm} duplicateTask={duplicateTask} openShareModal={openShareModal} />
                        </div>
                        {task.description && (
                            <p style={{ fontSize: '0.875rem', color: '#8E8E93', margin: '8px 0 0 46px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {task.description}
                            </p>
                        )}
                        <IOSTaskCardMeta task={task} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(IOSTaskCard);
