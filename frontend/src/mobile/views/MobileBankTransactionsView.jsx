import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { THEME, FONT_STACK, BAUHAUS } from '../theme';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import useMobileBankTabs from '../hooks/useMobileBankTabs';
import useMobileBankData from '../hooks/useMobileBankData';
import useDebounce from '../../hooks/useDebounce';
import useMobileBankCRUD from '../hooks/useMobileBankCRUD';
import useMobileBankFilters from '../hooks/useMobileBankFilters';
import MobileBankHeader from '../components/bank/MobileBankHeader';
import MobileBankFilters from '../components/bank/MobileBankFilters';
import MobileBankStats from '../components/bank/MobileBankStats';
import MobileBankTransactionList from '../components/bank/MobileBankTransactionList';
import MobileBankTransactionForm from '../components/bank/MobileBankTransactionForm';

const EMPTY_TRANSACTION = {
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    transaction_type: 'credit'
};

const MobileBankTransactionsView = ({ authUser, authRole, onBack }) => {
    const { tabs, activeTabId, setActiveTabId, tabsLoading, handleCreateTab } =
        useMobileBankTabs(authUser, authRole);

    const {
        transactions, loading, setLoading, error, setError,
        availableMonths, selectedMonth, setSelectedMonth,
        stats, formatMonthYear, fetchTransactions, fetchStats
    } = useMobileBankData(activeTabId);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [newTransaction, setNewTransaction] = useState({ ...EMPTY_TRANSACTION });
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const debouncedSearchTerm = useDebounce(searchTerm, 150);

    const { filteredTransactions, chartData, PIE_COLORS } =
        useMobileBankFilters(transactions, typeFilter, debouncedSearchTerm);

    const { handleSaveTransaction, handleDeleteTransaction } = useMobileBankCRUD({
        activeTabId, editingTransaction, newTransaction,
        setLoading, setError, setShowAddForm, setEditingTransaction,
        setNewTransaction,
        fetchTransactions, fetchStats
    });

    const exportTransactionsCSV = useCallback(async () => {
        if (!activeTabId) return;
        try {
            const params = new URLSearchParams({ tab_id: activeTabId });
            if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
            const response = await fetch(`${API_BASE}/export/transactions/csv?${params}`, { headers: getAuthHeaders() });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            // iOS Safari: use location.href for reliable blob downloads
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS) {
                window.location.href = url;
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${selectedMonth || 'all'}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (err) {
            setError(err.message);
        }
    }, [activeTabId, selectedMonth, setError]);

    const handleOpenEdit = (transaction) => {
        setEditingTransaction(transaction);
        const d = transaction.transaction_date;
        setNewTransaction({
            transaction_date: (d && typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
            description: transaction.description ?? '',
            amount: transaction.amount != null ? String(transaction.amount) : '',
            account_number: transaction.account_number ?? '',
            transaction_type: transaction.transaction_type || 'credit'
        });
        setShowAddForm(true);
    };

    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingTransaction(null);
    };

    const handleOpenAdd = () => {
        setEditingTransaction(null);
        setNewTransaction({ ...EMPTY_TRANSACTION, transaction_date: new Date().toISOString().split('T')[0] });
        setShowAddForm(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
            <MobileBankHeader
                onBack={onBack}
                tabs={tabs}
                activeTabId={activeTabId}
                setActiveTabId={setActiveTabId}
                tabsLoading={tabsLoading}
                handleCreateTab={handleCreateTab}
                exportTransactionsCSV={exportTransactionsCSV}
                hasTransactions={filteredTransactions.length > 0}
            />

            <MobileBankStats
                stats={stats}
                transactions={transactions}
                chartData={chartData}
                PIE_COLORS={PIE_COLORS}
            />

            <MobileBankFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                availableMonths={availableMonths}
                formatMonthYear={formatMonthYear}
            />

            <MobileBankTransactionList
                transactions={transactions}
                filteredTransactions={filteredTransactions}
                loading={loading}
                tabsLoading={tabsLoading}
                activeTabId={activeTabId}
                tabs={tabs}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteTransaction}
            />

            <button
                onClick={handleOpenAdd}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: BAUHAUS.fabSize,
                    height: BAUHAUS.fabSize,
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,122,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            <MobileBankTransactionForm
                showAddForm={showAddForm}
                editingTransaction={editingTransaction}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                loading={loading}
                onSave={handleSaveTransaction}
                onClose={handleCloseForm}
            />
        </div>
    );
};

export default MobileBankTransactionsView;
