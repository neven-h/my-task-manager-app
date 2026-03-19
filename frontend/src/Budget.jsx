import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import useBudget from './hooks/useBudget';
import useBudgetTabs from './hooks/useBudgetTabs';
import useBudgetLinks from './hooks/useBudgetLinks';
import useBalanceForecast from './hooks/useBalanceForecast';
import useBudgetStats from './hooks/useBudgetStats';
import useBudgetFilters from './hooks/useBudgetFilters';
import useBudgetRange from './hooks/useBudgetRange';
import BudgetLinkBanner from './components/budget/BudgetLinkBanner';
import BalanceForecast from './components/budget/BalanceForecast';
import { SummaryCard } from './components/budget/BudgetSummaryCard';
import { EntryForm } from './components/budget/BudgetEntryForm';
import { ForecastSection } from './components/budget/BudgetForecastSection';
import { BudgetTabBar } from './components/budget/BudgetTabBar';
import { BudgetHeader } from './components/budget/BudgetHeader';
import BudgetUploadModal from './components/budget/BudgetUploadModal';
import { BudgetEntryList } from './components/budget/BudgetEntryList';
import BudgetHealthCard from './components/budget/BudgetHealthCard';
import BudgetExpenseChart from './components/budget/BudgetExpenseChart';
import BudgetMonthlyChart from './components/budget/BudgetMonthlyChart';
import BudgetFilterBar from './components/budget/BudgetFilterBar';
import BudgetSelectionToolbar from './components/budget/BudgetSelectionToolbar';
import BudgetMonthSidebar from './components/budget/BudgetMonthSidebar';
import BudgetRangePanel from './components/budget/BudgetRangePanel';
import BudgetCreateFirstTab from './components/budget/BudgetCreateFirstTab';

const SYS = {
    primary: '#0000FF', success: '#00AA00', accent: '#FF0000',
    bg: '#fff', text: '#000', light: '#666', border: '#000',
};

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = (type = 'income') => ({
    type, description: '', amount: '', entry_date: today(), category: '', notes: '',
});

