import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import { THEME, FONT_STACK, BAUHAUS } from '../theme';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import useMobileBankTabs from '../hooks/useMobileBankTabs';
import useMobileBankData from '../hooks/useMobileBankData';
import useDebounce from '../../hooks/useDebounce';
import useMobileBankCRUD from '../hooks/useMobileBankCRUD';
import useMobileBankFilters from '../hooks/useMobileBankFilters';
import useMobileTransactionSelection from '../hooks/useMobileTransactionSelection';
import useTransactionBudgetLink from '../../hooks/useTransactionBudgetLink';
import MobileBankHeader from '../components/bank/MobileBankHeader';
import MobileBankFilters from '../components/bank/MobileBankFilters';
import MobileBankStats from '../components/bank/MobileBankStats';
import MobileBankTransactionList from '../components/bank/MobileBankTransactionList';
import MobileBankTransactionForm from '../components/bank/MobileBankTransactionForm';
import MobileBankSelectionBar from '../components/bank/MobileBankSelectionBar';
import MobileBankInsights from '../components/bank/MobileBankInsights';
import MobileBankUpload from '../components/bank/MobileBankUpload';
import MobileTransactionBalanceForecast from '../components/bank/MobileTransactionBalanceForecast';

const EMPTY_TX = {
    transaction_date: new Date().toISOString().split('T')[0],
    description: '', amount: '', account_number: '', transaction_type: 'credit'
};

const MobileBankTransactionsView = ({ authUser, authRole, onBack }) => {
    const { tabs, activeTabId, setActiveTabId, tabsLoading, handleCreateTab } =
        useMobileBankTabs(authUser, authRole);
    const {
        transactions, loading, setLoading, error, setError,
        availableMonths, selectedMonth, setSelectedMonth,
        stats, predictions, predictionsLoading,
        fetchTransactionPredictions, formatMonthYear, fetchTransactions, fetchStats,
        insights, insightsLoading, fetchInsights
    } = useMobileBankData(activeTabId);

    const { budgetLink, fetchBudgetLink } = useTransactionBudgetLink();
    useEffect(() => { fetchBudgetLink(activeTabId); }, [activeTabId, fetchBudgetLink]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [newTransaction, setNewTransaction] = useState({ ...EMPTY_TX });
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 150);

    const { filteredTransactions, chartData, PIE_COLORS } =
        useMobileBankFilters(transactions, typeFilter, debouncedSearch, dateFrom, dateTo, amountMin, amountMax);

    const { handleSaveTransaction, handleDeleteTransaction, handleBatchRename } = useMobileBankCRUD({
        activeTabId, editingTransaction, newTransaction,
        setLoading, setError, setShowAddForm, setEditingTransaction, setNewTransaction,
        fetchTransactions, fetchStats
    });

    const sel = useMobileTransactionSelection(activeTabId, setError, fetchTransactions, fetchStats);

    const exportTransactionsCSV = useCallback(async () => {
        if (!activeTabId) return;
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
            const res = await fetch(`${API_BASE}/export/transactions/csv?${params}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS) { window.location.href = url; }
            else { const a = document.createElement('a'); a.href = url; a.download = `transactions_${selectedMonth || 'all'}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (err) { setError(err.message); }
    }, [activeTabId, selectedMonth, setError]);

    const handleOpenEdit = (t) => {
        setEditingTransaction(t);
        const d = t.transaction_date;
        setNewTransaction({
            transaction_date: (d && typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0]),
            description: t.description ?? '', amount: t.amount != null ? String(t.amount) : '',
            account_number: t.account_number ?? '', transaction_type: t.transaction_type || 'credit'
        });
        setShowAddForm(true);
    };

    const handleOpenAdd = () => {
        setEditingTransaction(null);
        setNewTransaction({ ...EMPTY_TX, transaction_date: new Date().toISOString().split('T')[0] });
        setShowAddForm(true);
    };

    const handleUploadSaved = useCallback((savedTabId) => {
        if (Number(savedTabId) === Number(activeTabId)) {
            fetchTransactions();
            fetchStats();
        } else {
            setActiveTabId(Number(savedTabId));
        }
    }, [activeTabId, fetchTransactions, fetchStats, setActiveTabId]);

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
            <MobileBankHeader onBack={onBack} tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId}
                tabsLoading={tabsLoading} handleCreateTab={handleCreateTab}
                exportTransactionsCSV={exportTransactionsCSV} hasTransactions={filteredTransactions.length > 0}
                budgetLink={budgetLink} />

            {activeTabId && !sel.selectMode && (
                <div style={{ padding: '0 16px', marginBottom: 4 }}>
                    <button onClick={() => setShowUpload(true)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '10px 16px',
                        border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 12,
                        background: '#fafafa', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.85rem', color: THEME.primary,
                        fontFamily: FONT_STACK,
                    }}>
                        <Upload size={16} />
                        Upload CSV / Excel
                    </button>
                </div>
            )}

            <MobileBankStats stats={stats} transactions={transactions} chartData={chartData} PIE_COLORS={PIE_COLORS} />

            <MobileBankFilters
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
                availableMonths={availableMonths} formatMonthYear={formatMonthYear}
                dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
                amountMin={amountMin} setAmountMin={setAmountMin} amountMax={amountMax} setAmountMax={setAmountMax}
                selectMode={sel.selectMode} onToggleSelectMode={sel.selectMode ? sel.exitSelectMode : sel.enterSelectMode}
            />

            {activeTabId && !sel.selectMode && (
                <MobileTransactionBalanceForecast activeTabId={activeTabId} />
            )}

            {activeTabId && !sel.selectMode && (
                <MobileBankInsights
                    insights={insights}
                    onFetch={fetchInsights}
                    loading={insightsLoading}
                />
            )}

            <MobileBankTransactionList
                transactions={transactions} filteredTransactions={filteredTransactions}
                loading={loading} tabsLoading={tabsLoading} activeTabId={activeTabId} tabs={tabs}
                onEdit={handleOpenEdit} onDelete={handleDeleteTransaction}
                selectMode={sel.selectMode} selectedIds={sel.selectedIds} onToggle={sel.toggleSelected}
                onBatchRename={handleBatchRename}
            />

            {!sel.selectMode && (
                <button onClick={handleOpenAdd} style={{
                    position: 'fixed', bottom: '20px', right: '20px',
                    width: BAUHAUS.fabSize, height: BAUHAUS.fabSize, borderRadius: '50%',
                    background: THEME.primary, border: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,122,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 90
                }}>
                    <Plus size={32} color="#fff" strokeWidth={3} />
                </button>
            )}

            {sel.selectMode && (
                <MobileBankSelectionBar
                    count={sel.selectedIds.size} onDelete={sel.deleteSelected} onExport={sel.exportSelected}
                    onSelectAll={() => sel.selectAll(filteredTransactions.map(t => t.id))}
                    allSelected={sel.selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onCancel={sel.exitSelectMode}
                />
            )}

            <MobileBankTransactionForm showAddForm={showAddForm} editingTransaction={editingTransaction}
                newTransaction={newTransaction} setNewTransaction={setNewTransaction}
                loading={loading} onSave={handleSaveTransaction}
                onClose={() => { setShowAddForm(false); setEditingTransaction(null); }} />
            <MobileBankUpload show={showUpload} onClose={() => setShowUpload(false)}
                tabs={tabs} activeTabId={activeTabId} onSaved={handleUploadSaved} />
        </div>
    );
};

export default MobileBankTransactionsView;
