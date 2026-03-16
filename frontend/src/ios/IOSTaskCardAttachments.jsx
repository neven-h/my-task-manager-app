import React from 'react';
import { Paperclip } from 'lucide-react';
import API_BASE from '../config';
import storage, { STORAGE_KEYS } from '../utils/storage';
import { FONT_STACK } from './theme';

/** Append auth token as query param for API-served files. */
const authUrl = (url, token) => {
    if (!url || url.startsWith('http') || !token) return url;
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

const IOSTaskCardAttachments = ({ attachments }) => {
    if (!attachments || attachments.length === 0) return null;
    const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
    const token = storage.get(STORAGE_KEYS.AUTH_TOKEN);

    return (
        <div style={{ marginTop: 8, marginLeft: 46 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {attachments.map(att => {
                    const rawUrl = att.url?.startsWith('http')
                        ? att.url
                        : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/tasks/attachments/${att.id}/file`);
                    const fullUrl = authUrl(rawUrl, token);
                    const isImage = (att.content_type || '').startsWith('image/');
                    return (
                        <a key={att.id} href={fullUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: '#F2F2F7', borderRadius: 8, padding: '4px 10px',
                                textDecoration: 'none', color: '#007AFF',
                                fontSize: '0.78rem', fontFamily: FONT_STACK,
                            }}
                        >
                            {isImage ? (
                                <img src={fullUrl} alt={att.filename}
                                    style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                            ) : (
                                <Paperclip size={13} />
                            )}
                            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.filename}
                            </span>
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default IOSTaskCardAttachments;
