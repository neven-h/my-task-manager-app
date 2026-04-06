import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTaskSubmit = ({ setLoading, setError, setTasks, loadTasks, fetchStats, fetchClients }) => {
    const submitTask = useCallback(async (formData, editingTask) => {
        const tempId = editingTask ? null : `temp-${Date.now()}`;

        if (tempId) {
            const { attachments, newAttachments, removedAttachmentIds, ...tempPayload } = formData;
            setTasks(prev => [{ ...tempPayload, id: tempId, _saving: true }, ...prev]);
        }

        try {
            setLoading(true);
            const url = editingTask ? `${API_BASE}/tasks/${editingTask.id}` : `${API_BASE}/tasks`;
            const { attachments, newAttachments, removedAttachmentIds, ...payload } = formData;

            const response = await fetch(url, {
                method: editingTask ? 'PUT' : 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (tempId) setTasks(prev => prev.filter(t => t.id !== tempId));
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save task');
            }

            const responseData = await response.json().catch(() => ({}));
            const taskId = editingTask ? editingTask.id : responseData.id;

            let attachmentError = null;
            if (taskId) {
                for (const { file, name } of (newAttachments || [])) {
                    try {
                        const fd = new FormData();
                        fd.append('file', file, name || file.name || `image-${Date.now()}.png`);
                        const upRes = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, { method: 'POST', headers: getAuthHeaders(false), body: fd });
                        if (!upRes.ok) { const upErr = await upRes.json().catch(() => ({})); attachmentError = upErr.error || 'Failed to upload attachment'; }
                    } catch (err) {
                        attachmentError = 'Failed to upload attachment: ' + err.message;
                    }
                }
                for (const attId of (removedAttachmentIds || [])) {
                    await fetch(`${API_BASE}/tasks/${taskId}/attachments/${attId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
                }
            }

            await loadTasks();
            await fetchStats();
            await fetchClients();
            if (attachmentError) {
                setError('Task saved but attachment failed: ' + attachmentError);
            } else {
                setError(null);
            }
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [loadTasks, fetchStats, fetchClients, setLoading, setError, setTasks]);

    const submitBulkTasks = useCallback(async (taskTitles, categories, client, taskDate, taskTime) => {
        const tasks = taskTitles.map(title => ({
            title, description: '', categories: categories.length > 0 ? categories : [],
            client: client || '', task_date: taskDate, task_time: taskTime || '',
            duration: '', status: 'uncompleted', tags: [], notes: ''
        }));
        try {
            setLoading(true);
            await Promise.all(tasks.map(task => fetch(`${API_BASE}/tasks`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(task) })));
            await loadTasks();
            await fetchStats();
            await fetchClients();
            setError(null);
            return true;
        } catch {
            setError('Failed to create bulk tasks');
            return false;
        } finally {
            setLoading(false);
        }
    }, [loadTasks, fetchStats, fetchClients, setLoading, setError]);

    const shareTask = useCallback(async (taskId, email) => {
        if (!email.trim()) return { success: false, message: 'Please enter an email address' };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return { success: false, message: 'Please enter a valid email address' };
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${taskId}/share`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ email: email.trim() }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to share task');
            return { success: true, message: `Task shared with ${email}` };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    return { submitTask, submitBulkTasks, shareTask };
};

export default useTaskSubmit;
