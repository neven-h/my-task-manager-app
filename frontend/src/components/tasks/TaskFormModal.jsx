import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import CustomAutocomplete from '../CustomAutocomplete';
import storage, { STORAGE_KEYS } from '../../utils/storage';
import TaskExitConfirmModal from './TaskExitConfirmModal';
import TaskCategorySection from './TaskCategorySection';
import TaskTagsSection from './TaskTagsSection';
import TaskAttachmentsSection from './TaskAttachmentsSection';

const emptyForm = () => ({
    title: '', description: '', categories: [], client: '',
    task_date: new Date().toISOString().split('T')[0],
    task_time: new Date().toTimeString().slice(0, 5),
    duration: '', status: 'uncompleted', tags: [], notes: '',
    shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
});

const TaskFormModal = () => {
    const { formModal, closeFormModal, allCategories, allTags, clients, loading, setError, createCategory, createTag, submitTask } = useTaskContext();
    const { isOpen, editingTask } = formModal;

    const [formData, setFormData] = useState(emptyForm);
    const [tagInput, setTagInput] = useState('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const formChangeTimeoutRef = useRef(null);

    const saveDraft = () => {
        if (!editingTask) {
            const toSave = { ...formData, newAttachments: [], attachments: [], removedAttachmentIds: [] };
            storage.set(STORAGE_KEYS.TASK_DRAFT, toSave);
        }
    };
    const clearDraft = () => storage.remove(STORAGE_KEYS.TASK_DRAFT);

    useEffect(() => {
        if (!isOpen) return;
        if (editingTask) {
            setFormData({
                title: editingTask.title, description: editingTask.description || '',
                categories: editingTask.categories || [], client: editingTask.client || '',
                task_date: editingTask.task_date, task_time: editingTask.task_time || '',
                duration: editingTask.duration || '', status: editingTask.status,
                tags: editingTask.tags || [], notes: editingTask.notes || '',
                attachments: editingTask.attachments || [], newAttachments: [], removedAttachmentIds: []
            });
        } else {
            const draft = storage.get(STORAGE_KEYS.TASK_DRAFT);
            if (draft && (draft.title || draft.description)) {
                if (window.confirm('You have an unsaved draft. Would you like to continue from your draft?')) {
                    setFormData({ ...draft, attachments: [], newAttachments: [], removedAttachmentIds: [] });
                } else {
                    setFormData(emptyForm());
                }
            } else {
                setFormData(emptyForm());
            }
        }
        setShowExitConfirm(false);
        setTagInput('');
    }, [isOpen, editingTask]);

    useEffect(() => {
        if (isOpen && (formData.title || formData.description)) {
            if (formChangeTimeoutRef.current) clearTimeout(formChangeTimeoutRef.current);
            formChangeTimeoutRef.current = setTimeout(saveDraft, 1000);
        }
    }, [formData, isOpen]);

    const hasUnsavedChanges = () => {
        const attachmentChanged = (formData.newAttachments?.length > 0) || (formData.removedAttachmentIds?.length > 0);
        if (editingTask) {
            return formData.title !== editingTask.title ||
                formData.description !== (editingTask.description || '') ||
                JSON.stringify(formData.categories) !== JSON.stringify(editingTask.categories || []) ||
                formData.client !== (editingTask.client || '') ||
                formData.task_date !== editingTask.task_date ||
                formData.task_time !== (editingTask.task_time || '') ||
                formData.duration !== (editingTask.duration || '') ||
                formData.status !== editingTask.status ||
                JSON.stringify(formData.tags) !== JSON.stringify(editingTask.tags || []) ||
                formData.notes !== (editingTask.notes || '') ||
                formData.shared !== (editingTask.shared || false) ||
                attachmentChanged;
        }
        return !!(formData.title || formData.description || attachmentChanged);
    };

    const attemptClose = () => { if (hasUnsavedChanges()) setShowExitConfirm(true); else { clearDraft(); closeFormModal(); } };
    const handleDiscard = () => { clearDraft(); setShowExitConfirm(false); closeFormModal(); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const ok = await submitTask(formData, editingTask);
        if (ok) { clearDraft(); setShowExitConfirm(false); closeFormModal(); }
    };

    const update = (key, val) => setFormData(fd => ({ ...fd, [key]: val }));

    const addTag = async () => {
        const t = tagInput.trim();
        if (!t || formData.tags.includes(t)) return;
        if (!allTags.some(tag => tag.name.toLowerCase() === t.toLowerCase())) await createTag(t);
        update('tags', [...formData.tags, t]);
        setTagInput('');
    };

    const handlePasteImage = (e) => {
        for (const item of (e.clipboardData?.items || [])) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) update('newAttachments', [...(formData.newAttachments || []), { file, name: file.name || `image-${Date.now()}.png` }]);
                break;
            }
        }
    };

    if (!isOpen) return null;

    if (showExitConfirm) {
        return (
            <TaskExitConfirmModal
                isEditing={!!editingTask}
                onContinue={() => setShowExitConfirm(false)}
                onKeepDraft={() => { setShowExitConfirm(false); closeFormModal(); }}
                onDiscard={handleDiscard}
            />
        );
    }

    const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') attemptClose(); }}>
            <div className="modal-content">
                <div className="modal-header" style={{ padding: '32px', borderBottom: '3px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD500' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        {editingTask ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button onClick={attemptClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <X size={28} />
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            <div>
                                <label style={labelStyle}>Title <span style={{ color: '#FF0000' }}>*</span></label>
                                <input type="text" required placeholder="Task title..." value={formData.title} onChange={(e) => update('title', e.target.value)} enterKeyHint="next" />
                            </div>

                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea rows={3} placeholder="Details..." value={formData.description}
                                    onChange={(e) => { update('description', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                    enterKeyHint="next" style={{ minHeight: '80px', maxHeight: '300px', overflow: 'auto', resize: 'vertical' }} />
                            </div>

                            <TaskCategorySection
                                allCategories={allCategories}
                                selectedCategories={formData.categories}
                                loading={loading}
                                onToggle={(id) => update('categories', formData.categories.includes(id) ? formData.categories.filter(c => c !== id) : [...formData.categories, id])}
                                onCreate={createCategory}
                            />

                            <CustomAutocomplete label="Client" placeholder="Client..." value={formData.client}
                                onChange={(value) => update('client', value)}
                                options={clients.map(c => typeof c === 'string' ? c : c.name)} />

                            <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Date <span style={{ color: '#FF0000' }}>*</span></label>
                                    <input type="date" required value={formData.task_date} onChange={(e) => update('task_date', e.target.value)} enterKeyHint="next" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Time</label>
                                    <input type="time" value={formData.task_time} onChange={(e) => update('task_time', e.target.value)} enterKeyHint="next" />
                                </div>
                            </div>

                            <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Duration (hours)</label>
                                    <input type="number" step="0.25" min="0" placeholder="1.5" value={formData.duration} onChange={(e) => update('duration', e.target.value)} enterKeyHint="next" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Status <span style={{ color: '#FF0000' }}>*</span></label>
                                    <select required value={formData.status} onChange={(e) => update('status', e.target.value)}>
                                        <option value="uncompleted">Uncompleted</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <TaskTagsSection
                                allTags={allTags}
                                tags={formData.tags}
                                tagInput={tagInput}
                                onTagInputChange={setTagInput}
                                onAdd={addTag}
                                onRemove={(tag) => update('tags', formData.tags.filter(t => t !== tag))}
                                onSelect={(val) => { if (!formData.tags.includes(val)) update('tags', [...formData.tags, val]); setTagInput(''); }}
                            />

                            <div>
                                <label style={labelStyle}>Notes</label>
                                <textarea rows={3} placeholder="Additional context..." value={formData.notes} onChange={(e) => update('notes', e.target.value)} enterKeyHint="done" />
                            </div>

                            <TaskAttachmentsSection
                                existingAttachments={formData.attachments}
                                removedAttachmentIds={formData.removedAttachmentIds}
                                newAttachments={formData.newAttachments}
                                onAddFile={(file) => update('newAttachments', [...(formData.newAttachments || []), { file, name: file.name || `image-${Date.now()}.png` }])}
                                onRemoveExisting={(att) => update('removedAttachmentIds', [...(formData.removedAttachmentIds || []), att.id])}
                                onRemoveNew={(idx) => update('newAttachments', formData.newAttachments.filter((_, i) => i !== idx))}
                                onPaste={handlePasteImage}
                            />
                        </div>

                        <div className="form-buttons" style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-white" onClick={attemptClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn btn-red" disabled={loading}>
                                <Save size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                                {loading ? 'Saving...' : (editingTask ? 'Update' : 'Save Task')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskFormModal;
