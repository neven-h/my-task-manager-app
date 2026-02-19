import React from 'react';
import { Check, Edit2, Trash2, Copy, Tag, Folder, Share2 } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import API_BASE from '../../config';

const TaskCard = React.memo(({ task }) => {
    const {
        isSharedUser,
        filters, setFilters,
        getCategoryLabel, getStatusColor, getStatusLabel,
        toggleTaskStatus, openEditTaskForm, duplicateTask, deleteTask, openShareModal
    } = useTaskContext();

    const statusStyle = getStatusColor(task.status);

    return (
        <div
            className="task-card"
            style={{
                background: '#fff',
                padding: '28px'
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
            }}>
                <div style={{flex: 1}}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <h3 style={{margin: 0, fontSize: '1.5rem', fontWeight: 700}}>{task.title}</h3>
                        <span className="status-badge" style={{
                            background: statusStyle.bg,
                            borderColor: statusStyle.border,
                            color: statusStyle.color
                        }}>
                            {getStatusLabel(task.status)}
                        </span>
                    </div>
                    {task.description && (
                        <p style={{
                            margin: '0 0 12px 0',
                            color: '#666',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {task.description}
                        </p>
                    )}
                    {task.categories && task.categories.length > 0 && (
                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center'}}>
                            <Folder size={13} style={{color: '#1565c0', flexShrink: 0}} />
                            {task.categories.map((catId, idx) => (
                                <span key={idx} className="tag"
                                      style={{background: '#e3f2fd', borderColor: '#1565c0', color: '#1565c0'}}>
                                    {getCategoryLabel(catId)}
                                </span>
                            ))}
                        </div>
                    )}
                    {task.tags && task.tags.length > 0 && (
                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center'}}>
                            <Tag size={13} style={{color: '#555', flexShrink: 0}} />
                            {task.tags.map((tag, idx) => {
                                const isActive = filters.tags.includes(tag);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFilters(f => ({
                                            ...f,
                                            tags: isActive ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
                                        }))}
                                        className="tag"
                                        style={{
                                            cursor: 'pointer',
                                            background: isActive ? '#FFD500' : '',
                                            fontWeight: isActive ? 700 : '',
                                            border: isActive ? '2px solid #000' : ''
                                        }}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Action buttons - hide for shared users */}
                {!isSharedUser && (
                    <div style={{display: 'flex', gap: '8px', marginLeft: '24px'}}>
                        <button
                            onClick={() => toggleTaskStatus(task.id)}
                            className="btn"
                            style={{padding: '10px', minWidth: 'auto'}}
                            title="Toggle status"
                        >
                            <Check size={18}/>
                        </button>
                        <button
                            onClick={() => openEditTaskForm(task)}
                            className="btn"
                            style={{padding: '10px', minWidth: 'auto'}}
                            title="Edit"
                        >
                            <Edit2 size={18}/>
                        </button>
                        <button
                            onClick={() => duplicateTask(task.id)}
                            className="btn"
                            style={{padding: '10px', minWidth: 'auto'}}
                            title="Duplicate"
                        >
                            <Copy size={18}/>
                        </button>
                        <button
                            onClick={() => deleteTask(task.id)}
                            className="btn"
                            style={{padding: '10px', minWidth: 'auto'}}
                            title="Delete"
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                padding: '20px',
                background: '#f8f8f8',
                border: '2px solid #000',
                fontSize: '0.9rem'
            }}>
                {task.client && (
                    <div>
                        <div style={{
                            color: '#666',
                            marginBottom: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>Client
                        </div>
                        <div style={{fontWeight: 700}}>{task.client}</div>
                    </div>
                )}

                <div>
                    <div style={{
                        color: '#666',
                        marginBottom: '4px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>Date
                    </div>
                    <div style={{fontWeight: 700}}>
                        {new Date(task.task_date).toLocaleDateString()}
                    </div>
                </div>

                {task.task_time && (
                    <div>
                        <div style={{
                            color: '#666',
                            marginBottom: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>Time
                        </div>
                        <div style={{fontWeight: 700}}>
                            {task.task_time}
                        </div>
                    </div>
                )}

                {task.duration && (
                    <div>
                        <div style={{
                            color: '#666',
                            marginBottom: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>Duration
                        </div>
                        <div style={{fontWeight: 700}}>{task.duration}h</div>
                    </div>
                )}
            </div>

            {task.notes && (
                <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#FFD500',
                    border: '2px solid #000',
                    fontSize: '0.95rem',
                    color: '#000'
                }}>
                    <strong>Notes:</strong> {task.notes}
                </div>
            )}

            {task.attachments && task.attachments.length > 0 && (
                <div className="task-card-attachments" style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: '#f8fafc',
                    border: '2px solid #000',
                    fontSize: '0.9rem'
                }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Attachments</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {task.attachments.map(att => {
                            const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
                            const fullUrl = att.url?.startsWith('http')
                                ? att.url
                                : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/${att.url || ''}`);
                            const isImage = (att.content_type || '').startsWith('image/');
                            return (
                                <div key={att.id} className="task-card-attachment-item">
                                    {isImage ? (
                                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#000' }}>
                                            <img src={fullUrl} alt={att.filename} style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid #000' }} />
                                            <span style={{ fontSize: '0.75rem', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                                        </a>
                                    ) : (
                                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="task-card-attachment-link">
                                            {att.filename}
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
