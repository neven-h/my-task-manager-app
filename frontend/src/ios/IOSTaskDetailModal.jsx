import React from 'react';
import { X, Calendar, Clock, Users, Tag, Folder, Paperclip, FileText } from 'lucide-react';
import { THEME, FONT_STACK } from './theme';
import IOSTaskCardAttachments from './IOSTaskCardAttachments';

const Section = ({ icon: Icon, label, children }) => (
    <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#8E8E93', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <Icon size={13} />
            {label}
        </div>
        <div style={{ fontSize: '0.95rem', color: '#000', lineHeight: 1.6 }}>
            {children}
        </div>
    </div>
);

const IOSTaskDetailModal = ({ task, onClose, getCategoryLabel }) => {
    if (!task) return null;
    const isCompleted = task.status === 'completed';
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                fontFamily: FONT_STACK,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '20px 20px 0 0',
                    width: '100%',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    padding: '0 0 env(safe-area-inset-bottom, 20px) 0',
                    animation: 'slideUp 250ms ease-out',
                }}
            >
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 40, height: 5, borderRadius: 3, background: '#D1D1D6' }} />
                </div>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 20px 16px' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{
                            margin: 0, fontSize: '1.3rem', fontWeight: 700,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? '#8E8E93' : '#000',
                            wordBreak: 'break-word',
                        }}>
                            {task.title}
                        </h2>
                        <span style={{
                            display: 'inline-block', marginTop: 6,
                            padding: '3px 10px', borderRadius: 100,
                            fontSize: '0.72rem', fontWeight: 600,
                            background: isCompleted ? '#34C75920' : `${THEME.accent}20`,
                            color: isCompleted ? '#34C759' : THEME.accent,
                        }}>
                            {isCompleted ? 'Completed' : task.status || 'Pending'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#F2F2F7', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                    >
                        <X size={18} color="#8E8E93" />
                    </button>
                </div>

                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F2F2F7', paddingTop: 16 }}>
                    {/* Description */}
                    {task.description && (
                        <Section icon={FileText} label="Description">
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {task.description}
                            </p>
                        </Section>
                    )}

                    {/* Date & Time & Duration row */}
                    {(task.task_date || task.task_time || task.duration) && (
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                            {task.task_date && (
                                <div style={{ flex: 1, minWidth: 100, background: '#F2F2F7', borderRadius: 12, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8E8E93', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                        <Calendar size={12} /> Date
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                                        {new Date(task.task_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            )}
                            {task.task_time && (
                                <div style={{ flex: 1, minWidth: 80, background: '#F2F2F7', borderRadius: 12, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8E8E93', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                        <Clock size={12} /> Time
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                                        {task.task_time.slice(0, 5)}
                                    </div>
                                </div>
                            )}
                            {task.duration && (
                                <div style={{ flex: 1, minWidth: 80, background: '#F2F2F7', borderRadius: 12, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8E8E93', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                        <Clock size={12} /> Duration
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                                        {task.duration}h
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Client */}
                    {task.client && (
                        <Section icon={Users} label="Client">
                            {task.client}
                        </Section>
                    )}

                    {/* Categories */}
                    {task.categories && task.categories.length > 0 && (
                        <Section icon={Folder} label="Categories">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {task.categories.map(cat => (
                                    <span key={cat.id || cat} style={{
                                        borderRadius: 100, padding: '4px 12px',
                                        fontSize: '0.8rem', fontWeight: 500,
                                        background: cat.color || '#E5E5EA',
                                        color: '#fff',
                                    }}>
                                        {cat.label || (getCategoryLabel ? getCategoryLabel(cat) : cat)}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <Section icon={Tag} label="Tags">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {task.tags.map(tag => (
                                    <span key={tag} style={{
                                        borderRadius: 100, padding: '4px 12px',
                                        fontSize: '0.8rem', fontWeight: 500,
                                        background: '#F2F2F7', color: '#000',
                                        border: '1px solid #E5E5EA',
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
                                background: '#FFF9DB', borderRadius: 12, padding: '12px 14px',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                                {task.notes}
                            </div>
                        </Section>
                    )}

                    {/* Attachments */}
                    {task.attachments && task.attachments.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#8E8E93', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                <Paperclip size={13} />
                                Attachments ({task.attachments.length})
                            </div>
                            <IOSTaskCardAttachments attachments={task.attachments} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );};
export default IOSTaskDetailModal;
