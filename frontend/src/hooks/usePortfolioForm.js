import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

export const EMPTY_FORM_DATA = () => ({
    name: '', ticker_symbol: '', percentage: '', value_ils: '',
    base_price: '', entry_date: new Date().toISOString().split('T')[0],
    currency: 'USD', units: ''
});

const usePortfolioForm = ({ activeTabId, setError }) => {
    const [formData, setFormData] = useState(EMPTY_FORM_DATA());
    const [editingEntry, setEditingEntry] = useState(null);
    const [isNewStock, setIsNewStock] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [fetchingHistoricalPrice, setFetchingHistoricalPrice] = useState(false);
    const [historicalPriceInfo, setHistoricalPriceInfo] = useState(null);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'ticker_symbol' ? value.toUpperCase() : value }));
        if (name === 'value_ils') setHistoricalPriceInfo(null);
    }, []);

    const handleStockNameChange = useCallback((value, stockNames) => {
        const isExistingStock = stockNames.some(n => n.toLowerCase() === value.toLowerCase());
        setIsNewStock(!isExistingStock && value.trim() !== '');
        setFormData(prev => ({ ...prev, name: value, base_price: isExistingStock ? prev.base_price : '' }));
    }, []);

    const handleFetchHistoricalPrice = useCallback(async () => {
        const ticker = formData.ticker_symbol?.trim().toUpperCase();
        const date = formData.entry_date;
        if (!ticker || !date) return;
        setFetchingHistoricalPrice(true);
        setHistoricalPriceInfo(null);
        try {
            const res = await fetch(
                `${API_BASE}/portfolio/historical-price?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}`,
                { headers: getAuthHeaders() }
            );
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to fetch historical price'); return; }
            setFormData(prev => ({ ...prev, value_ils: String(data.price) }));
            setHistoricalPriceInfo({ actualDate: data.actualDate, currency: data.currency });
        } catch (err) {
            setError('Failed to fetch historical price');
        } finally {
            setFetchingHistoricalPrice(false);
        }
    }, [formData.ticker_symbol, formData.entry_date, setError]);

    const isFormDirty = useCallback(() => {
        if (!showForm || editingEntry || !initialFormData) return false;
        return ['name','ticker_symbol','percentage','value_ils','base_price','entry_date','currency','units']
            .some(k => formData[k] !== initialFormData[k]);
    }, [showForm, editingEntry, initialFormData, formData]);

    const hasFormData = useCallback(() => !!(
        formData.name?.trim() || formData.ticker_symbol?.trim() ||
        formData.percentage || formData.value_ils || formData.base_price ||
        formData.currency !== 'USD' || formData.units !== ''
    ), [formData]);

    const saveDraft = useCallback(() => {
        if (!editingEntry && hasFormData()) {
            storage.set(STORAGE_KEYS.PORTFOLIO_DRAFT, { ...formData, tab_id: activeTabId });
        }
    }, [editingEntry, hasFormData, formData, activeTabId]);

    const loadDraft = useCallback(() => {
        try {
            const draft = storage.get(STORAGE_KEYS.PORTFOLIO_DRAFT);
            if (draft && (!draft.tab_id || draft.tab_id === activeTabId)) return draft;
        } catch (e) { console.error('Error loading draft:', e); }
        return null;
    }, [activeTabId]);

    const clearDraft = useCallback(() => storage.remove(STORAGE_KEYS.PORTFOLIO_DRAFT), []);

    const handleCloseForm = useCallback((forceClose = false) => {
        if (forceClose || !isFormDirty()) {
            if (!editingEntry) clearDraft();
            setShowForm(false); setError(null); setEditingEntry(null);
            setIsNewStock(false); setInitialFormData(null);
            setFormData(EMPTY_FORM_DATA()); setHistoricalPriceInfo(null);
        } else {
            setShowDraftDialog(true);
        }
    }, [isFormDirty, editingEntry, clearDraft, setError]);

    const openAddForm = useCallback(() => {
        setEditingEntry(null); setIsNewStock(false);
        const initial = loadDraft() || EMPTY_FORM_DATA();
        setFormData(initial); setInitialFormData({ ...initial }); setShowForm(true);
    }, [loadDraft]);

    const openEditForm = useCallback((entry) => {
        setError(null); setEditingEntry(entry); setIsNewStock(false);
        const entryDate = entry.entry_date && typeof entry.entry_date === 'string'
            ? entry.entry_date.split('T')[0] : entry.entry_date;
        const data = {
            name: entry.name, ticker_symbol: entry.ticker_symbol || '',
            percentage: entry.percentage ?? '', value_ils: entry.value_ils ?? '',
            base_price: entry.base_price != null && entry.base_price !== '' ? entry.base_price : '',
            entry_date: entryDate ?? new Date().toISOString().split('T')[0],
            currency: entry.currency || 'USD', units: entry.units != null ? String(entry.units) : ''
        };
        setFormData(data); setInitialFormData({ ...data }); setHistoricalPriceInfo(null); setShowForm(true);
    }, [setError]);

    const openDuplicateForm = useCallback((entry) => {
        setError(null); setEditingEntry(null); setIsNewStock(false);
        setFormData({
            name: entry.name, ticker_symbol: entry.ticker_symbol || '',
            percentage: entry.percentage ?? '', value_ils: entry.value_ils ?? '',
            base_price: entry.base_price != null && entry.base_price !== '' ? entry.base_price : '',
            entry_date: new Date().toISOString().split('T')[0],
            currency: entry.currency || 'USD', units: entry.units != null ? String(entry.units) : ''
        });
        setInitialFormData(null); setHistoricalPriceInfo(null); setShowForm(true);
    }, [setError]);

    return {
        formData, setFormData, editingEntry, setEditingEntry,
        isNewStock, setIsNewStock, showForm, setShowForm,
        showDraftDialog, setShowDraftDialog, initialFormData, setInitialFormData,
        fetchingHistoricalPrice, historicalPriceInfo, setHistoricalPriceInfo,
        handleInputChange, handleStockNameChange, handleFetchHistoricalPrice,
        isFormDirty, hasFormData, saveDraft, loadDraft, clearDraft,
        handleCloseForm, openAddForm, openEditForm, openDuplicateForm, EMPTY_FORM_DATA
    };
};

export default usePortfolioForm;
