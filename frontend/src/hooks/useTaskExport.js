import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTaskExport = (setError, setLoading) => {
    const exportToCSV = useCallback(async (filterParams) => {
        try {
            const params = filterParams || new URLSearchParams();
            const response = await fetch(`${API_BASE}/export/csv?${params}`, { headers: getAuthHeaders() });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export CSV');
        }
    }, [setError]);

    const exportHoursReport = useCallback(async (filterParams) => {
        try {
            const params = filterParams || new URLSearchParams();
            const response = await fetch(`${API_BASE}/export/hours-report?${params}`, { headers: getAuthHeaders() });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hours_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export hours report');
        }
    }, [setError]);

    const importHoursReport = useCallback(async (event) => {
        console.log('[IMPORT] importHoursReport called', event);
        const file = event.target.files[0];
        console.log('[IMPORT] Selected file:', file);
        if (!file) {
            console.log('[IMPORT] No file selected, returning');
            return;
        }
        const fd = new FormData();
        fd.append('file', file);
        try {
            setLoading(true);
            setError(null);
            console.log('[IMPORT] Sending request to:', `${API_BASE}/import/hours-report`);
            const response = await fetch(`${API_BASE}/import/hours-report`, {
                method: 'POST',
                headers: getAuthHeaders(false),
                body: fd
            });
            console.log('[IMPORT] Response status:', response.status);
            const result = await response.json();
            console.log('[IMPORT] Response data:', result);
            if (!response.ok) throw new Error(result.error || 'Failed to import hours report');
            if (result.errors && result.errors.length > 0) {
                setError(`Imported ${result.imported_count} tasks. Some rows had errors: ${result.errors.join(', ')}`);
            } else {
                alert(`Successfully imported ${result.imported_count} tasks!`);
                setError(null);
            }
            event.target.value = '';
            return true;
        } catch (err) {
            console.error('[IMPORT] Error:', err);
            setError(err.message || 'Failed to import hours report');
            return false;
        } finally {
            setLoading(false);
        }
    }, [setError, setLoading]);

    return { exportToCSV, exportHoursReport, importHoursReport };
};

export default useTaskExport;
