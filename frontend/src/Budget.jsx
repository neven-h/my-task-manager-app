import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import useBudget from './hooks/useBudget';
import useBudgetTabs from './hooks/useBudgetTabs';
import useBudgetLinks from './hooks/useBudgetLinks';
import useBalanceForecast from './hooks/useBalanceForecast';
import BudgetLinkBanner from './components/budget/BudgetLinkBanner';
import BalanceForecast from './components/budget/BalanceForecast';
import { SummaryCard } from './components/budget/BudgetSummaryCard';
import { EntryForm } from './components/budget/BudgetEntryForm';
import { ForecastSection } from './components/budget/BudgetForecastSection';
import { BudgetTabBar } from './components/budget/BudgetTabBar';
import { BudgetHeader } from './components/budget/BudgetHeader';
import BudgetUploadModal from './components/budget/BudgetUploadModal';
import { BudgetEntryList } from './components/budget/BudgetEntryList';

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
        getDescriptionHistory, predictions, fetchPredictions, exportBudgetCSV } = useBudget();
    const { tabs, fetchTabs, createTab, deleteTab } = useBudgetTabs();
    const { linkedTab, fetchLink, setLink, removeLink } = useBudgetLinks();
    const { forecast, loading: forecastLoading, fetchForecast, clearForecast } = useBalanceForecast();

    const [cutoff, setCutoff]                         = useState(today());
    const [typeFilter, setTypeFilter]                 = useState('all');
    const [activeTabId, setActiveTabId]               = useState(null);
    const [showForm, setShowForm]                     = useState(false);
    const [editingEntry, setEditingEntry]             = useState(null);
    const [formInitial, setFormInitial]               = useState(emptyForm('income'));
    const [newTabName, setNewTabName]                 = useState('');
    const [addingTab, setAddingTab]                   = useState(false);
    const [confirmDeleteTab, setConfirmDeleteTab]     = useState(null);
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);
    const [showUpload, setShowUpload] = useState(false);

    useEffect(() => { fetchEntries(); fetchTabs(); }, [fetchEntries, fetchTabs]);
    useEffect(() => { fetchLink(activeTabId); clearForecast(); }, [activeTabId, fetchLink, clearForecast]);
    useEffect(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);

    const tabEntries = useMemo(() =>
        activeTabId === null ? entries : entries.filter(e => e.tab_id === activeTabId),
        [entries, activeTabId]);

    const income  = useMemo(() => tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const outcome = useMemo(() => tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + e.amount, 0), [tabEntries, cutoff]);
    const net     = income - outcome;

    const visibleEntries = useMemo(() =>
        tabEntries.filter(e => typeFilter === 'all' || e.type === typeFilter),
        [tabEntries, typeFilter]);

    const openAdd = (type) => {
        setEditingEntry(null); setFormInitial(emptyForm(type)); setShowForm(true);
        setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };
    const openDuplicate = (entry) => {
        setEditingEntry(null);
        setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: today(), category: entry.category || '', notes: entry.notes || '' });
        setShowForm(true);
        setTimeout(() => document.getElementById('budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };
    const openEdit = (entry) => {
        setEditingEntry(entry);
        setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount), entry_date: entry.entry_date, category: entry.category || '', notes: entry.notes || '' });
        setShowForm(true);
    };
    const handleSave = async (data) => {
        if (editingEntry) {
            const ok = await updateEntry(editingEntry.id, data);
            if (ok) { setShowForm(false); setEditingEntry(null); }
        } else {
            const ok = await createEntry({ ...data, tab_id: activeTabId });
            if (ok) setShowForm(false);
        }
    };
    const handleCancel  = () => { setShowForm(false); setEditingEntry(null); };
    const handleAddTab  = async () => {
        const name = newTabName.trim(); if (!name) return;
        const tab = await createTab(name);
        if (tab) { setNewTabName(''); setAddingTab(false); setActiveTabId(tab.id); }
    };
    const handleDeleteTab = async (tabId) => {
        const ok = await deleteTab(tabId);
        if (ok && activeTabId === tabId) setActiveTabId(null);
        setConfirmDeleteTab(null);
    };

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            <BudgetHeader onBackToTasks={onBackToTasks} exportBudgetCSV={exportBudgetCSV} activeTabId={activeTabId} entriesCount={entries.length} openAdd={openAdd} onUpload={() => setShowUpload(true)} />
            <BudgetTabBar tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} confirmDeleteTab={confirmDeleteTab} setConfirmDeleteTab={setConfirmDeleteTab} handleDeleteTab={handleDeleteTab} addingTab={addingTab} setAddingTab={setAddingTab} newTabName={newTabName} setNewTabName={setNewTabName} handleAddTab={handleAddTab} />

            <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px' }}>
                {error && (
                    <div style={{ background: '#fff0f0', border: `2px solid ${SYS.accent}`, padding: '10px 14px', marginBottom: 16, color: SYS.accent, fontSize: '0.85rem', fontWeight: 600 }}>
                        {error}
                    </div>
                )}
                {showForm && (
                    <div id="budget-form">
                        <EntryForm initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} />
                    </div>
                )}
                {activeTabId && (
                    <BudgetLinkBanner budgetTabId={activeTabId} linkedTab={linkedTab} onSetLink={(txTabId) => setLink(activeTabId, txTabId)} onRemoveLink={() => removeLink(activeTabId)} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light }}>Balance as of</span>
                    <input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)}
                        style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                    <span style={{ fontSize: '0.75rem', color: SYS.light }}>(future entries are dimmed)</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <SummaryCard icon={TrendingUp}   label="Total Income"   amount={income}  color={SYS.success} sub="+" />
                    <SummaryCard icon={TrendingDown} label="Total Expenses" amount={outcome} color={SYS.accent}  sub="−" />
                    <SummaryCard icon={Scale}        label="Balance"        amount={net}     color={net >= 0 ? SYS.primary : SYS.accent} sub={net >= 0 ? '+' : '−'} />
                </div>
                <BudgetEntryList loading={loading} entries={entries} visibleEntries={visibleEntries} typeFilter={typeFilter} setTypeFilter={setTypeFilter} cutoff={cutoff} openEdit={openEdit} openDuplicate={openDuplicate} deleteEntry={deleteEntry} expandedDescriptionId={expandedDescriptionId} setExpandedDescriptionId={setExpandedDescriptionId} getDescriptionHistory={getDescriptionHistory} />
                <ForecastSection predictions={predictions} onFetch={() => fetchPredictions(3, activeTabId)} loading={loading} />
                <BalanceForecast forecast={forecast} onFetch={() => fetchForecast(activeTabId, 3)} loading={forecastLoading} linkedTab={linkedTab} />
            </div>
            <BudgetUploadModal show={showUpload} onClose={() => setShowUpload(false)} activeTabId={activeTabId} onComplete={fetchEntries} />
        </div>
    );
};

export default Budget;
