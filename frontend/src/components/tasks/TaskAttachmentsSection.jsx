import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import API_BASE from '../../config';
import storage, { STORAGE_KEYS } from '../../utils/storage';

const TaskAttachmentsSection = ({ existingAttachments, removedAttachmentIds, newAttachments, onAddFile, onRemoveExisting, onRemoveNew, onPaste }) => {
    const fileInputRef = useRef(null);
    const visibleExisting = (existingAttachments || []).filter(a => !(removedAttachmentIds || []).includes(a.id));

    return (
        <div className="task-attachments-form" onPaste={onPaste}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Attachments
            </label>
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>Attach a file or paste an image (Ctrl+V / Cmd+V)</p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <button type="button" className="btn btn-white" style={{ padding: '10px 16px' }} onClick={() => fileInputRef.current?.click()}>
                    <Paperclip size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Attach file
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddFile(f); e.target.value = ''; }}
                    style={{ display: 'none' }} />
            </div>

            {visibleExisting.length > 0 && (
                <div className="task-attachments-list" style={{ marginBottom: '10px' }}>
                    {visibleExisting.map(att => {
                        const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
                        let fullUrl = att.url?.startsWith('http') ? att.url : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/${att.url || ''}`);
                        const _tok = storage.get(STORAGE_KEYS.AUTH_TOKEN);
                        if (!att.url?.startsWith('http') && _tok) { fullUrl += `${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(_tok)}`; }
                        const isImage = (att.content_type || '').startsWith('image/');
                        return (
                            <div key={att.id} className="task-attachment-chip">
                                {isImage ? (
                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <img src={fullUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #000' }} />
                                        <span>{att.filename}</span>
                                    </a>
                                ) : (
                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                                )}
                                <button type="button" onClick={() => onRemoveExisting(att)} className="task-attachment-remove" aria-label="Remove">
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {(newAttachments || []).length > 0 && (
                <div className="task-attachments-list" style={{ marginBottom: '10px' }}>
                    {newAttachments.map((na, idx) => (
                        <div key={`new-${idx}`} className="task-attachment-chip task-attachment-chip-new">
                            <span>{na.name}</span>
                            <button type="button" onClick={() => onRemoveNew(idx)} className="task-attachment-remove" aria-label="Remove">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskAttachmentsSection;
