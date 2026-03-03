import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobilePortfolioCRUD = ({
    activeTabId,
    editingEntry,
    formData,
    setLoading,
    fetchEntries,
    fetchSummary,
    handleCloseForm,
    clearDraft
}) => {
    const handleSaveEntry = async () => {
        try {
            setLoading(true);
            const url = editingEntry
                ? `${API_BASE}/portfolio/${editingEntry.id}`
                : `${API_BASE}/portfolio`;
            const method = editingEntry ? 'PUT' : 'POST';

            const unitsValue = formData.units;
            let units = null;
            if (unitsValue != null && String(unitsValue).trim() !== '') {
                const numValue = parseFloat(String(unitsValue).trim());
                if (!isNaN(numValue) && numValue > 0 && isFinite(numValue)) {
                    units = numValue;
                }
            }

            const body = {
                ...formData,
                tab_id: Number(activeTabId),
                percentage: parseFloat(formData.percentage) || 0,
                value_ils: parseFloat(formData.value_ils) || 0,
                base_price: (formData.base_price !== '' && formData.base_price != null)
                    ? parseFloat(formData.base_price)
                    : null,
                currency: formData.currency || 'USD',
                units
            };

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                if (!editingEntry) clearDraft();
                handleCloseForm(true);
                setLoading(false);
                fetchEntries(true);
                fetchSummary();
                return;
            }
        } catch (err) {
            console.error('Failed to save entry:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await fetch(`${API_BASE}/portfolio/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchEntries();
            await fetchSummary();
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    return { handleSaveEntry, handleDeleteEntry };
};

export default useMobilePortfolioCRUD;
