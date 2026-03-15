import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Scale, Plus, FileDown } from 'lucide-react';
import useBudget from '../../hooks/useBudget';
import useBudgetTabs from '../../hooks/useBudgetTabs';
import useBudgetLinks from '../../hooks/useBudgetLinks';
import useBalanceForecast from '../../hooks/useBalanceForecast';
import MobileBudgetLinkBanner from '../components/budget/MobileBudgetLinkBanner';
import MobileBalanceForecast from '../components/budget/MobileBalanceForecast';
import { FONT_STACK } from '../../ios/theme';
import { SummaryCard } from '../components/budget/BudgetSummaryCard';
import { EntrySheet } from '../components/budget/BudgetEntrySheet';
import ForecastSection from '../components/budget/MobileForecastSection';
import { BudgetTabStrip } from '../components/budget/BudgetTabStrip';
import { BudgetDatePicker } from '../components/budget/BudgetDatePicker';
import { BudgetEntryListCard } from '../components/budget/BudgetEntryListCard';

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
        totalIncome, totalOutcome, balance, getDescriptionHistory,
        predictions, fetchPredictions, exportBudgetCSV } = useBudget();

    const { tabs, fetchTabs } = useBudgetTabs();
    const { linkedTab, fetchLink, setLink, removeLink } = useBudgetLinks();
    const { forecast, loading: forecastLoading, fetchForecast, clearForecast } = useBalanceForecast();

    const [activeTabId, setActiveTabId]   = useState(null);
    const [cutoff, setCutoff]             = useState(today());
    const [typeFilter, setTypeFilter]     = useState('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showForm, setShowForm]         = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formInitial, setFormInitial]   = useState(emptyForm('income'));
    const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

    useEffect(() => { fetchEntries(); fetchTabs(); }, [fetchEntries, fetchTabs]);
    useEffect(() => { fetchLink(activeTabId); clearForecast(); }, [activeTabId, fetchLink, clearForecast]);
    useEffect(() => { if (linkedTab && activeTabId) fetchForecast(activeTabId, 3); }, [linkedTab, activeTabId, fetchForecast]);

    const tabEntries = useMemo(() =>
        activeTabId === null ? entries : entries.filter(e => e.tab_id === activeTabId),
        [entries, activeTabId]);

    const income  = useMemo(() =>
        tabEntries.filter(e => e.type === 'income'  && e.entry_date <= cutoff).reduce((s, e) => s + parseFloat(e.amount), 0),
        [tabEntries, cutoff]);
    const outcome = useMemo(() =>
        tabEntries.filter(e => e.type === 'outcome' && e.entry_date <= cutoff).reduce((s, e) => s + parseFloat(e.amount), 0),
        [tabEntries, cutoff]);
    const net        = income - outcome;
    const displayBal = forecast ? forecast.current_balance : net;

    const visibleEntries = useMemo(() =>
        tabEntries.filter(e => typeFilter === 'all' || e.type === typeFilter),
        [tabEntries, typeFilter]);

    const openAdd  = (type) => { setEditingEntry(null); setFormInitial(emptyForm(type)); setShowForm(true); };
    const openEdit = (entry) => {
        setEditingEntry(entry);
        setFormInitial({ type: entry.type, description: entry.description, amount: String(entry.amount),
            entry_date: entry.entry_date, category: entry.category || '', notes: entry.notes || '' });
        setShowForm(true);
    };
    const handleSave = async (data) => {
        const ok = editingEntry ? await updateEntry(editingEntry.id, data) : await createEntry({ ...data, tab_id: activeTabId });
        if (ok) { setShowForm(false); setEditingEntry(null); }
    };
    const handleCancel = () => { setShowForm(false); setEditingEntry(null); };

    return (
        <div style={{ minHeight: '100vh', background: IOS.bg, fontFamily: FONT_STACK, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>

            {/* Sticky header */}
            <div style={{ background: IOS.card, borderBottom: `0.5px solid ${IOS.separator}`,
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', paddingBottom: 12,
                paddingLeft: 8, paddingRight: 8, position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={22} color={IOS.blue} />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>Budget Planner</h1>
                    <button onClick={() => exportBudgetCSV()} disabled={entries.length === 0}
                        style={{ background: 'none', border: 'none', padding: '10px', cursor: entries.length === 0 ? 'default' : 'pointer',
                            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: entries.length === 0 ? 0.3 : 1 }}>
                        <FileDown size={20} color={IOS.blue} />
                    </button>
                </div>
            </div>

            <BudgetTabStrip tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} />

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

            <BudgetEntryListCard
                visibleEntries={visibleEntries} loading={loading} entries={entries}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter} cutoff={cutoff}
                openEdit={openEdit} deleteEntry={deleteEntry}
                expandedDescriptionId={expandedDescriptionId}
                setExpandedDescriptionId={setExpandedDescriptionId}
                getDescriptionHistory={getDescriptionHistory}
            />

            <ForecastSection predictions={predictions} onFetch={() => fetchPredictions(3, activeTabId)} loading={loading} />

            <MobileBalanceForecast forecast={forecast} onFetch={() => fetchForecast(activeTabId, 3)}
                loading={forecastLoading} linkedTab={linkedTab} />

            {showForm && (
                <EntrySheet initial={formInitial} onSave={handleSave} onCancel={handleCancel} loading={loading} />
            )}
        </div>
    );
};

export default MobileBudgetView;
