import React from 'react';
import { Calendar, Clock, Users, Tag, Folder, Paperclip, FileText } from 'lucide-react';
import { FONT_STACK } from './theme';
import IOSBottomSheet from './IOSBottomSheet';
import IOSTaskDetailHeader from './IOSTaskDetailHeader';
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
        <IOSBottomSheet isOpen={!!task} onClose={onClose}>
            <IOSTaskDetailHeader task={task} isCompleted={isCompleted} onClose={onClose} />

            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F2F2F7', paddingTop: 16, fontFamily: FONT_STACK }}>
                {task.description && (
                    <Section icon={FileText} label="Description">
                        <p dir="auto" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', unicodeBidi: 'plaintext' }}>
                            {task.description}
                        </p>
                    </Section>
                )}

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

                {task.client && (
                    <Section icon={Users} label="Client">
                        {task.client}
                    </Section>
                )}

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

                {task.notes && (
                    <Section icon={FileText} label="Notes">
                        <div dir="auto" style={{
                            background: '#FFF9DB', borderRadius: 12, padding: '12px 14px',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word', unicodeBidi: 'plaintext',
                        }}>
                            {task.notes}
                        </div>
                    </Section>
                )}

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
        </IOSBottomSheet>
    );
};

export default IOSTaskDetailModal;
