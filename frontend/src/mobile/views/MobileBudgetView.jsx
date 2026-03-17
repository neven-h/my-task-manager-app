import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Scale, Plus, FileDown, Upload } from 'lucide-react';
import useBudget from '../../hooks/useBudget';
import useBudgetTabs from '../../hooks/useBudgetTabs';
import useBudgetLinks from '../../hooks/useBudgetLinks';
import useBalanceForecast from '../../hooks/useBalanceForecast';
import useBudgetStats from '../../hooks/useBudgetStats';
import useBudgetFilters from '../../hooks/useBudgetFilters';
import MobileBudgetLinkBanner from '../components/budget/MobileBudgetLinkBanner';
import MobileBalanceForecast from '../components/budget/MobileBalanceForecast';
import { FONT_STACK } from '../../ios/theme';
import { SummaryCard } from '../components/budget/BudgetSummaryCard';
import { EntrySheet } from '../components/budget/BudgetEntrySheet';
import ForecastSection from '../components/budget/MobileForecastSection';
import { BudgetTabStrip } from '../components/budget/BudgetTabStrip';
import { BudgetDatePicker } from '../components/budget/BudgetDatePicker';
import { BudgetEntryListCard } from '../components/budget/BudgetEntryListCard';
import MobileBudgetUploadFlow from '../components/budget/MobileBudgetUploadFlow';
import MobileBudgetHealthCard from '../components/budget/MobileBudgetHealthCard';
import MobileBudgetExpenseChart from '../components/budget/MobileBudgetExpenseChart';
import MobileBudgetMonthlyChart from '../components/budget/MobileBudgetMonthlyChart';
import MobileBudgetFilters from '../components/budget/MobileBudgetFilters';
import MobileBudgetSelectionBar from '../components/budget/MobileBudgetSelectionBar';

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF',
    muted: '#8E8E93', label: '#3C3C43', radius: 16,
};

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = (type = 'income') => ({
    type, description: '', amount: '', entry_date: today(), category: '', notes: '',
});

