import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import useBudget from './hooks/useBudget';
import useBudgetTabs from './hooks/useBudgetTabs';
import useBudgetLinks from './hooks/useBudgetLinks';
import useBalanceForecast from './hooks/useBalanceForecast';
import useBudgetStats from './hooks/useBudgetStats';
import useBudgetFilters from './hooks/useBudgetFilters';
import API_BASE from './config';
import { getAuthHeaders } from './api.js';
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
    const { tabs, fetchTabs, createTab, deleteTab, duplicateTab } = useBudgetTabs();
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

    const [fileBalance, setFileBalance]             = useState(null);
    const [fileBalanceEntryDate, setFileBalanceEntryDate] = useState(null);

    const [rangeOpen, setRangeOpen]                 = useState(false);
    const [rangeLoading, setRangeLoading]         = useState(false);
    const [rangeResult, setRangeResult]           = useState(null); // { income_total, expense_total, balance_as_of, ... }
    const [customStart, setCustomStart]           = useState('');
    const [customEnd, setCustomEnd]               = useState('');

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

    useEffect(() => {
        // Range totals depend on the selected end date.
        setRangeResult(null);
    }, [cutoff]);

    useEffect(() => {
        if (!activeTabId || !cutoff) { setFileBalance(null); setFileBalanceEntryDate(null); return; }
        fetch(`${API_BASE}/budget/balance-as-of?${new URLSearchParams({ tab_id: String(activeTabId), date: cutoff })}`, {
            headers: getAuthHeaders(),
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const bal = d?.balance;
                setFileBalance(typeof bal === 'number' ? bal : null);
                setFileBalanceEntryDate(d?.entry_date || null);
            })
            .catch(() => { setFileBalance(null); setFileBalanceEntryDate(null); });
    }, [activeTabId, cutoff]);

    const income  = useMemo(() => tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const outcome = useMemo(() => tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const net        = income - outcome;
    // Prefer the parsed-file balance-as-of (when available). Fall back to forecast/net otherwise.
    const displayBal = (fileBalance ?? (forecast ? forecast.current_balance : net));

    const rangeActive = rangeResult && !rangeResult.error;
    const incomeForSummary = rangeActive ? (rangeResult.income_total ?? income) : income;
    const expenseForSummary = rangeActive ? (rangeResult.expense_total ?? outcome) : outcome;
    const balanceForSummary = rangeActive && rangeResult.balance_as_of != null ? rangeResult.balance_as_of : displayBal;
    const balanceBadgeForSummary = rangeActive ? null : (!fileBalance && forecast && linkedTab ? '＋bank' : null);

    const refreshForecast = useCallback(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);

    const openAdd = (type) => { setEditingEntry(null); setFormInitial(emptyForm(type)); setShowForm(true); setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); };
    const openDuplicate = (entry) => { setEditingEntry(null); setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: today(), category: entry.category || '', notes: entry.notes || '' }); setShowForm(true); setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); };
    const openEdit = (entry) => { setEditingEntry(entry); setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: entry.entry_date, category: entry.category || '', notes: entry.notes || '' }); setShowForm(true); };
    const handleSave = async (data) => { if (editingEntry) { const ok = await updateEntry(editingEntry.id, data); if (ok) { setShowForm(false); setEditingEntry(null); refreshForecast(); } } else { const ok = await createEntry({ ...data, tab_id: activeTabId }); if (ok) { setShowForm(false); refreshForecast(); } } };
    const handleDelete = async (id) => { const ok = await deleteEntry(id); if (ok) refreshForecast(); return ok; };
    const handleCancel  = () => { setShowForm(false); setEditingEntry(null); };
    const handleAddTab  = async () => { const name = newTabName.trim(); if (!name) return; const tab = await createTab(name); if (tab) { setNewTabName(''); setAddingTab(false); } };
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

    const endMinusDays = useCallback((endDateStr, days) => {
        if (!endDateStr) return '';
        const parts = endDateStr.split('-').map(Number);
        if (parts.length !== 3) return '';
        const [y, m, d] = parts;
        const dt = new Date(Date.UTC(y, m - 1, d));
        dt.setUTCDate(dt.getUTCDate() - days);
        return dt.toISOString().slice(0, 10);
    }, []);

    const fetchRange = useCallback(async ({ start, end }) => {
        if (!activeTabId || !start || !end) return;
        setRangeLoading(true);
        setRangeResult(null);
        try {
            const params = new URLSearchParams({ tab_id: String(activeTabId), start, end });
            const res = await fetch(`${API_BASE}/budget/balance-range?${params}`, { headers: getAuthHeaders() });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setRangeResult({ error: data?.error || 'Failed to load range totals' }); return; }
            setRangeResult(data);
        } catch {
            setRangeResult({ error: 'Failed to load range totals' });
        } finally {
            setRangeLoading(false);
        }
    }, [activeTabId]);

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            <BudgetHeader onBackToTasks={onBackToTasks} exportBudgetCSV={exportBudgetCSV} activeTabId={activeTabId} entriesCount={entries.length} openAdd={openAdd} onUpload={() => setShowUpload(true)} />
            <BudgetTabBar tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} confirmDeleteTab={confirmDeleteTab} setConfirmDeleteTab={setConfirmDeleteTab} handleDeleteTab={handleDeleteTab} addingTab={addingTab} setAddingTab={setAddingTab} newTabName={newTabName} setNewTabName={setNewTabName} handleAddTab={handleAddTab} handleDuplicateTab={handleDuplicateTab} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
                {error && <div style={{ background: '#fff0f0', border: `2px solid ${SYS.accent}`, padding: '10px 14px', marginBottom: 16, color: SYS.accent, fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                {showForm && <div id="budget-form"><EntryForm initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} /></div>}
                {activeTabId && <BudgetLinkBanner budgetTabId={activeTabId} linkedTab={linkedTab} linkError={linkError} onSetLink={(txTabId) => setLink(activeTabId, txTabId)} onRemoveLink={() => removeLink(activeTabId)} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light }}>Balance as of</span>
                    <input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)} style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                    <span style={{ fontSize: '0.75rem', color: SYS.light }}>(future entries are dimmed)</span>
                    <button type="button" onClick={() => setRangeOpen(o => !o)}
                        style={{
                            marginLeft: 'auto',
                            padding: '7px 14px',
                            border: `2px solid ${SYS.border}`,
                            background: rangeOpen ? '#f5f5f5' : '#fff',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            borderRadius: 10,
                        }}>
                        {rangeOpen ? 'Hide' : 'Balance Details'}
                    </button>
                </div>

                {rangeOpen && (
                    <div style={{
                        border: '2px solid #e5e7eb',
                        background: '#fafafa',
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 24,
                    }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: '0.75rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Range ending: {cutoff || '—'}
                            </span>
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 7), end: cutoff })}
                                disabled={!cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                                7 days
                            </button>
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 30), end: cutoff })}
                                disabled={!cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                                30 days
                            </button>
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 90), end: cutoff })}
                                disabled={!cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                                90 days
                            </button>
                            <button type="button"
                                onClick={() => { setRangeResult(null); setCustomStart(''); setCustomEnd(''); setRangeOpen(false); }}
                                disabled={rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: rangeLoading ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                                Reset
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Custom:
                                </span>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                    style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                                <span style={{ fontSize: '0.8rem', color: SYS.light, fontWeight: 700 }}>→</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                    style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                            </div>
                            <button type="button"
                                onClick={() => fetchRange({ start: customStart, end: customEnd || cutoff })}
                                disabled={!customStart || rangeLoading || !cutoff}
                                style={{ padding: '7px 14px', border: `2px solid ${SYS.border}`, background: '#0000FF', color: '#fff', cursor: (!customStart || rangeLoading || !cutoff) ? 'not-allowed' : 'pointer', fontWeight: 800, borderRadius: 10 }}>
                                Apply
                            </button>
                        </div>

                        {rangeLoading && (
                            <div style={{ padding: 12, color: SYS.light, fontWeight: 700 }}>
                                Loading…
                            </div>
                        )}

                        {rangeResult && !rangeLoading && (
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {rangeResult.error ? (
                                    <div style={{ color: '#CC0000', fontWeight: 800 }}>{rangeResult.error}</div>
                                ) : (
                                    <>
                                        <div style={{ flex: '1 1 200px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px', borderRadius: 10 }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Income
                                            </div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: SYS.success }}>
                                                +₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.income_total || 0))}
                                            </div>
                                        </div>
                                        <div style={{ flex: '1 1 200px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px', borderRadius: 10 }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Expenses
                                            </div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: SYS.accent }}>
                                                −₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.expense_total || 0))}
                                            </div>
                                        </div>
                                        <div style={{ flex: '1 1 240px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px', borderRadius: 10 }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Balance as of {rangeResult.end_date}
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: (rangeResult.balance_as_of ?? 0) >= 0 ? SYS.primary : SYS.accent }}>
                                                {(rangeResult.balance_as_of ?? 0) >= 0 ? '+' : '−'}₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.balance_as_of || 0))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

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

                {/* Sidebar + entry list */}
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
                        <BudgetEntryList loading={loading} entries={entries} visibleEntries={filters.filtered}
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
