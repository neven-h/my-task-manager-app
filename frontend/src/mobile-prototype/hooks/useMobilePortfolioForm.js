import { useState } from 'react';
import storage, { STORAGE_KEYS } from '../../utils/storage';

const getEmptyFormData = () => ({
    name: '',
    ticker_symbol: '',
    percentage: '',
    value_ils: '',
    base_price: '',
    entry_date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    units: ''
});

const useMobilePortfolioForm = (activeTabId) => {
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [formData, setFormData] = useState(getEmptyFormData());

    const isFormDirty = () => {
        if (!showForm || editingEntry) return false;
        if (!initialFormData) return false;
        return (
            formData.name !== initialFormData.name ||
            formData.ticker_symbol !== initialFormData.ticker_symbol ||
            formData.percentage !== initialFormData.percentage ||
            formData.value_ils !== initialFormData.value_ils ||
            formData.base_price !== initialFormData.base_price ||
            formData.entry_date !== initialFormData.entry_date ||
            formData.currency !== initialFormData.currency ||
            formData.units !== initialFormData.units
        );
    };

    const hasFormData = () => !!(
        formData.name?.trim() ||
        formData.ticker_symbol?.trim() ||
        formData.percentage ||
        formData.value_ils ||
        formData.base_price ||
        formData.currency !== 'USD' ||
        formData.units !== ''
    );

    const saveDraft = () => {
        if (!editingEntry && hasFormData()) {
            storage.set(STORAGE_KEYS.MOBILE_PORTFOLIO_DRAFT, { ...formData, tab_id: activeTabId });
        }
    };

    const loadDraft = () => {
        try {
            const draftData = storage.get(STORAGE_KEYS.MOBILE_PORTFOLIO_DRAFT);
            if (draftData && (!draftData.tab_id || draftData.tab_id === activeTabId)) {
                return draftData;
            }
        } catch (e) {
            console.error('Error loading draft:', e);
        }
        return null;
    };

    const clearDraft = () => {
        storage.remove(STORAGE_KEYS.MOBILE_PORTFOLIO_DRAFT);
    };

    const handleCloseForm = (forceClose = false) => {
        if (forceClose || !isFormDirty()) {
            if (!editingEntry) clearDraft();
            setShowForm(false);
            setEditingEntry(null);
            setInitialFormData(null);
            setFormData(getEmptyFormData());
        } else {
            setShowDraftDialog(true);
        }
    };

    const handleSaveDraft = () => {
        saveDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const handleDismissDraft = () => {
        clearDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const openNewEntryForm = () => {
        setEditingEntry(null);
        const draft = loadDraft();
        const initialForm = draft || getEmptyFormData();
        setFormData(initialForm);
        setInitialFormData({ ...initialForm });
        setShowForm(true);
    };

    const openEditEntryForm = (entry) => {
        setEditingEntry(entry);
        const editFormData = {
            name: entry.name,
            ticker_symbol: entry.ticker_symbol || '',
            percentage: entry.percentage?.toString() || '',
            value_ils: entry.value_ils?.toString() || '',
            base_price: entry.base_price != null && entry.base_price !== '' ? String(entry.base_price) : '',
            entry_date: entry.entry_date.split('T')[0],
            currency: entry.currency || 'USD',
            units: entry.units != null && entry.units !== '' ? String(entry.units) : ''
        };
        setFormData(editFormData);
        setInitialFormData({ ...editFormData });
        setShowForm(true);
    };

    return {
        showForm, editingEntry, showDraftDialog, setShowDraftDialog,
        formData, setFormData, initialFormData,
        handleCloseForm, handleSaveDraft, handleDismissDraft, clearDraft,
        openNewEntryForm, openEditEntryForm, getEmptyFormData
    };
};

export default useMobilePortfolioForm;