const MobileBudgetView = ({ onBack }) => {
    const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry,
        batchDelete, getDescriptionHistory,
        predictions, fetchPredictions, exportBudgetCSV } = useBudget();

    const { tabs, fetchTabs, deleteTab } = useBudgetTabs();
    const { linkedTab, fetchLink, setLink, removeLink } = useBudgetLinks();
    const { forecast, loading: forecastLoading, fetchForecast, clearForecast, lastUpdated, refresh } = useBalanceForecast();

    const [activeTabId, setActiveTabId]   = useState(null);
    const [cutoff, setCutoff]             = useState(today());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showForm, setShowForm]         = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formInitial, setFormInitial]   = useState(emptyForm('income'));
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirmDeleteTab, setConfirmDeleteTab] = useState(null);
    const [confirmClearTab, setConfirmClearTab]   = useState(false);

    const { tabEntries, monthlyTotals, chartData, allCategories, health } = useBudgetStats(entries, cutoff, activeTabId);
    const filters = useBudgetFilters(tabEntries);

    const handleDeleteTab = useCallback(async (tabId) => {
        const ok = await deleteTab(tabId);
        if (ok && activeTabId === tabId) setActiveTabId(null);
        setConfirmDeleteTab(null);
    }, [deleteTab, activeTabId]);

    const handleClearTab = useCallback(async () => {
        const manualEntries = tabEntries.filter(e => !e.source || e.source === 'manual');
        if (!manualEntries.length) return;
        const ok = await batchDelete(manualEntries.map(e => e.id));
        if (ok) { setConfirmClearTab(false); if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }
    }, [tabEntries, batchDelete, linkedTab, activeTabId, fetchForecast]);

    useEffect(() => { fetchEntries(); fetchTabs(); }, [fetchEntries, fetchTabs]);
    useEffect(() => { if (!activeTabId && tabs.length > 0) setActiveTabId(tabs[0].id); }, [tabs, activeTabId]);
    useEffect(() => { fetchLink(activeTabId); clearForecast(); }, [activeTabId, fetchLink, clearForecast]);
    useEffect(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);

    const income  = useMemo(() =>
        tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + parseFloat(e.amount), 0),
        [tabEntries, cutoff]);
    const outcome = useMemo(() =>
        tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + parseFloat(e.amount), 0),
        [tabEntries, cutoff]);
    const net        = income - outcome;
    const displayBal = forecast ? forecast.current_balance : net;

    const refreshForecast = () => {
        if (linkedTab && activeTabId) fetchForecast(activeTabId, 3);
    };

    const openAdd  = (type) => { setEditingEntry(null); setFormInitial(emptyForm(type)); setShowForm(true); };
    const openEdit = (entry) => {
        setEditingEntry(entry);
        setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount),
            entry_date: entry.entry_date, category: entry.category || '', notes: entry.notes || '' });
        setShowForm(true);
    };
    const handleSave = async (data) => {
        const ok = editingEntry ? await updateEntry(editingEntry.id, data) : await createEntry({ ...data, tab_id: activeTabId });
        if (ok) { setShowForm(false); setEditingEntry(null); refreshForecast(); }
    };
    const handleCancel = () => { setShowForm(false); setEditingEntry(null); };
    const handleDelete = async (id) => {
        const ok = await deleteEntry(id);
        if (ok) refreshForecast();
        return ok;
    };

    const toggleSelect = useCallback((id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }), []);
    const handleBatchDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ok = await batchDelete([...selectedIds]);
        if (ok) { setSelectedIds(new Set()); setSelectMode(false); refreshForecast(); }
    }, [selectedIds, batchDelete]);
    const cancelSelection = useCallback(() => { setSelectMode(false); setSelectedIds(new Set()); }, []);

    return (
        <div style={{ minHeight: '100vh', background: IOS.bg, fontFamily: FONT_STACK, paddingBottom: selectMode ? 'calc(env(safe-area-inset-bottom, 0px) + 140px)' : 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>

            {/* Sticky header */}
            <div style={{ background: IOS.card, borderBottom: `0.5px solid ${IOS.separator}`,
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', paddingBottom: 12,
                paddingLeft: 8, paddingRight: 8, position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px 44px', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={22} color={IOS.blue} />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>Budget Planner</h1>
                    <button onClick={() => setSelectMode(m => !m)}
                        style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: selectMode ? IOS.red : IOS.blue, fontWeight: 600, fontSize: '0.78rem' }}>
                        {selectMode ? 'Done' : 'Select'}
                    </button>
                    <button onClick={() => exportBudgetCSV()} disabled={entries.length === 0}
                        style={{ background: 'none', border: 'none', padding: '10px', cursor: entries.length === 0 ? 'default' : 'pointer',
                            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: entries.length === 0 ? 0.3 : 1 }}>
                        <FileDown size={20} color={IOS.blue} />
                    </button>
                </div>
            </div>

            <BudgetTabStrip tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} confirmDeleteTab={confirmDeleteTab} setConfirmDeleteTab={setConfirmDeleteTab} handleDeleteTab={handleDeleteTab} />

            {/* Clear-tab action strip */}
            {activeTabId !== null && tabEntries.length > 0 && (() => {
                const manualCount = tabEntries.filter(e => !e.source || e.source === 'manual').length;
                const uploadCount = tabEntries.length - manualCount;
                return (
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
                    padding: '6px 16px', borderBottom: `0.5px solid ${IOS.separator}`,
                    background: IOS.card,
                }}>
                    {confirmClearTab ? (
                        <>
                            <span style={{ fontSize: '0.72rem', color: IOS.muted, fontWeight: 500, flexShrink: 1 }}>
                                Delete {manualCount} manual {manualCount === 1 ? 'entry' : 'entries'}?
                                {uploadCount > 0 && <span style={{ fontSize: '0.68rem' }}> ({uploadCount} imported kept)</span>}
                            </span>
                            <button type="button" onClick={handleClearTab} disabled={loading || manualCount === 0}
                                style={{ padding: '5px 14px', borderRadius: 20, border: 'none', background: IOS.red, color: '#fff', fontWeight: 600, fontSize: '0.78rem', cursor: manualCount === 0 ? 'not-allowed' : 'pointer', fontFamily: FONT_STACK, opacity: manualCount === 0 ? 0.5 : 1, flexShrink: 0 }}>
                                {loading ? '…' : 'Clear'}
                            </button>
                            <button type="button" onClick={() => setConfirmClearTab(false)}
                                style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: IOS.separator, color: IOS.muted, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: FONT_STACK, flexShrink: 0 }}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setConfirmClearTab(true)}
                            style={{ padding: '4px 12px', borderRadius: 20, border: 'none', background: 'none', color: IOS.muted, fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer', fontFamily: FONT_STACK }}>
                            Clear tab
                        </button>
                    )}
                </div>
                );
            })()}

            {activeTabId && (
                <div style={{ padding: '0 16px', marginBottom: 4 }}>
                    <button onClick={() => setShowUpload(true)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '10px 16px',
                        border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 12,
                        background: '#fafafa', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.85rem', color: IOS.blue,
                        fontFamily: FONT_STACK,
                    }}>
                        <Upload size={16} />
                        Upload Budget File
                    </button>
                </div>
            )}

            <div style={{ padding: '16px 16px 0' }}>
                {error && (
                    <div style={{ background: '#FFE5E5', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#CC0000', fontSize: '0.82rem' }}>
                        {error}
                    </div>
                )}

                <BudgetDatePicker cutoff={cutoff} setCutoff={setCutoff} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker} />

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <SummaryCard icon={TrendingUp}   label="Income"   amount={income}  color={IOS.green} sign="+" />
                    <SummaryCard icon={TrendingDown} label="Expenses" amount={outcome} color={IOS.red}   sign="−" />
                    <SummaryCard icon={Scale}        label="Balance"  amount={displayBal}
                        color={displayBal >= 0 ? IOS.blue : IOS.red} sign={displayBal >= 0 ? '+' : '−'}
                        badge={forecast && linkedTab ? '＋bank' : null} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: activeTabId ? 12 : 16 }}>
                    <button onClick={() => openAdd('income')}
                        style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 12, background: IOS.green,
                            color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: FONT_STACK,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={16} /> Income
                    </button>
                    <button onClick={() => openAdd('outcome')}
                        style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 12, background: IOS.red,
                            color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: FONT_STACK,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={16} /> Expense
                    </button>
                </div>
            </div>

            {activeTabId && (
                <MobileBudgetLinkBanner budgetTabId={activeTabId} linkedTab={linkedTab}
                    onSetLink={(txTabId) => setLink(activeTabId, txTabId)}
                    onRemoveLink={() => removeLink(activeTabId)} />
            )}

            <MobileBudgetHealthCard health={health} />
            <MobileBudgetExpenseChart chartData={chartData} />
            <MobileBudgetMonthlyChart monthlyTotals={monthlyTotals} />

            <MobileBudgetFilters {...filters} allCategories={allCategories} />

            <BudgetEntryListCard
                visibleEntries={filters.filtered} loading={loading} entries={entries}
                typeFilter={filters.typeFilter} setTypeFilter={filters.setTypeFilter} cutoff={cutoff}
                openEdit={openEdit} deleteEntry={handleDelete}
                expandedDescriptionId={expandedDescriptionId}
                setExpandedDescriptionId={setExpandedDescriptionId}
                getDescriptionHistory={getDescriptionHistory}
                selectMode={selectMode} selectedIds={selectedIds} toggleSelect={toggleSelect}
            />

            <ForecastSection predictions={predictions} onFetch={() => fetchPredictions(3, activeTabId)} loading={loading} />

            <MobileBalanceForecast forecast={forecast} onFetch={() => fetchForecast(activeTabId, 3)}
                onRefresh={() => refresh(activeTabId, 3)} loading={forecastLoading} linkedTab={linkedTab} lastUpdated={lastUpdated} />

            {showForm && (
                <EntrySheet initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} />
            )}

            <MobileBudgetUploadFlow isOpen={showUpload} onClose={() => setShowUpload(false)}
                activeTabId={activeTabId} onComplete={fetchEntries} />

            {selectMode && <MobileBudgetSelectionBar count={selectedIds.size} onDelete={handleBatchDelete} onExport={() => exportBudgetCSV(activeTabId)} onCancel={cancelSelection} />}
        </div>
    );
};

export default MobileBudgetView;
