import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SYS } from './renovationConstants';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const RenovationAttachmentList = ({ itemId }) => {
    const [attachments, setAttachments] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE}/renovation/items/${itemId}/attachments`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(d => setAttachments(Array.isArray(d) ? d : []))
            .catch(() => setAttachments([]));
    }, [itemId]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE}/renovation/items/${itemId}/attachments`, {
                method: 'POST', headers: getAuthHeaders(false), body: formData,
            });
            const data = await res.json();
            if (res.ok) setAttachments(prev => [...(prev || []), data]);
        } catch (_) {}
        finally { setUploading(false); e.target.value = ''; }
    };

    const handleDelete = async (att) => {
        if (!window.confirm(`Delete "${att.filename}"?`)) return;
        try {
            const res = await fetch(`${API_BASE}/renovation/attachments/${att.id}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            if (res.ok) setAttachments(prev => prev.filter(a => a.id !== att.id));
        } catch (_) {}
    };

    if (attachments === null) return (
        <div style={{ fontSize: '0.78rem', color: SYS.light, padding: '4px 0' }}>Loading files…</div>
    );

    return (
        <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light, marginBottom: 4 }}>
                Files ({attachments.length})
            </div>
            {attachments.map(att => (
                <div key={att.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 0', borderBottom: '1px solid #eee', fontSize: '0.82rem',
                }}>
                    <span style={{ fontSize: '0.9rem' }}>📎</span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, color: SYS.primary, fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.filename}
                    </a>
                    {att.file_size > 0 && (
                        <span style={{ fontSize: '0.72rem', color: SYS.light }}>{fmtSize(att.file_size)}</span>
                    )}
                    <button onClick={() => handleDelete(att)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: SYS.light, padding: '2px 4px',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <X size={13} />
                    </button>
                </div>
            ))}
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload}
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                marginTop: 6, background: 'none', border: '1px dashed #000',
                padding: '4px 12px', cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: '0.78rem', color: SYS.primary,
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                opacity: uploading ? 0.5 : 1,
            }}>
                {uploading ? 'Uploading…' : '📎 Add File'}
            </button>
        </div>
    );
};

export default RenovationAttachmentList;
