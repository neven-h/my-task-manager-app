import React, { useState, useEffect, useMemo } from 'react';
import { Users } from 'lucide-react';
import TabBar from './components/TabBar';
import API_BASE from './config';
import { getAuthHeaders } from './api.js';
import WatchlistSection from './components/portfolio/WatchlistSection';
import YahooPortfolioSection from './components/portfolio/YahooPortfolioSection';
import storage, { STORAGE_KEYS } from './utils/storage';
import usePortfolioData from './hooks/usePortfolioData';
import usePortfolioTabs from './hooks/usePortfolioTabs';
import usePortfolioForm from './hooks/usePortfolioForm';
import usePortfolioCRUD from './hooks/usePortfolioCRUD';
import useStockPrices from './hooks/useStockPrices';
import StockPortfolioHeader from './components/portfolio/StockPortfolioHeader';
import StockPortfolioSummary from './components/portfolio/StockPortfolioSummary';
import StockEntryList from './components/portfolio/StockEntryList';
import StockPortfolioForm from './components/portfolio/StockPortfolioForm';

const colors = {
    primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    success: '#00AA00', background: '#fff', card: '#ffffff',
    text: '#000', textLight: '#666', border: '#000'
};

const StockPortfolio = ({ onBackToTasks }) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [newTabName, setNewTabName] = useState('');
    const [success, setSuccess] = useState(null);
    const [summaryDisplayCurrency, setSummaryDisplayCurrency] = useState('ILS');

    const authUser = storage.get(STORAGE_KEYS.AUTH_USER);
    const authRole = storage.get(STORAGE_KEYS.AUTH_ROLE);

    const { entries, setEntries, summary, setSummary, stockNames,
        loading, setLoading, error, setError,
        fetchEntries, fetchSummary, fetchStockNames
    } = usePortfolioData();

    const { handleSwitchTab, handleCreateFirstTab, initializeTabs } = usePortfolioTabs({
        setTabs, setActiveTabId, setEntries, setSummary, setError,
        fetchEntries, fetchSummary, fetchStockNames
    });

    const form = usePortfolioForm({ activeTabId, setError });

    const { handleSubmit, handleEdit, handleDelete, handleDuplicate } = usePortfolioCRUD({
        activeTabId, isNewStock: form.isNewStock, editingEntry: form.editingEntry,
        formData: form.formData, setLoading, setError, setSuccess,
        clearDraft: form.clearDraft, handleCloseForm: form.handleCloseForm,
        setHistoricalPriceInfo: form.setHistoricalPriceInfo, EMPTY_FORM_DATA: form.EMPTY_FORM_DATA,
        setFormData: form.setFormData, fetchEntries, fetchSummary, fetchStockNames,
        openEditForm: form.openEditForm, openDuplicateForm: form.openDuplicateForm
    });

    const { stockPrices, priceLoading, fetchStockPrices } = useStockPrices({ activeTabId, entries });

    useEffect(() => { initializeTabs(); }, []);

    const getStockSummary = useMemo(() => {
        const stockMap = {};
        entries.forEach(entry => {
            if (!stockMap[entry.name]) {
                stockMap[entry.name] = { name: entry.name, tickerSymbol: entry.ticker_symbol || null, entries: [], basePrice: entry.base_price || null, latestEntry: null };
            }
            stockMap[entry.name].entries.push(entry);
        });
        Object.values(stockMap).forEach(stock => {
            stock.entries.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
            stock.latestEntry = stock.entries[stock.entries.length - 1];
            if (!stock.basePrice && stock.entries.length > 0)
                stock.basePrice = stock.entries[0].base_price || stock.entries[0].value_ils;
        });
        return Object.values(stockMap);
    }, [entries]);

    const groupedEntries = entries.reduce((acc, entry) => {
        if (!acc[entry.name]) acc[entry.name] = [];
        acc[entry.name].push(entry);
        return acc;
    }, {});

    const handleSaveDraft = () => {
        form.saveDraft(); form.handleCloseForm(true); form.setShowDraftDialog(false);
        setSuccess('Entry saved as draft');
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleDismissDraft = () => {
        form.clearDraft(); form.handleCloseForm(true); form.setShowDraftDialog(false);
    };

    const tabBarProps = {
        tabs, activeTabId, apiBase: API_BASE, tabEndpoint: 'portfolio-tabs',
        authUser, authRole, getAuthHeaders, colors,
        deleteConfirmMessage: (name) => `Delete "${name}" and all its portfolio entries?`,
        onTabsChanged: (updatedTabs) => setTabs(updatedTabs),
        onTabCreated: async (newTabId) => {
            setActiveTabId(newTabId);
            storage.set(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB, String(newTabId));
            await fetchEntries(newTabId); await fetchSummary(newTabId); await fetchStockNames(newTabId);
        },
        onTabDeleted: async (deletedTabId, updatedTabs) => {
            if (activeTabId === deletedTabId) {
                if (updatedTabs.length > 0) { handleSwitchTab(updatedTabs[0].id); }
                else { setActiveTabId(null); storage.remove(STORAGE_KEYS.ACTIVE_PORTFOLIO_TAB); setEntries([]); setSummary(null); }
            }
        },
        onTabSwitched: (tabId) => handleSwitchTab(tabId),
        onError: (msg) => setError(msg)
    };

    return (
        <div style={{ minHeight: '100vh', background: colors.background, fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif', fontSize: '16px', color: colors.text }}>
            <style>{`@media (max-width: 768px) { .portfolio-main { padding: 1rem !important; } .stock-group { margin-bottom: 1rem !important; } .entries-table { overflow-x: auto; } .entries-table table { font-size: 0.85rem !important; } }`}</style>

            <StockPortfolioHeader onBackToTasks={onBackToTasks} onAddEntry={form.openAddForm}
                error={error} success={success} onClearError={() => setError(null)} onClearSuccess={() => setSuccess(null)} />

            <TabBar {...tabBarProps} />

            {tabs.length === 0 && (
                <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem', border: `3px solid ${colors.border}`, background: colors.card }}>
                    <Users size={48} style={{ color: colors.primary, marginBottom: '1rem' }} />
                    <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem' }}>Create Your First Portfolio Tab</h2>
                    <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>Each tab has its own separate portfolio. Create a tab to get started.</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <input type="text" value={newTabName} onChange={(e) => setNewTabName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFirstTab(newTabName, setNewTabName); }}
                            placeholder="Tab name..." style={{ padding: '0.7rem 1rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif', width: '200px' }} />
                        <button onClick={() => handleCreateFirstTab(newTabName, setNewTabName)} disabled={!newTabName.trim()}
                            style={{ padding: '0.7rem 1.5rem', background: newTabName.trim() ? colors.primary : '#ccc', color: '#fff', border: `3px solid ${colors.border}`, cursor: newTabName.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}>
                            Create
                        </button>
                    </div>
                </div>
            )}

            {activeTabId && (
                <div className="portfolio-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '2rem' }}>
                    <StockPortfolioSummary summary={summary} summaryDisplayCurrency={summaryDisplayCurrency}
                        onToggleCurrency={() => setSummaryDisplayCurrency(prev => prev === 'ILS' ? 'USD' : 'ILS')} />
                    <WatchlistSection colors={colors} authUser={authUser} authRole={authRole} />
                    <YahooPortfolioSection colors={colors} authUser={authUser} authRole={authRole} />
                    <StockEntryList groupedEntries={groupedEntries} getStockSummary={getStockSummary}
                        stockPrices={stockPrices} priceLoading={priceLoading} loading={loading}
                        onRefreshPrices={fetchStockPrices} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                </div>
            )}

            <StockPortfolioForm
                showForm={form.showForm} showDraftDialog={form.showDraftDialog}
                formData={form.formData} editingEntry={form.editingEntry} isNewStock={form.isNewStock}
                stockNames={stockNames} fetchingHistoricalPrice={form.fetchingHistoricalPrice}
                historicalPriceInfo={form.historicalPriceInfo} error={error} loading={loading}
                onInputChange={form.handleInputChange} onStockNameChange={form.handleStockNameChange}
                onFetchHistoricalPrice={form.handleFetchHistoricalPrice}
                onCloseForm={form.handleCloseForm}
                onForceCloseForm={() => { form.setShowForm(false); setError(null); form.setEditingEntry(null); }}
                onClearError={() => setError(null)} onSubmit={handleSubmit}
                onSaveDraft={handleSaveDraft} onDismissDraft={handleDismissDraft} />
        </div>
    );
};

export default StockPortfolio;
