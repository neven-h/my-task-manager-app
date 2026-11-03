import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api';

/** Folders group task categories on the task home screen (see backend/routes/task_folders.py). */
const useTaskFolders = (setError) => {
    const [folders, setFolders] = useState([]);

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/task-folders`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setFolders(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    }, []);

    const saveFolder = useCallback(async ({ id, name, color, categories }) => {
        const res = await fetch(id ? `${API_BASE}/task-folders/${id}` : `${API_BASE}/task-folders`, {
            method: id ? 'PUT' : 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, color, categories }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setError(body.error || 'Could not save the folder');
            return false;
        }
        await fetchFolders();
        return true;
    }, [fetchFolders, setError]);

    const deleteFolder = useCallback(async (id) => {
        const res = await fetch(`${API_BASE}/task-folders/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) {
            setError('Could not delete the folder');
            return false;
        }
        await fetchFolders();
        return true;
    }, [fetchFolders, setError]);

    return { folders, fetchFolders, saveFolder, deleteFolder };
};

export default useTaskFolders;