const Budget = ({ onBackToTasks }) => {
    const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry,
        batchDelete, batchUpdate, getDescriptionHistory, predictions, fetchPredictions, exportBudgetCSV } = useBudget();
    const { tabs, loading: tabsLoading, fetchTabs, createTab, deleteTab, duplicateTab, renameTab } = useBudgetTabs();
    const { linkedTab, linkError, fetchLink, setLink, removeLink } = useBudgetLinks();
    const { forecast, loading: forecastLoading, fetchForecast, clearForecast, lastUpdated, refresh } = useBalanceForecast();

    const [cutoff, setCutoff]                         = useState(today());
    const [activeTabId, setActiveTabId]               = useState(null);
    const [selectedMonth, setSelectedMonth]           = useState(null); // null = all
    const [showForm, setShowForm]                     = useState(false);
    const [editingEntry, setEditingEntry]             = useState(null);
    const [formInitial, setFormInitial]               = useState(emptyForm('income'));
    const [newTabName, setNewTabName]                 = useState('');
    const [addingTab, setAddingTab]                   = useState(false);
    const [confirmDeleteTab, setConfirmDeleteTab]     = useState(null);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);
    const [showUpload, setShowUpload]                 = useState(false);
    const [selectMode, setSelectMode]                 = useState(false);
    const [selectedIds, setSelectedIds]               = useState(new Set());

    const { tabEntries, monthlyTotals, chartData, allCategories, health } = useBudgetStats(entries, cutoff, activeTabId);

    // Month sidebar data: derived from all tab entries (not filtered)
    const monthsData = useMemo(() => {
        const map = {};
        tabEntries.forEach(e => {
            const m = e.entry_date.slice(0, 7);
            if (!map[m]) map[m] = { income: 0, expense: 0, count: 0 };
            map[m].count++;
            if (e.type === 'income') map[m].income += e.amount;
            else map[m].expense += e.amount;
        });
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [tabEntries]);

    // Filter tab entries by selected month before applying search/category filters
    const monthFilteredEntries = useMemo(() =>
        selectedMonth ? tabEntries.filter(e => e.entry_date.slice(0, 7) === selectedMonth) : tabEntries,
        [tabEntries, selectedMonth]);

    const filters = useBudgetFilters(monthFilteredEntries);
    useEffect(() => { fetchEntries(); fetchTabs(); }, [fetchEntries, fetchTabs]);
    // Auto-select first tab, never stay on null when tabs exist
    useEffect(() => { if (!activeTabId && tabs.length > 0) setActiveTabId(tabs[0].id); }, [tabs, activeTabId]);
    useEffect(() => { fetchLink(activeTabId); clearForecast(); setSelectedMonth(null); }, [activeTabId, fetchLink, clearForecast]);
    useEffect(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);
    const income  = useMemo(() => tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const outcome = useMemo(() => tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const { rangeOpen, setRangeOpen, rangeLoading, rangeResult, setRangeResult, customStart, setCustomStart, customEnd, setCustomEnd, endMinusDays, fetchRange, incomeForSummary, expenseForSummary, balanceForSummary, balanceBadgeForSummary } = useBudgetRange(activeTabId, cutoff, income, outcome, forecast, linkedTab);
    const refreshForecast = useCallback(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);

    const openAdd = (type) => { setEditingEntry(null); setFormInitial(emptyForm(type)); setShowForm(true); setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); };
    const openDuplicate = (entry) => { setEditingEntry(null); setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: today(), category: entry.category || '', notes: entry.notes || '' }); setShowForm(true); setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); };
    const openEdit = (entry) => { setEditingEntry(entry); setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: entry.entry_date, category: entry.category || '', notes: entry.notes || '' }); setShowForm(true); };
    const handleSave = async (data) => { if (editingEntry) { const ok = await updateEntry(editingEntry.id, data); if (ok) { setShowForm(false); setEditingEntry(null); refreshForecast(); } } else { const ok = await createEntry({ ...data, tab_id: activeTabId }); if (ok) { setShowForm(false); refreshForecast(); } } };
    const handleDelete = async (id) => { const ok = await deleteEntry(id); if (ok) refreshForecast(); return ok; };
    const handleCancel  = () => { setShowForm(false); setEditingEntry(null); };
    const handleAddTab  = async () => { const name = newTabName.trim(); if (!name) return; const tab = await createTab(name); if (tab) { setNewTabName(''); setAddingTab(false); setActiveTabId(tab.id); } };
    const handleDuplicateTab = async (tabId) => { await duplicateTab(tabId); };
    const handleDeleteTab = async (tabId) => { const ok = await deleteTab(tabId); if (ok && activeTabId === tabId) setActiveTabId(tabs.find(t => t.id !== tabId)?.id ?? null); setConfirmDeleteTab(null); };
    // Clear all entries from the active tab — only deletes from budget_entries, never bank_transactions
    const handleClearTab = useCallback(async () => {
        if (!tabEntries.length) return;
        const ok = await batchDelete(tabEntries.map(e => e.id));
        if (ok) { setSelectedMonth(null); refreshForecast(); }
    }, [tabEntries, batchDelete, refreshForecast]);

    // Clear all entries for a specific month
    const handleClearMonth = useCallback(async (ym) => {
        const ids = tabEntries.filter(e => e.entry_date.slice(0, 7) === ym).map(e => e.id);
        if (!ids.length) return;
        const ok = await batchDelete(ids);
        if (ok && selectedMonth === ym) setSelectedMonth(null);
    }, [tabEntries, batchDelete, selectedMonth]);

    const toggleSelect = useCallback((id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }), []);
    const handleBatchDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ok = await batchDelete([...selectedIds]);
        if (ok) { setSelectedIds(new Set()); setSelectMode(false); refreshForecast(); }
    }, [selectedIds, batchDelete, refreshForecast]);
    const handleBatchUpdate = useCallback(async (fields) => {
        if (selectedIds.size === 0) return;
        const ok = await batchUpdate([...selectedIds], fields);
        if (ok) { setSelectedIds(new Set()); setSelectMode(false); }
    }, [selectedIds, batchUpdate]);
    const selectAll = useCallback((ids) => {
        setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
    }, []);
    const cancelSelection = useCallback(() => { setSelectMode(false); setSelectedIds(new Set()); }, []);
    const handleCreateFirstTab = async (name) => {
        const tab = await createTab(name);
        if (tab) setActiveTabId(tab.id);
        return tab;
    };

    if (!tabsLoading && tabs.length === 0) {
        return (
            <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
                <BudgetHeader onBackToTasks={onBackToTasks} exportBudgetCSV={exportBudgetCSV} activeTabId={null} entriesCount={0} openAdd={openAdd} onUpload={() => {}} />
                <BudgetCreateFirstTab onCreateTab={handleCreateFirstTab} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            <BudgetHeader onBackToTasks={onBackToTasks} exportBudgetCSV={exportBudgetCSV} activeTabId={activeTabId} entriesCount={entries.length} openAdd={openAdd} onUpload={() => setShowUpload(true)} />
            <BudgetTabBar tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} confirmDeleteTab={confirmDeleteTab} setConfirmDeleteTab={setConfirmDeleteTab} handleDeleteTab={handleDeleteTab} addingTab={addingTab} setAddingTab={setAddingTab} newTabName={newTabName} setNewTabName={setNewTabName} handleAddTab={handleAddTab} handleDuplicateTab={handleDuplicateTab} handleRenameTab={renameTab} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
                {error && <div style={{ background: '#fff0f0', border: `2px solid ${SYS.accent}`, padding: '10px 14px', marginBottom: 16, color: SYS.accent, fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                {showForm && <div id="budget-form"><EntryForm initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} /></div>}
                {activeTabId && <BudgetLinkBanner budgetTabId={activeTabId} linkedTab={linkedTab} linkError={linkError} onSetLink={(txTabId) => setLink(activeTabId, txTabId)} onRemoveLink={() => removeLink(activeTabId)} />}

                <BudgetRangePanel rangeOpen={rangeOpen} rangeLoading={rangeLoading} rangeResult={rangeResult} cutoff={cutoff} setCutoff={setCutoff} activeTabId={activeTabId} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} fetchRange={fetchRange} endMinusDays={endMinusDays} setRangeResult={setRangeResult} setRangeOpen={setRangeOpen} />

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <SummaryCard icon={TrendingUp} label="Total Income" amount={incomeForSummary} color={SYS.success} sub="+" />
                    <SummaryCard icon={TrendingDown} label="Total Expenses" amount={expenseForSummary} color={SYS.accent} sub="−" />
                    <SummaryCard icon={Scale} label="Balance"
                        amount={balanceForSummary}
                        color={balanceForSummary >= 0 ? SYS.primary : SYS.accent}
                        sub={balanceForSummary >= 0 ? '+' : '−'}
                        badge={balanceBadgeForSummary} />
                </div>

                <BudgetHealthCard health={health} />
                <BudgetExpenseChart chartData={chartData} />
                <BudgetMonthlyChart monthlyTotals={monthlyTotals} />

                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                    <BudgetMonthSidebar
                        monthsData={monthsData}
                        selectedMonth={selectedMonth}
                        onSelectMonth={(m) => { setSelectedMonth(m); cancelSelection(); }}
                        onClearMonth={handleClearMonth}
                        onClearTab={handleClearTab}
                        tabEntries={tabEntries}
                    />
                    <div>
                        <BudgetFilterBar {...filters} allCategories={allCategories} />
                        {selectMode && <BudgetSelectionToolbar count={selectedIds.size} onDelete={handleBatchDelete} onExport={() => exportBudgetCSV(activeTabId)} onCancel={cancelSelection} onBatchUpdate={handleBatchUpdate} allCategories={allCategories} />}
                        <BudgetEntryList loading={loading} entries={tabEntries} visibleEntries={filters.filtered}
                            typeFilter={filters.typeFilter} setTypeFilter={filters.setTypeFilter} cutoff={cutoff}
                            openEdit={openEdit} openDuplicate={openDuplicate} deleteEntry={handleDelete}
                            expandedDescriptionId={expandedDescriptionId} setExpandedDescriptionId={setExpandedDescriptionId}
                            getDescriptionHistory={getDescriptionHistory}
                            selectMode={selectMode} onToggleSelectMode={() => setSelectMode(m => !m)}
                            selectedIds={selectedIds} toggleSelect={toggleSelect} onSelectAll={selectAll} />
                    </div>
                </div>

                <ForecastSection predictions={predictions} onFetch={() => fetchPredictions(3, activeTabId)} loading={loading} />
                <BalanceForecast forecast={forecast} onFetch={() => fetchForecast(activeTabId, 3)} onRefresh={() => refresh(activeTabId, 3)} loading={forecastLoading} linkedTab={linkedTab} lastUpdated={lastUpdated} />
            </div>
            <BudgetUploadModal show={showUpload} onClose={() => setShowUpload(false)} activeTabId={activeTabId} onComplete={fetchEntries} />
        </div>
    );
};

export default Budget;
