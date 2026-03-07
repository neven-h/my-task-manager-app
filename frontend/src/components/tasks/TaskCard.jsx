import React from 'react';
import { Check, Edit2, Trash2, Copy, Tag, Folder, Share2, CalendarPlus } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { openInCalendar } from '../../utils/generateICS';
import TaskCardMeta from './TaskCardMeta';
import TaskCardAttachments from './TaskCardAttachments';

const TaskCard = React.memo(({ task }) => {
    const {
        isSharedUser, rtlEnabled,
        filters, setFilters,
        getCategoryLabel, getStatusColor, getStatusLabel,
        toggleTaskStatus, openEditTaskForm, duplicateTask, deleteTask, openShareModal
    } = useTaskContext();

    const textDir = rtlEnabled ? 'rtl' : undefined;
    const statusStyle = getStatusColor(task.status);

    return (
        <div className="task-card" style={{ background: '#fff', padding: '28px' }}>
            <div style={{
                display: 'flex',
                flexDirection: rtlEnabled ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: 'flex', flexDirection: rtlEnabled ? 'row-reverse' : 'row',
                        alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }} dir={textDir}>{task.title}</h3>
                        <span className="status-badge" style={{ background: statusStyle.bg, borderColor: statusStyle.border, color: statusStyle.color }}>
                            {getStatusLabel(task.status)}
                        </span>
                    </div>
                    {task.description && (
                        <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dir={textDir}>
                            {task.description}
                        </p>
                    )}
                    {task.categories && task.categories.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center', justifyContent: rtlEnabled ? 'flex-end' : 'flex-start' }}>
                            <Folder size={13} style={{ color: '#1565c0', flexShrink: 0 }} />
                            {task.categories.map((catId, idx) => (
                                <span key={idx} className="tag" style={{ background: '#e3f2fd', borderColor: '#1565c0', color: '#1565c0' }}>
                                    {getCategoryLabel(catId)}
                                </span>
                            ))}
                        </div>
                    )}
                    {task.tags && task.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center', justifyContent: rtlEnabled ? 'flex-end' : 'flex-start' }}>
                            <Tag size={13} style={{ color: '#555', flexShrink: 0 }} />
                            {task.tags.map((tag, idx) => {
                                const isActive = filters.tags.includes(tag);
                                return (
                                    <button key={idx} type="button"
                                        onClick={() => setFilters(f => ({ ...f, tags: isActive ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))}
                                        className="tag"
                                        style={{ cursor: 'pointer', background: isActive ? '#FFD500' : '', fontWeight: isActive ? 700 : '', border: isActive ? '2px solid #000' : '' }}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!isSharedUser && (
                    <div style={{ display: 'flex', gap: '8px', ...(rtlEnabled ? { marginRight: '24px' } : { marginLeft: '24px' }) }}>
                        <button onClick={() => toggleTaskStatus(task.id)} className="btn" style={{ padding: '10px', minWidth: 'auto' }} title="Toggle status"><Check size={18} /></button>
                        <button onClick={() => openEditTaskForm(task)} className="btn" style={{ padding: '10px', minWidth: 'auto' }} title="Edit"><Edit2 size={18} /></button>
                        <button onClick={() => duplicateTask(task.id)} className="btn" style={{ padding: '10px', minWidth: 'auto' }} title="Duplicate"><Copy size={18} /></button>
                        <button onClick={() => openInCalendar(task)} className="btn" style={{ padding: '10px', minWidth: 'auto' }} title="Add to Google Calendar"><CalendarPlus size={18} /></button>
                        <button onClick={() => deleteTask(task.id)} className="btn" style={{ padding: '10px', minWidth: 'auto' }} title="Delete"><Trash2 size={18} /></button>
                    </div>
                )}
            </div>

            <TaskCardMeta task={task} />

            {task.notes && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#FFD500', border: '2px solid #000', fontSize: '0.95rem', color: '#000' }} dir={textDir}>
                    <strong>Notes:</strong> {task.notes}
                </div>
            )}

            <TaskCardAttachments attachments={task.attachments} />
        </div>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
