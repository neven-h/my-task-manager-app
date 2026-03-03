import { useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const usePortfolioCRUD = ({
    activeTabId,
    isNewStock,
    editingEntry,
    formData,
    setLoading,
    setError,
    setSuccess,
    clearDraft,
    handleCloseForm,
    setHistoricalPriceInfo,
    EMPTY_FORM_DATA,
    setFormData,
    fetchEntries,
    fetchSummary,
    fetchStockNames,
    openEditForm,
    openDuplicateForm
}) => {
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (editingEntry) {
                const id = Number(editingEntry.id);
                if (Number.isNaN(id) || id < 1) {
                    setError('Invalid entry: cannot update. Please close and try again.');
                    return;
                }
            }

            const valueIls = formData.value_ils !== '' && formData.value_ils != null
                ? parseFloat(formData.value_ils)
                : (editingEntry ? editingEntry.value_ils : 0);
            const percentage = formData.percentage !== '' && formData.percentage != null
                ? parseFloat(formData.percentage)
                : 0;
            const basePrice = formData.base_price !== '' && formData.base_price != null
                ? parseFloat(formData.base_price)
                : null;
            const entryDate = (formData.entry_date && typeof formData.entry_date === 'string')
                ? formData.entry_date.split('T')[0]
                : formData.entry_date;

            const entryId = editingEntry ? Number(editingEntry.id) : null;
            const url = editingEntry
                ? `${API_BASE}/portfolio/${entryId}`
                : `${API_BASE}/portfolio`;
            const method = editingEntry ? 'PUT' : 'POST';

            const unitsValue = formData.units;
            let units = null;
            if (unitsValue != null && String(unitsValue).trim() !== '') {
                const normalizedUnits = String(unitsValue).replace(/,/g, '').trim();
                const numValue = parseFloat(normalizedUnits);
                if (!isNaN(numValue) && numValue > 0 && isFinite(numValue)) {
                    units = numValue;
                }
            }
            console.log('DEBUG: final units value =', units);

            const payload = {
                name: formData.name,
                ticker_symbol: formData.ticker_symbol || null,
                percentage,
                value_ils: valueIls,
                base_price: basePrice,
                entry_date: entryDate,
                tab_id: activeTabId,
                currency: formData.currency || 'USD',
                units: units
            };

            console.log('DEBUG: payload being sent =', JSON.stringify(payload, null, 2));

            if (!editingEntry && isNewStock && payload.base_price == null && payload.value_ils) {
                payload.base_price = payload.value_ils;
            }

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save entry');
            }

            if (!editingEntry) clearDraft();

            const wasEditing = !!editingEntry;
            handleCloseForm(true);
            setFormData(EMPTY_FORM_DATA());
            setHistoricalPriceInfo(null);
            setLoading(false);
            setSuccess(wasEditing ? 'Portfolio entry updated successfully' : 'Portfolio entry added successfully');

            fetchEntries(activeTabId);
            fetchSummary(activeTabId);
            fetchStockNames(activeTabId);
            return;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [
        editingEntry, formData, isNewStock, activeTabId,
        setLoading, setError, setSuccess,
        clearDraft, handleCloseForm, setFormData, setHistoricalPriceInfo, EMPTY_FORM_DATA,
        fetchEntries, fetchSummary, fetchStockNames
    ]);

    const handleEdit = useCallback((entry) => {
        openEditForm(entry);
    }, [openEditForm]);

    const handleDuplicate = useCallback((entry) => {
        openDuplicateForm(entry);
    }, [openDuplicateForm]);

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const response = await fetch(`${API_BASE}/portfolio/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete entry');

            setSuccess('Portfolio entry deleted successfully');
            await fetchEntries(activeTabId);
            await fetchSummary(activeTabId);
            await fetchStockNames(activeTabId);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeTabId, setLoading, setError, setSuccess, fetchEntries, fetchSummary, fetchStockNames]);

    return { handleSubmit, handleEdit, handleDelete, handleDuplicate };
};

export default usePortfolioCRUD;
