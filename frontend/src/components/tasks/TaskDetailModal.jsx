import React from 'react';
import { X, Calendar, Clock, Users, Tag, Folder, FileText, Paperclip } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import TaskCardAttachments from './TaskCardAttachments';
import renderDescription from '../../utils/renderDescription';

const FONT_STACK = '"Inter", "Helvetica Neue", Calibri, sans-serif';

const Section = ({ icon: Icon, label, children }) => (
    <div style={{ marginBottom: 20 }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1px', color: '#666',
        }}>
            <Icon size={14} /> {label}
        </div>
        <div style={{ fontSize: '1rem', color: '#000', lineHeight: 1.6 }}>
            {children}
        </div>
    </div>
);

const TaskDetailModal = ({ task, onClose }) => {
    if (!task) return null;
    const { getCategoryLabel, getStatusColor, getStatusLabel } = useTaskContext();
    const statusStyle = getStatusColor(task.status);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, fontFamily: FONT_STACK,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', border: '4px solid #000',
                    maxWidth: 640, width: '100%', maxHeight: '85vh',
                    overflowY: 'auto', position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 28px 20px', borderBottom: '3px solid #000',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                                {task.title}
                            </h2>
                            <span style={{
                                padding: '4px 14px', fontSize: '0.78rem', fontWeight: 700,
                                textTransform: 'uppercase', border: '2px solid #000',
                                background: statusStyle.bg, color: statusStyle.color,
                            }}>
                                {getStatusLabel(task.status)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#000', color: '#fff', border: 'none',
                            width: 36, height: 36, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px 28px' }}>
                    {/* Description */}
                    {task.description && (
                        <Section icon={FileText} label="Description">
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {renderDescription(task.description)}
                            </p>
                        </Section>
                    )}

                    {/* Meta grid */}
                    {(task.task_date || task.task_time || task.duration || task.client) && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: 12, marginBottom: 20, padding: 16,
                            background: '#f8f8f8', border: '2px solid #000',
                        }}>
                            {task.task_date && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                                        <Calendar size={12} /> Date
                                    </div>
                                    <div style={{ fontWeight: 700 }}>
                                        {new Date(task.task_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            )}
                            {task.task_time && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                                        <Clock size={12} /> Time
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{task.task_time.slice(0, 5)}</div>
                                </div>
                            )}
                            {task.duration && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                                        <Clock size={12} /> Duration
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{task.duration}h</div>
                                </div>
                            )}
                            {task.client && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                                        <Users size={12} /> Client
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{task.client}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Categories */}
                    {task.categories && task.categories.length > 0 && (
                        <Section icon={Folder} label="Categories">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {task.categories.map((catId, idx) => (
                                    <span key={idx} style={{
                                        padding: '4px 14px', fontSize: '0.85rem', fontWeight: 600,
                                        background: '#e3f2fd', border: '2px solid #1565c0', color: '#1565c0',
                                    }}>
                                        {getCategoryLabel(catId)}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <Section icon={Tag} label="Tags">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {task.tags.map(tag => (
                                    <span key={tag} style={{
                                        padding: '4px 14px', fontSize: '0.85rem', fontWeight: 600,
                                        background: '#FFD500', border: '2px solid #000', color: '#000',
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Notes */}
                    {task.notes && (
                        <Section icon={FileText} label="Notes">
                            <div style={{
                                background: '#FFD500', border: '2px solid #000', padding: 16,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                                {task.notes}
                            </div>
                        </Section>
                    )}

                    {/* Attachments */}
                    <TaskCardAttachments attachments={task.attachments} />
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
