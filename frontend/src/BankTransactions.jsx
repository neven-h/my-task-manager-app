import React, { useState } from 'react';
import { BankTransactionProvider, useBankTransactionContext } from './context/BankTransactionContext';
import { getAuthHeaders } from './api.js';
import API_BASE from './config';
import TabBar from './components/TabBar';
import TransactionHeader from './components/transactions/TransactionHeader';
import TransactionMessages from './components/transactions/TransactionMessages';
import TransactionStatsCards from './components/transactions/TransactionStatsCards';
import ExpenseDistributionChart from './components/transactions/ExpenseDistributionChart';
import UploadPreview from './components/transactions/UploadPreview';
import TransactionSidebar from './components/transactions/TransactionSidebar';
import TransactionTable from './components/transactions/TransactionTable';
import AddTransactionModal from './components/transactions/AddTransactionModal';
import CreateFirstTab from './components/transactions/CreateFirstTab';
import TransactionInsights from './components/transactions/TransactionInsights';
import TransactionBalanceForecast from './components/transactions/TransactionBalanceForecast';
import AIAdvisorPanel from './components/transactions/AIAdvisorPanel';
import { TrendingUp, X } from 'lucide-react';

const BankTransactionsInner = () => {
    const {
        tabs, setTabs, activeTabId,
        colors, authUser, authRole,
        handleSwitchTab,
        onTabCreated, onTabDeleted,
        setError,
    } = useBankTransactionContext();
    const [forecastOpen, setForecastOpen] = useState(false);

    return (
        <div style={{
            minHeight: '100vh',
            background: colors.background,
            fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif',
            fontSize: '16px',
            color: colors.text
        }}>
            {/* Mobile Responsive Styles */}
            <style>{`
                .tab-bar::-webkit-scrollbar { height: 3px; }
                .tab-bar::-webkit-scrollbar-thumb { background: #ccc; }
                @media (max-width: 768px) {
                    .bank-header { flex-direction: column !important; padding: 1rem !important; text-align: center; }
                    .bank-header h1 { font-size: 1.3rem !important; }
                    .bank-header-buttons { width: 100%; justify-content: center !important; }
                    .bank-header-buttons button { flex: 1; padding: 0.6rem 0.8rem !important; font-size: 0.85rem !important; }
                    .bank-main { padding: 1rem !important; }
                    .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 0.75rem !important; }
                    .stats-card { padding: 1rem !important; }
                    .stats-card .stat-icon { width: 30px !important; height: 30px !important; }
                    .stats-card .stat-value { font-size: 1.3rem !important; }
                    .stats-card .stat-label { font-size: 0.7rem !important; }
                    .upload-section { padding: 1rem !important; }
                    .type-selector { flex-direction: column !important; }
                    .type-selector button { width: 100% !important; }
                    .filter-section { flex-direction: column !important; gap: 0.75rem !important; }
                    .filter-section input, .filter-section select { width: 100% !important; font-size: 16px !important; }
                    .transactions-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .transactions-table th, .transactions-table td { padding: 8px !important; font-size: 0.8rem !important; white-space: nowrap; }
                    .modal-content { width: 95% !important; max-height: 90vh !important; margin: auto; }
                    .modal-body { padding: 1rem !important; }
                    .modal-body input, .modal-body select { font-size: 16px !important; }
                }
                @media (max-width: 480px) {
                    .stats-grid { grid-template-columns: 1fr !important; }
                    .bank-header h1 { font-size: 1.1rem !important; }
                    .transactions-table th, .transactions-table td { padding: 6px !important; font-size: 0.75rem !important; }
                    .transactions-grid { grid-template-columns: 1fr !important; }
                    .chart-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            <TransactionHeader />

            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                apiBase={API_BASE}
                tabEndpoint="transaction-tabs"
                authUser={authUser}
                authRole={authRole}
                getAuthHeaders={getAuthHeaders}
                colors={colors}
                deleteConfirmMessage={(name) => `Delete "${name}" and all its transactions?`}
                onTabsChanged={(updatedTabs) => setTabs(updatedTabs)}
                onTabCreated={async (newTabId) => { await onTabCreated(newTabId); }}
                onTabDeleted={async (deletedTabId, updatedTabs) => { await onTabDeleted(deletedTabId, updatedTabs); }}
                onTabSwitched={(tabId) => handleSwitchTab(tabId)}
                onError={(msg) => setError(msg)}
            />

            <TransactionMessages />

            <CreateFirstTab />

            {activeTabId && (
                <div className="bank-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '2rem' }}>
                    {/* Expense Forecast trigger button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setForecastOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', border: '2px solid #000',
                                background: '#fff', cursor: 'pointer',
                                fontWeight: 700, fontSize: '0.8rem',
                                fontFamily: '"Inter", "Helvetica Neue", sans-serif',
                            }}
                        >
                            <TrendingUp size={14} />
                            Expense Forecast
                        </button>
                    </div>

                    <AIAdvisorPanel />
                    <TransactionInsights />
                    <TransactionStatsCards />
                    <ExpenseDistributionChart />
                    <UploadPreview />

                    <div className="transactions-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 18rem) 1fr', gap: '1.5rem' }}>
                        <TransactionSidebar />
                        <div>
                            <TransactionTable />
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Forecast side drawer */}
            {forecastOpen && (
                <>
                    {/* Overlay */}
                    <div
                        onClick={() => setForecastOpen(false)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.35)', zIndex: 900,
                        }}
                    />
                    {/* Drawer */}
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: 'min(520px, 92vw)',
                        background: '#fff',
                        borderLeft: '3px solid #000',
                        boxShadow: '-4px 0 0 #000',
                        zIndex: 901,
                        overflowY: 'auto',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        {/* Drawer header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '2px solid #000',
                            background: '#000', color: '#fff', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.92rem' }}>
                                <TrendingUp size={16} />
                                Expense Forecast
                            </div>
                            <button
                                onClick={() => setForecastOpen(false)}
                                style={{
                                    background: 'none', border: 'none', color: '#fff',
                                    cursor: 'pointer', padding: 4, display: 'flex',
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {/* Drawer content */}
                        <div style={{ padding: '1rem', flex: 1 }}>
                            <TransactionBalanceForecast />
                        </div>
                    </div>
                </>
            )}

            <AddTransactionModal />
        </div>
    );
};

const BankTransactions = ({ onBackToTasks, authUser, authRole }) => {
    return (
        <BankTransactionProvider onBackToTasks={onBackToTasks} authUser={authUser} authRole={authRole}>
            <BankTransactionsInner />
        </BankTransactionProvider>
    );
};

export default BankTransactions;
