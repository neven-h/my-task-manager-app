import React from 'react';
import API_BASE from '../../config';
import storage, { STORAGE_KEYS } from '../../utils/storage';

/** Append auth token as query param for API-served files (img/a can't send headers). */
const authUrl = (url, token) => {
    if (!url || url.startsWith('http') || !token) return url;
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

const TaskCardAttachments = ({ attachments }) => {
    if (!attachments || attachments.length === 0) return null;
    const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
    const token = storage.get(STORAGE_KEYS.AUTH_TOKEN);
    return (
        <div className="task-card-attachments" style={{
            marginTop: '16px', padding: '12px',
            background: '#f8fafc', border: '2px solid #000', fontSize: '0.9rem'
        }}>
            <strong style={{ display: 'block', marginBottom: '8px' }}>Attachments</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {attachments.map(att => {
                    const rawUrl = att.url?.startsWith('http')
                        ? att.url
                        : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/${att.url || ''}`);
                    const fullUrl = authUrl(rawUrl, token);
                    const isImage = (att.content_type || '').startsWith('image/');
                    return (
                        <div key={att.id} className="task-card-attachment-item">
                            {isImage ? (
                                <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#000' }}>
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
    );
};

export default TaskCardAttachments;
