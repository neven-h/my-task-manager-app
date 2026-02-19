import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag, Save, Paperclip } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import CustomAutocomplete from '../CustomAutocomplete';
import API_BASE from '../../config';

const DRAFT_STORAGE_KEY = 'taskTracker_draft';

const TaskFormModal = () => {
    const {
        formModal, closeFormModal,
        allCategories, allTags, clients,
        loading, setError,
        createCategory, createTag,
        submitTask, authUser
    } = useTaskContext();

    const { isOpen, editingTask } = formModal;

    const [formData, setFormData] = useState({
        title: '', description: '', categories: [], client: '',
        task_date: new Date().toISOString().split('T')[0],
        task_time: new Date().toTimeString().slice(0, 5),
        duration: '', status: 'uncompleted', tags: [], notes: '',
        shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
    });
    const [tagInput, setTagInput] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#0d6efd');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const fileInputRef = useRef(null);
    const formChangeTimeoutRef = useRef(null);

    // Draft persistence
    const saveDraft = () => {
        if (!editingTask) {
            const toSave = { ...formData, newAttachments: [], attachments: [], removedAttachmentIds: [] };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
        }
    };

    const loadDraft = () => {
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
            const parsed = JSON.parse(draft);
            return { ...parsed, attachments: [], newAttachments: [], removedAttachmentIds: [] };
        }
        return null;
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    };

    const resetFormData = () => {
        setFormData({
            title: '', description: '', categories: [], client: '',
            task_date: new Date().toISOString().split('T')[0],
            task_time: new Date().toTimeString().slice(0, 5),
            duration: '', status: 'uncompleted', tags: [], notes: '',
            shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
        });
        setTagInput('');
    };

    const resetForm = () => {
        resetFormData();
        setShowExitConfirm(false);
        closeFormModal();
    };

    // Initialize form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (editingTask) {
                setFormData({
                    title: editingTask.title,
                    description: editingTask.description || '',
                    categories: editingTask.categories || [],
                    client: editingTask.client || '',
                    task_date: editingTask.task_date,
                    task_time: editingTask.task_time || '',
                    duration: editingTask.duration || '',
                    status: editingTask.status,
                    tags: editingTask.tags || [],
                    notes: editingTask.notes || '',
                    attachments: editingTask.attachments || [],
                    newAttachments: [],
                    removedAttachmentIds: []
                });
            } else {
                // New task - check for draft
                const draft = loadDraft();
                if (draft && (draft.title || draft.description)) {
                    if (window.confirm('You have an unsaved draft. Would you like to continue from your draft?')) {
                        setFormData(draft);
                    } else {
                        resetFormData();
                    }
                } else {
                    resetFormData();
                }
            }
            setShowExitConfirm(false);
        }
    }, [isOpen, editingTask]);

    // Auto-save draft
    useEffect(() => {
        if (isOpen && (formData.title || formData.description)) {
            if (formChangeTimeoutRef.current) {
                clearTimeout(formChangeTimeoutRef.current);
            }
            formChangeTimeoutRef.current = setTimeout(() => {
                saveDraft();
            }, 1000);
        }
    }, [formData, isOpen]);

    const hasUnsavedChanges = () => {
        const attachmentChanged = (formData.newAttachments && formData.newAttachments.length > 0) ||
            (formData.removedAttachmentIds && formData.removedAttachmentIds.length > 0);
        if (editingTask) {
            return (
                formData.title !== editingTask.title ||
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
                attachmentChanged
            );
        } else {
            return !!(formData.title || formData.description || (formData.newAttachments && formData.newAttachments.length > 0));
        }
    };

    const attemptCloseForm = () => {
        if (hasUnsavedChanges()) {
            setShowExitConfirm(true);
        } else {
            resetForm();
        }
    };

    const handleDiscardAndClose = () => {
        clearDraft();
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.categories.length === 0) {
            setError('Please select at least one category');
            return;
        }
        const success = await submitTask(formData, editingTask);
        if (success) {
            clearDraft();
            resetForm();
        }
    };

    // Tag handling
    const addTag = async () => {
        const trimmedTag = tagInput.trim();
        if (!trimmedTag || formData.tags.includes(trimmedTag)) return;
        const tagExists = allTags.some(t => t.name.toLowerCase() === trimmedTag.toLowerCase());
        if (!tagExists) {
            await createTag(trimmedTag);
        }
        setFormData({...formData, tags: [...formData.tags, trimmedTag]});
        setTagInput('');
    };

    const removeTag = (tagToRemove) => {
        setFormData({...formData, tags: formData.tags.filter(t => t !== tagToRemove)});
    };

    // Attachment handling
    const addAttachment = (file) => {
        if (!file) return;
        const name = file.name || `image-${Date.now()}.png`;
        setFormData({
            ...formData,
            newAttachments: [...(formData.newAttachments || []), { file, name }]
        });
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) addAttachment(file);
        e.target.value = '';
    };

    const removeNewAttachment = (index) => {
        setFormData({
            ...formData,
            newAttachments: formData.newAttachments.filter((_, i) => i !== index)
        });
    };

    const removeExistingAttachment = (att) => {
        setFormData({
            ...formData,
            removedAttachmentIds: [...(formData.removedAttachmentIds || []), att.id]
        });
    };

    const handlePasteImage = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) addAttachment(file);
                break;
            }
        }
    };

    const toggleCategory = (categoryId) => {
        if (formData.categories.includes(categoryId)) {
            setFormData({...formData, categories: formData.categories.filter(c => c !== categoryId)});
        } else {
            setFormData({...formData, categories: [...formData.categories, categoryId]});
        }
    };

    const handleCreateCategory = async () => {
        const success = await createCategory(newCategoryName, newCategoryColor, newCategoryIcon);
        if (success) {
            setNewCategoryName('');
            setNewCategoryColor('#0d6efd');
            setNewCategoryIcon('📁');
            setShowAddCategory(false);
        }
    };

    if (!isOpen) return null;

    // Exit Confirmation Modal
    if (showExitConfirm) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{maxWidth: '500px'}}>
                    <div style={{
                        padding: '32px',
                        borderBottom: '3px solid #000',
                        background: '#FF0000',
                        color: '#fff'
                    }}>
                        <h2 style={{margin: 0, fontSize: '1.8rem', fontWeight: 900}}>
                            {editingTask ? 'Unsaved Changes' : 'Save Draft?'}
                        </h2>
                    </div>
                    <div style={{padding: '32px'}}>
                        <p style={{fontSize: '1.1rem', marginBottom: '24px', lineHeight: '1.6'}}>
                            {editingTask
                                ? 'You have unsaved changes to this task. What would you like to do?'
                                : 'You have unsaved changes. Your work has been automatically saved as a draft. What would you like to do?'
                            }
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                            <button
                                className="btn btn-blue"
                                onClick={() => setShowExitConfirm(false)}
                                style={{width: '100%'}}
                            >
                                Continue Editing
                            </button>
                            {!editingTask && (
                                <button
                                    className="btn btn-yellow"
                                    onClick={resetForm}
                                    style={{width: '100%'}}
                                >
                                    Close & Keep Draft
                                </button>
                            )}
                            <button
                                className="btn btn-white"
                                onClick={handleDiscardAndClose}
                                style={{width: '100%'}}
                            >
                                {editingTask ? 'Discard Changes' : 'Discard Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') attemptCloseForm();
        }}>
            <div className="modal-content">
                <div className="modal-header" style={{
                    padding: '32px',
                    borderBottom: '3px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#FFD500'
                }}>
                    <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase'}}>
                        {editingTask ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button onClick={attemptCloseForm}
                            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
                        <X size={28}/>
                    </button>
                </div>

                <div className="modal-body">
                <form onSubmit={handleSubmit}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Title <span style={{color: '#FF0000'}}>*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Task title..."
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                enterKeyHint="next"
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Description</label>
                            <textarea
                                rows={3}
                                placeholder="Details..."
                                value={formData.description}
                                onChange={(e) => {
                                    setFormData({...formData, description: e.target.value});
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                enterKeyHint="next"
                                style={{
                                    minHeight: '80px',
                                    maxHeight: '300px',
                                    overflow: 'auto',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px'
                            }}>
                                <label style={{
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    margin: 0
                                }}>
                                    Categories <span style={{color: '#FF0000'}}>*</span> (Select one or more)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCategory(!showAddCategory)}
                                    className="btn btn-white"
                                    style={{padding: '6px 12px', fontSize: '0.75rem'}}
                                >
                                    <Plus size={14}/> New Category
                                </button>
                            </div>

                            {showAddCategory && (
                                <div style={{
                                    padding: '12px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto auto',
                                        gap: '8px',
                                        marginBottom: '8px'
                                    }}>
                                        <input
                                            type="text"
                                            placeholder="Category name..."
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            style={{fontSize: '0.9rem'}}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Icon"
                                            value={newCategoryIcon}
                                            onChange={(e) => setNewCategoryIcon(e.target.value)}
                                            style={{width: '60px', fontSize: '0.9rem', textAlign: 'center'}}
                                        />
                                        <input
                                            type="color"
                                            value={newCategoryColor}
                                            onChange={(e) => setNewCategoryColor(e.target.value)}
                                            style={{width: '50px'}}
                                        />
                                    </div>
                                    <div style={{display: 'flex', gap: '8px'}}>
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={loading || !newCategoryName.trim()}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '6px 16px',
                                                fontSize: '0.85rem',
                                                flex: 1,
                                                opacity: (loading || !newCategoryName.trim()) ? 0.5 : 1,
                                                cursor: (loading || !newCategoryName.trim()) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loading ? 'Creating...' : 'Create'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddCategory(false);
                                                setNewCategoryName('');
                                                setNewCategoryColor('#0d6efd');
                                                setNewCategoryIcon('📁');
                                            }}
                                            disabled={loading}
                                            className="btn btn-white"
                                            style={{padding: '6px 16px', fontSize: '0.85rem'}}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                                {allCategories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className={`category-pill ${formData.categories.includes(cat.id) ? 'selected' : ''}`}
                                        onClick={() => toggleCategory(cat.id)}
                                        style={{backgroundColor: formData.categories.includes(cat.id) ? (cat.color || '#0d6efd') : undefined}}
                                    >
                                        {cat.icon} {cat.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <CustomAutocomplete
                            label="Client"
                            placeholder="Client..."
                            value={formData.client}
                            onChange={(value) => setFormData({...formData, client: value})}
                            options={clients.map(client => typeof client === 'string' ? client : client.name)}
                        />

                        <div className="form-grid-2col" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Date <span style={{color: '#FF0000'}}>*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.task_date}
                                    onChange={(e) => setFormData({...formData, task_date: e.target.value})}
                                    enterKeyHint="next"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>Time</label>
                                <input
                                    type="time"
                                    value={formData.task_time}
                                    onChange={(e) => setFormData({...formData, task_time: e.target.value})}
                                    enterKeyHint="next"
                                />
                            </div>
                        </div>

                        <div className="form-grid-2col" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>Duration (hours)</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    placeholder="1.5"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                    enterKeyHint="next"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Status <span style={{color: '#FF0000'}}>*</span>
                                </label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="uncompleted">Uncompleted</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Tags</label>
                            <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                <div style={{flex: 1}}>
                                    <CustomAutocomplete
                                        value={tagInput}
                                        onChange={(val) => setTagInput(val)}
                                        options={allTags.map(t => t.name).filter(n => !formData.tags.includes(n))}
                                        placeholder="Type or select a tag..."
                                        onSelect={(val) => {
                                            if (val && !formData.tags.includes(val)) {
                                                setFormData(fd => ({...fd, tags: [...fd.tags, val]}));
                                            }
                                            setTagInput('');
                                        }}
                                        onEnter={() => addTag()}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="btn btn-white"
                                    style={{padding: '12px 20px', alignSelf: 'flex-start'}}
                                >
                                    <Tag size={16} style={{marginRight: '4px'}}/> Add
                                </button>
                            </div>
                            {formData.tags.length > 0 && (
                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                    {formData.tags.map((tag, idx) => (
                                        <span key={idx} className="tag">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)}>
                                                <X size={14}/>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Notes</label>
                            <textarea
                                rows={3}
                                placeholder="Additional context..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                enterKeyHint="done"
                            />
                        </div>

                        <div className="task-attachments-form" onPaste={handlePasteImage}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Attachments</label>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
                                Attach a file or paste an image (Ctrl+V / Cmd+V)
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                <button
                                    type="button"
                                    className="btn btn-white"
                                    style={{ padding: '10px 16px' }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Attach file
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                                    onChange={handleFileInputChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                            {(formData.attachments || []).filter(a => !(formData.removedAttachmentIds || []).includes(a.id)).length > 0 && (
                                <div className="task-attachments-list" style={{ marginBottom: '10px' }}>
                                    {(formData.attachments || []).filter(a => !(formData.removedAttachmentIds || []).includes(a.id)).map(att => {
                                        const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
                                        const fullUrl = att.url?.startsWith('http')
                                            ? att.url
                                            : (att.url?.startsWith('/') ? baseOrigin + att.url : `${API_BASE}/${att.url || ''}`);
                                        const isImage = (att.content_type || '').startsWith('image/');
                                        return (
                                            <div key={att.id} className="task-attachment-chip">
                                                {isImage ? (
                                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <img src={fullUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #000' }}/>
                                                        <span>{att.filename}</span>
                                                    </a>
                                                ) : (
                                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                                                )}
                                                <button type="button" onClick={() => removeExistingAttachment(att)} className="task-attachment-remove" aria-label="Remove">
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {(formData.newAttachments || []).length > 0 && (
                                <div className="task-attachments-list" style={{ marginBottom: '10px' }}>
                                    {(formData.newAttachments || []).map((na, idx) => (
                                        <div key={`new-${idx}`} className="task-attachment-chip task-attachment-chip-new">
                                            <span>{na.name}</span>
                                            <button type="button" onClick={() => removeNewAttachment(idx)} className="task-attachment-remove" aria-label="Remove">
                                                <X size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-buttons" style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '32px',
                        justifyContent: 'flex-end'
                    }}>
                        <button type="button" className="btn btn-white" onClick={attemptCloseForm}
                                disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-red" disabled={loading}>
                            <Save size={16}
                                  style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
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
