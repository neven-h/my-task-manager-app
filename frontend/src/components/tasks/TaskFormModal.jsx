import React from 'react';
import { X, Save } from 'lucide-react';
import CustomAutocomplete from '../CustomAutocomplete';
import useTaskFormModal from '../../hooks/useTaskFormModal';
import TaskExitConfirmModal from './TaskExitConfirmModal';
import TaskCategorySection from './TaskCategorySection';
import TaskTagsSection from './TaskTagsSection';
import TaskAttachmentsSection from './TaskAttachmentsSection';

const labelStyle = {
    display: 'block', marginBottom: '8px', fontWeight: 700,
    fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const TaskFormModal = () => {
    const {
        isOpen, editingTask, formData, tagInput, setTagInput,
        showExitConfirm, setShowExitConfirm,
        allCategories, allTags, clients, loading, createCategory,
        attemptClose, handleDiscard, handleSubmit, update, addTag, handlePasteImage,
        closeFormModal
    } = useTaskFormModal();

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
                                allTags={allTags} tags={formData.tags}
                                tagInput={tagInput} onTagInputChange={setTagInput}
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
