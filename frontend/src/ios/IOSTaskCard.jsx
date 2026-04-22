import React, { useCallback, useState, useRef } from 'react';
import { CheckCircle, Circle, Trash2, Square, CheckSquare } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useSwipeGesture from './hooks/useSwipeGesture';
import { THEME, FONT_STACK } from './theme';
import IOSTaskCardMeta from './IOSTaskCardMeta';
import IOSTaskCardActions from './IOSTaskCardActions';
import IOSTaskCardAttachments from './IOSTaskCardAttachments';
import IOSTaskDetailModal from './IOSTaskDetailModal';
import renderDescription from '../utils/renderDescription';

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
            style={{ background: '#fff', borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0 #000', padding: '20px 16px', width: '100%', maxWidth: 280 }}
        >
            <p style={{ color: '#000', fontSize: '0.9rem', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5, fontFamily: FONT_STACK, fontWeight: 600 }}>
                This task will be deleted. This action cannot be undone.
            </p>
            <button
                onClick={onConfirm}
                style={{ width: '100%', background: '#FF0000', border: '2px solid #000', borderRadius: 0, padding: '13px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', cursor: 'pointer', marginBottom: 8, fontFamily: FONT_STACK }}
            >
                Delete
            </button>
            <button
                onClick={onCancel}
                style={{ width: '100%', background: '#fff', border: '2px solid #000', borderRadius: 0, padding: '13px', color: '#000', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', cursor: 'pointer', fontFamily: FONT_STACK }}
            >
                Cancel
            </button>
        </div>
    </div>
);

const LONG_PRESS_MS = 500;

const IOSTaskCard = ({ task }) => {
    const {
        toggleTaskStatus, deleteTask, duplicateTask, openEditTaskForm, openShareModal, getCategoryLabel,
        selectionMode, selectedIds, toggleSelect, enterSelectionWith,
    } = useTaskContext();
    const isCompleted = task.status === 'completed';
    const [pressed, setPressed] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const longPressTimer = useRef(null);
    const longPressFired = useRef(false);

    const { swipeOffset, isOpen, isTracking, reset, handlers } = useSwipeGesture({ snapWidth: SNAP_WIDTH });
    const statusColor = isCompleted ? '#34C759' : THEME.accent;
    const isSelected = selectionMode && selectedIds?.has(task.id);

    const startLongPress = useCallback(() => {
        longPressFired.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            if (navigator.vibrate) navigator.vibrate(30);
            enterSelectionWith(task.id);
        }, LONG_PRESS_MS);
    }, [enterSelectionWith, task.id]);

    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

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

    const handleCardTap = useCallback(() => {
        if (selectionMode) {
            toggleSelect(task.id);
            return;
        }
        if (!isOpen) setShowDetail(true);
    }, [isOpen, selectionMode, toggleSelect, task.id]);

    return (
        <>
            {showConfirm && <DeleteConfirmModal onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
            {showDetail && <IOSTaskDetailModal task={task} onClose={() => setShowDetail(false)} getCategoryLabel={getCategoryLabel} />}
            <div style={{ position: 'relative', marginBottom: 10, overflow: 'hidden', borderRadius: 0, opacity: task._saving ? 0.5 : 1, transition: 'opacity 200ms', pointerEvents: task._saving ? 'none' : undefined }}>
                {/* Delete button — revealed on swipe (disabled in selection mode) */}
                {!selectionMode && (
                    <div
                        onClick={handleDeletePress}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: SNAP_WIDTH, background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <Trash2 size={22} color="#fff" />
                    </div>
                )}

                {/* Sliding card */}
                <div
                    style={{
                        transform: `translateX(${swipeOffset}px) scale(${pressed ? 0.98 : 1})`,
                        transition: isTracking ? 'none' : 'transform 300ms cubic-bezier(0.22,1,0.36,1)',
                        position: 'relative',
                    }}
                    onMouseDown={() => { setPressed(true); if (!selectionMode) startLongPress(); }}
                    onMouseUp={() => { setPressed(false); cancelLongPress(); }}
                    onMouseLeave={() => { setPressed(false); cancelLongPress(); }}
                    onTouchStart={(e) => {
                        setPressed(true);
                        if (!selectionMode) startLongPress();
                        if (!selectionMode) handlers.onTouchStart(e);
                    }}
                    onTouchMove={(e) => {
                        cancelLongPress();
                        if (!selectionMode) handlers.onTouchMove(e);
                    }}
                    onTouchEnd={(e) => {
                        setPressed(false);
                        cancelLongPress();
                        if (!selectionMode) handlers.onTouchEnd(e);
                    }}
                >
                    {/* Invisible overlay: tapping the card while open closes it */}
                    {isOpen && (
                        <div onClick={reset} style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
                    )}

                    <div style={{
                        background: isSelected ? '#f0f4ff' : '#fff',
                        borderRadius: 0,
                        border: isSelected ? '3px solid #0000FF' : '3px solid #000',
                        boxShadow: '4px 4px 0 #000', padding: '14px 16px', fontFamily: FONT_STACK, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: '0 4px 4px 0', background: statusColor }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: 8 }}>
                            {selectionMode ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
                                >
                                    {isSelected
                                        ? <CheckSquare size={26} color="#0000FF" />
                                        : <Square size={26} color="#000" strokeWidth={2} />}
                                </button>
                            ) : (
                                <button
                                    onClick={() => { if (!task._saving) { if (navigator.vibrate) navigator.vibrate(10); toggleTaskStatus(task.id); } }}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
                                >
                                    {isCompleted
                                        ? <CheckCircle size={26} color="#34C759" fill="#34C759" />
                                        : <Circle size={26} color={THEME.accent} strokeWidth={2.5} />}
                                </button>
                            )}
                            <div onClick={handleCardTap} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                                <h3 dir="auto" style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.4, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#8E8E93' : '#000', fontFamily: FONT_STACK, wordBreak: 'break-word', unicodeBidi: 'plaintext' }}>
                                    {task.title}
                                </h3>
                            </div>
                            {!selectionMode && (
                                <IOSTaskCardActions task={task} openEditTaskForm={openEditTaskForm} duplicateTask={duplicateTask} openShareModal={openShareModal} />
                            )}
                        </div>
                        <div onClick={handleCardTap} style={{ cursor: 'pointer' }}>
                            {task.description && (
                                <p dir="auto" style={{ fontSize: '0.875rem', color: '#8E8E93', margin: '8px 0 0 46px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', unicodeBidi: 'plaintext' }}>
                                    {renderDescription(task.description)}
                                </p>
                            )}
                            <IOSTaskCardMeta task={task} />
                            <IOSTaskCardAttachments attachments={task.attachments} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(IOSTaskCard);
