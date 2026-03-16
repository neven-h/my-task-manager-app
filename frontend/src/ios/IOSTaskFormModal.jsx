import React from 'react';
import { X, Plus, Trash2, Paperclip } from 'lucide-react';
import CustomAutocomplete from '../components/CustomAutocomplete';
import useIOSTaskForm from './hooks/useIOSTaskForm';
import IOSDiscardConfirm from './IOSDiscardConfirm';
import { THEME, FONT_STACK } from './theme';
import sanitizeUrl from '../utils/sanitizeUrl';
import storage, { STORAGE_KEYS } from '../utils/storage';

const labelStyle = {
    display: 'block', marginBottom: '8px', fontWeight: 700,
    fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const IOSTaskFormModal = () => {
    const {
        isOpen, editingTask, formData, setFormData, tagInput, setTagInput,
        showDiscardConfirm, setShowDiscardConfirm, fileInputRef,
        handleClose, confirmDiscard, handleSave, update, toggleCategory, addTag, addAttachment,
        visibleAttachments, allCategories, allTags, clients, loading, isAdmin, deleteTask,
        closeFormModal, apiBase
    } = useIOSTaskForm();

    if (!isOpen) return null;

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div style={{ width: '100%', height: '94vh', maxHeight: '94vh', background: '#fff', borderRadius: '16px 16px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
                    {/* Header */}
                    <div style={{ flexShrink: 0, padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top, 0))', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', zIndex: 1 }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', fontFamily: FONT_STACK }}>
                            {editingTask ? 'Edit Task' : 'New Task'}
                        </h2>
                        <button onClick={handleClose} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                            <X size={28} color={THEME.text} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px', paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))', scrollPaddingBottom: '120px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Title *</label>
                            <input type="text" value={formData.title} onChange={e => update('title', e.target.value)} placeholder="Task title..." />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea rows={4} value={formData.description} onChange={e => update('description', e.target.value)} placeholder="Task description..." />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div><label style={labelStyle}>Date</label><input type="date" value={formData.task_date} onChange={e => update('task_date', e.target.value)} /></div>
                            <div><label style={labelStyle}>Time</label><input type="time" value={formData.task_time} onChange={e => update('task_time', e.target.value)} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div><label style={labelStyle}>Hours</label><input type="number" step="0.5" value={formData.duration} onChange={e => update('duration', e.target.value)} placeholder="0" /></div>
                            <div>
                                <label style={labelStyle}>Client</label>
                                <CustomAutocomplete value={formData.client} onChange={value => update('client', value)}
                                    options={clients.map(c => typeof c === 'string' ? c : String(c))} placeholder="Client name..." />
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Categories</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {allCategories.map(cat => (
                                    <div key={cat.id} className={`category-pill ${formData.categories.includes(cat.id) ? 'selected' : ''}`} onClick={() => toggleCategory(cat.id)}>{cat.label}</div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Tags</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    placeholder="Add tag..." list="ios-tags-list" style={{ flex: 1 }} />
                                <button type="button" onClick={addTag} className="mobile-btn mobile-btn-primary" style={{ padding: '14px 20px' }}><Plus size={16} /></button>
                            </div>
                            <datalist id="ios-tags-list">
                                {allTags.map(tag => { const name = typeof tag === 'object' ? tag.name : tag; const key = typeof tag === 'object' ? (tag.id ?? tag.name) : tag; return <option key={key} value={name} />; })}
                            </datalist>
                            {formData.tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {formData.tags.map(tag => (
                                        <div key={tag} style={{ border: '2px solid #000', padding: '4px 10px', fontSize: '0.85rem', fontWeight: 600, background: THEME.primary, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {tag}<X size={14} onClick={() => update('tags', formData.tags.filter(t => t !== tag))} style={{ cursor: 'pointer' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Status</label>
                            <select value={formData.status} onChange={e => update('status', e.target.value)}>
                                <option value="uncompleted">Uncompleted</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Notes</label>
                            <textarea rows={3} value={formData.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional notes..." />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Attachments</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                <button type="button" className="mobile-btn" style={{ padding: '10px 16px' }} onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Attach file
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                                    onChange={e => { addAttachment(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                            </div>
                            {visibleAttachments.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                    {visibleAttachments.map(att => {
                                        const baseOrigin = apiBase.replace(/\/api\/?$/, '');
                                        let fullUrl = att.cloudinary_url || (att.url?.startsWith('http') ? att.url : (att.url?.startsWith('/') ? baseOrigin + att.url : `${apiBase}/tasks/attachments/${att.id}/file`));
                                        const _tok = storage.get(STORAGE_KEYS.AUTH_TOKEN);
                                        if (!fullUrl.startsWith('http') || fullUrl.includes('/api/')) { if (_tok) fullUrl += `${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(_tok)}`; }
                                        return (
                                            <div key={att.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '2px solid #000', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                <a href={sanitizeUrl(fullUrl)} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, removedAttachmentIds: [...(prev.removedAttachmentIds || []), att.id] }))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="Remove"><X size={14} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {(formData.newAttachments || []).length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {formData.newAttachments.map((na, idx) => (
                                        <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '2px solid #000', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600, background: THEME.secondary }}>
                                            <span>{na.name}</span>
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, newAttachments: prev.newAttachments.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="Remove"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {isAdmin && (
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                    <input type="checkbox" checked={formData.shared} onChange={e => update('shared', e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                                    Share with other users
                                </label>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleClose} className="mobile-btn" style={{ flex: 1 }} disabled={loading}>Cancel</button>
                            <button onClick={handleSave} className="mobile-btn mobile-btn-primary" style={{ flex: 1 }} disabled={loading || !formData.title.trim()}>
                                {loading ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                            </button>
                        </div>
                        {editingTask && (
                            <button onClick={() => { deleteTask(editingTask.id); closeFormModal(); }} className="mobile-btn mobile-btn-accent" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                                <Trash2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Delete Task
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <IOSDiscardConfirm isOpen={showDiscardConfirm} isEditing={!!editingTask} onKeepEditing={() => setShowDiscardConfirm(false)} onDiscard={confirmDiscard} />
        </>
    );
};

export default IOSTaskFormModal;
