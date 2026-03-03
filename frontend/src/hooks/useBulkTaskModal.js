import { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import storage, { STORAGE_KEYS } from '../utils/storage';

const useBulkTaskModal = () => {
    const { showBulkInput, setShowBulkInput, allCategories, clients, loading, submitBulkTasks } = useTaskContext();

    const [bulkTasksText, setBulkTasksText] = useState('');
    const [bulkCategories, setBulkCategories] = useState([]);
    const [bulkClient, setBulkClient] = useState('');

    const saveBulkDraft = () => {
        if (bulkTasksText.trim()) storage.set(STORAGE_KEYS.TASK_BULK_DRAFT, bulkTasksText);
    };
    const clearBulkDraft = () => storage.remove(STORAGE_KEYS.TASK_BULK_DRAFT);

    useEffect(() => {
        if (showBulkInput && bulkTasksText) {
            const timeoutId = setTimeout(saveBulkDraft, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [bulkTasksText, showBulkInput]);

    useEffect(() => {
        if (showBulkInput) {
            const draft = storage.get(STORAGE_KEYS.TASK_BULK_DRAFT) || '';
            if (draft) setBulkTasksText(draft);
            setBulkCategories([]);
            setBulkClient('');
        }
    }, [showBulkInput]);

    const parseBulkTasks = (text) => {
        const lines = text.split('\n');
        const tasksToCreate = [];
        let currentTask = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
            if (numberedMatch) {
                if (currentTask) tasksToCreate.push(currentTask.trim());
                currentTask = numberedMatch[2];
            } else {
                if (currentTask) currentTask += '\n' + line;
                else tasksToCreate.push(line);
            }
        }
        if (currentTask) tasksToCreate.push(currentTask.trim());
        return tasksToCreate;
    };

    const handleBulkTaskSubmit = async () => {
        if (!bulkTasksText.trim()) return;
        const taskTitles = parseBulkTasks(bulkTasksText);
        if (taskTitles.length === 0) return;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().slice(0, 5);
        const success = await submitBulkTasks(taskTitles, bulkCategories, bulkClient, today, now);
        if (success) {
            setBulkTasksText('');
            clearBulkDraft();
            setBulkCategories([]);
            setBulkClient('');
            setShowBulkInput(false);
        }
    };

    const toggleBulkCategory = (categoryId) => {
        setBulkCategories(prev =>
            prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
        );
    };

    const handleClose = () => {
        setBulkTasksText('');
        clearBulkDraft();
        setBulkCategories([]);
        setBulkClient('');
        setShowBulkInput(false);
    };

    return {
        showBulkInput, setShowBulkInput, allCategories, clients, loading,
        bulkTasksText, setBulkTasksText, bulkCategories, bulkClient, setBulkClient,
        parseBulkTasks, handleBulkTaskSubmit, toggleBulkCategory, handleClose
    };
};

export default useBulkTaskModal;
