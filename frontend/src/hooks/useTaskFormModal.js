import { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../context/TaskContext';
import storage, { STORAGE_KEYS } from '../utils/storage';

const emptyForm = () => ({
    title: '', description: '', categories: [], client: '',
    task_date: new Date().toISOString().split('T')[0],
    task_time: new Date().toTimeString().slice(0, 5),
    duration: '', status: 'uncompleted', tags: [], notes: '',
    shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
});

const useTaskFormModal = () => {
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

    const attemptClose = () => {
        if (hasUnsavedChanges()) setShowExitConfirm(true);
        else { clearDraft(); closeFormModal(); }
    };
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

    return {
        isOpen, editingTask, formData, setFormData, tagInput, setTagInput,
        showExitConfirm, setShowExitConfirm,
        allCategories, allTags, clients, loading, createCategory,
        attemptClose, handleDiscard, handleSubmit, update, addTag, handlePasteImage,
        closeFormModal
    };
};

export default useTaskFormModal;
