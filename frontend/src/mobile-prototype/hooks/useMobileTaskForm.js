import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import storage, { STORAGE_KEYS } from '../../utils/storage';
import API_BASE from '../../config';

const defaultFormData = () => ({
    title: '', description: '', categories: [], client: '',
    task_date: new Date().toISOString().split('T')[0],
    task_time: new Date().toTimeString().slice(0, 5),
    duration: '', status: 'uncompleted', tags: [], notes: '',
    shared: false, attachments: [], newAttachments: [], removedAttachmentIds: []
});

const useMobileTaskForm = () => {
    const {
        formModal, closeFormModal, submitTask, deleteTask,
        allCategories, allTags, clients, loading, isAdmin, error
    } = useTaskContext();
    const { isOpen, editingTask } = formModal;

    const [formData, setFormData] = useState(defaultFormData);
    const [tagInput, setTagInput] = useState('');
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const formChangeTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    // After a successful save, bypass the discard dialog if the modal hasn't
    // closed yet (e.g. due to a React batching edge-case on slow devices).
    const wasSavedRef = useRef(false);

    // Reset wasSaved flag whenever the modal opens fresh.
    useEffect(() => {
        if (isOpen) wasSavedRef.current = false;
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (editingTask) {
            setFormData({
                title: editingTask.title || '', description: editingTask.description || '',
                categories: editingTask.categories || [], client: editingTask.client || '',
                task_date: editingTask.task_date || new Date().toISOString().split('T')[0],
                task_time: editingTask.task_time || '', duration: editingTask.duration || '',
                status: editingTask.status || 'uncompleted', tags: editingTask.tags || [],
                notes: editingTask.notes || '', shared: editingTask.shared || false,
                attachments: editingTask.attachments || [], newAttachments: [], removedAttachmentIds: []
            });
        } else {
            const draft = storage.get(STORAGE_KEYS.MOBILE_TASK_DRAFT);
            if (draft && typeof draft === 'object') {
                setFormData({ ...defaultFormData(), ...draft, newAttachments: [], removedAttachmentIds: draft.removedAttachmentIds || [] });
            } else {
                setFormData(defaultFormData());
            }
        }
        setTagInput('');
    }, [isOpen, editingTask]);

    useEffect(() => {
        if (!isOpen || editingTask) return;
        if (formData.title || formData.description) {
            if (formChangeTimeoutRef.current) clearTimeout(formChangeTimeoutRef.current);
            formChangeTimeoutRef.current = setTimeout(() => {
                storage.set(STORAGE_KEYS.MOBILE_TASK_DRAFT, formData);
            }, 1000);
        }
        return () => { if (formChangeTimeoutRef.current) clearTimeout(formChangeTimeoutRef.current); };
    }, [formData, isOpen, editingTask]);

    const hasUnsavedChanges = useCallback(() => {
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
    }, [formData, editingTask]);

    const handleClose = () => {
        // If we already saved successfully, don't warn about unsaved changes —
        // the modal just hasn't animated away yet.
        if (wasSavedRef.current || !hasUnsavedChanges()) {
            closeFormModal();
        } else {
            setShowDiscardConfirm(true);
        }
    };

    const confirmDiscard = () => {
        if (!editingTask) storage.remove(STORAGE_KEYS.MOBILE_TASK_DRAFT);
        setShowDiscardConfirm(false);
        closeFormModal();
    };

    const handleSave = async () => {
        const success = await submitTask(formData, editingTask);
        if (success) {
            wasSavedRef.current = true;
            storage.remove(STORAGE_KEYS.MOBILE_TASK_DRAFT);
            closeFormModal();
        }
        // If success is false, the error is visible via the `error` field
        // returned from this hook and shown in the modal.
    };

    // Convenience: mark the task complete and save in one tap.
    const handleMarkComplete = async () => {
        const completedData = { ...formData, status: 'completed' };
        const success = await submitTask(completedData, editingTask);
        if (success) {
            wasSavedRef.current = true;
            storage.remove(STORAGE_KEYS.MOBILE_TASK_DRAFT);
            closeFormModal();
        }
    };

    const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    const toggleCategory = (catId) => update('categories',
        formData.categories.includes(catId)
            ? formData.categories.filter(id => id !== catId)
            : [...formData.categories, catId]
    );

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            update('tags', [...formData.tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const addAttachment = (file) => {
        if (!file) return;
        const name = file.name || `image-${Date.now()}.png`;
        setFormData(prev => ({ ...prev, newAttachments: [...(prev.newAttachments || []), { file, name }] }));
    };

    const visibleAttachments = (formData.attachments || []).filter(a => !(formData.removedAttachmentIds || []).includes(a.id));

    return {
        isOpen, editingTask, formData, setFormData, tagInput, setTagInput,
        showDiscardConfirm, setShowDiscardConfirm, fileInputRef,
        handleClose, confirmDiscard, handleSave, handleMarkComplete,
        update, toggleCategory, addTag, addAttachment,
        visibleAttachments, allCategories, allTags, clients, loading, isAdmin, deleteTask,
        closeFormModal, apiBase: API_BASE, error
    };
};

export default useMobileTaskForm;
