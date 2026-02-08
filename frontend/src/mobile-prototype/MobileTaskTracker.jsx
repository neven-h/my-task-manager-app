import React, {useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    CheckCircle,
    Circle,
    Edit2,
    Trash2,
    X,
    Calendar,
    Clock,
    Tag,
    DollarSign,
    Users,
    Menu,
    LogOut,
    Download,
    Upload,
    RefreshCw,
    Copy,
    AlertCircle,
    BarChart3,
    Settings,
    ArrowLeft,
    Share2,
    TrendingUp,
    TrendingDown,
    PieChart,
    Banknote,
    CreditCard,
    MoreVertical,
    Save,
    FileDown
} from 'lucide-react';
import CustomAutocomplete from '../components/CustomAutocomplete';
import API_BASE from '../config';
import { formatCurrency, formatCurrencyWithCode } from '../utils/formatCurrency';

// Mobile Stats View Component
const MobileStatsView = ({authUser, authRole, onBack}) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_BASE}/stats?username=${authUser}&role=${authRole}`);
                if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [authUser, authRole]);

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: 'Inter, system-ui, sans-serif'}}>
            {/* Header */}
            <div style={{background: '#fff', borderBottom: '3px solid #000', padding: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        STATS
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : stats ? (
                    <>
                        {/* Completion Rate */}
                        <div style={{
                            background: '#f8f8f8',
                            border: '3px solid #000',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}>
                                Completion Rate
                            </h3>
                            <div style={{fontSize: '2rem', fontWeight: 900}}>
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </div>
                            <div style={{color: '#666', fontSize: '0.85rem', marginTop: '8px'}}>
                                {stats.done_count || 0} of {stats.total_tasks || 0} tasks completed
                            </div>
                        </div>

                        {/* Total Hours */}
                        <div style={{
                            background: '#FFD500',
                            border: '3px solid #000',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}>
                                Total Hours
                            </h3>
                            <div style={{fontSize: '2rem', fontWeight: 900}}>
                                {stats.total_hours?.toFixed(1) || 0}h
                            </div>
                        </div>

                        {/* Revenue */}
                        {stats.total_revenue !== undefined && (
                            <div style={{
                                background: '#0000FF',
                                color: '#fff',
                                border: '3px solid #000',
                                padding: '20px',
                                marginBottom: '16px'
                            }}>
                                <h3 style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    marginBottom: '12px'
                                }}>
                                    Total Revenue
                                </h3>
                                <div style={{fontSize: '2rem', fontWeight: 900}}>
                                    ₪{stats.total_revenue?.toFixed(2) || 0}
                                </div>
                            </div>
                        )}

                        {/* Task Breakdown */}
                        <div style={{background: '#fff', border: '3px solid #000', padding: '20px'}}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '16px'
                            }}>
                                Task Breakdown
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Active Tasks</span>
                                    <span style={{fontWeight: 700}}>{stats.active_count || 0}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Completed</span>
                                    <span style={{fontWeight: 700}}>{stats.done_count || 0}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Total</span>
                                    <span style={{fontWeight: 700}}>{stats.total_tasks || 0}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{textAlign: 'center', padding: '40px'}}>No stats available</div>
                )}
            </div>
        </div>
    );
};

// Mobile Bank Transactions View Component
const MobileBankTransactionsView = ({authUser, authRole, onBack}) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [stats, setStats] = useState(null);
    const [newTransaction, setNewTransaction] = useState({
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        account_number: '',
        transaction_type: 'credit'
    });

    useEffect(() => {
        fetchTabs();
    }, []);

    useEffect(() => {
        if (activeTabId !== null) {
            fetchTransactions();
            fetchStats();
        }
    }, [activeTabId]);

    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs?username=${authUser}&role=${authRole}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setTabs(data);
                if (data.length > 0 && !activeTabId) {
                    setActiveTabId(data[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/transactions?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`);
            const data = await response.json();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/stats?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`);
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const handleSaveTransaction = async () => {
        try {
            setLoading(true);
            const url = editingTransaction
                ? `${API_BASE}/transactions/${editingTransaction.id}?username=${authUser}&role=${authRole}`
                : `${API_BASE}/transactions?username=${authUser}&role=${authRole}`;
            const method = editingTransaction ? 'PUT' : 'POST';
            
            const body = {
                ...newTransaction,
                tab_id: activeTabId,
                amount: parseFloat(newTransaction.amount)
            };

            const response = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchTransactions();
                await fetchStats();
                setShowAddForm(false);
                setEditingTransaction(null);
                setNewTransaction({
                    transaction_date: new Date().toISOString().split('T')[0],
                    description: '',
                    amount: '',
                    account_number: '',
                    transaction_type: 'credit'
                });
            }
        } catch (err) {
            setError('Failed to save transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await fetch(`${API_BASE}/transactions/${id}?username=${authUser}&role=${authRole}`, {
                method: 'DELETE'
            });
            await fetchTransactions();
            await fetchStats();
        } catch (err) {
            setError('Failed to delete transaction');
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        BANK TRANSACTIONS
                    </h1>
                </div>

                {/* Tabs */}
                {tabs.length > 0 && (
                    <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px'}}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                style={{
                                    padding: '8px 16px',
                                    border: '3px solid #000',
                                    background: activeTabId === tab.id ? THEME.primary : '#fff',
                                    color: activeTabId === tab.id ? '#fff' : '#000',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            {stats && stats.by_type && (
                <div style={{padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    {stats.by_type.map(stat => (
                        <div key={stat.transaction_type} style={{
                            border: '3px solid #000',
                            padding: '16px',
                            background: '#fff',
                            textAlign: 'center'
                        }}>
                            <div style={{fontSize: '1.5rem', fontWeight: 900, marginBottom: '4px'}}>
                                {formatCurrency(stat.total_amount || 0)}
                            </div>
                            <div style={{fontSize: '0.75rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase'}}>
                                {stat.transaction_type === 'cash' ? '💵 Cash' : '💳 Credit'}
                            </div>
                            <div style={{fontSize: '0.7rem', color: THEME.muted, marginTop: '4px'}}>
                                {stat.transaction_count} transactions
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div style={{padding: '0 16px 16px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '10px',
                        border: '3px solid #000',
                        fontSize: '0.9rem'
                    }}
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                        padding: '10px',
                        border: '3px solid #000',
                        fontSize: '0.9rem',
                        fontWeight: 700
                    }}
                >
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                </select>
            </div>

            {/* Transactions List */}
            <div style={{padding: '0 16px 16px 16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No transactions found
                    </div>
                ) : (
                    filteredTransactions.map(transaction => (
                        <div
                            key={transaction.id}
                            style={{
                                border: '3px solid #000',
                                padding: '16px',
                                marginBottom: '12px',
                                background: '#fff'
                            }}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px'}}>
                                <div style={{flex: 1}}>
                                    <div style={{fontSize: '1rem', fontWeight: 800, marginBottom: '4px'}}>
                                        {transaction.description}
                                    </div>
                                    <div style={{fontSize: '0.8rem', color: THEME.muted, display: 'flex', gap: '12px', alignItems: 'center'}}>
                                        <span>{new Date(transaction.transaction_date).toLocaleDateString('en-GB')}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            border: '2px solid #000',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: transaction.transaction_type === 'cash' ? THEME.secondary : THEME.primary,
                                            color: '#000'
                                        }}>
                                            {transaction.transaction_type}
                                        </span>
                                    </div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{
                                        fontSize: '1.3rem',
                                        fontWeight: 900,
                                        color: transaction.amount < 0 ? THEME.accent : THEME.text
                                    }}>
                                        {formatCurrency(transaction.amount)}
                                    </div>
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                                <button
                                    onClick={() => {
                                        setEditingTransaction(transaction);
                                        setNewTransaction({
                                            transaction_date: transaction.transaction_date.split('T')[0],
                                            description: transaction.description,
                                            amount: transaction.amount.toString(),
                                            account_number: transaction.account_number || '',
                                            transaction_type: transaction.transaction_type
                                        });
                                        setShowAddForm(true);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: '2px solid #000',
                                        background: THEME.primary,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Edit2 size={14} style={{display: 'inline', marginRight: '4px'}}/>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    style={{
                                        padding: '8px',
                                        border: '2px solid #000',
                                        background: THEME.accent,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Transaction Button */}
            <button
                onClick={() => {
                    setEditingTransaction(null);
                    setNewTransaction({
                        transaction_date: new Date().toISOString().split('T')[0],
                        description: '',
                        amount: '',
                        account_number: '',
                        transaction_type: 'credit'
                    });
                    setShowAddForm(true);
                }}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddForm(false);
                            setEditingTransaction(null);
                        }
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '80vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        padding: '20px',
                        overflowY: 'auto'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
                            </h2>
                            <button onClick={() => {
                                setShowAddForm(false);
                                setEditingTransaction(null);
                            }} style={{background: 'none', border: 'none', padding: '8px'}}>
                                <X size={28}/>
                            </button>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={newTransaction.transaction_date}
                                    onChange={(e) => setNewTransaction({...newTransaction, transaction_date: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newTransaction.description}
                                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTransaction.amount}
                                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Type
                                </label>
                                <select
                                    value={newTransaction.transaction_type}
                                    onChange={(e) => setNewTransaction({...newTransaction, transaction_type: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                >
                                    <option value="credit">Credit</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                            <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingTransaction(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveTransaction}
                                    disabled={loading || !newTransaction.description || !newTransaction.amount}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: THEME.primary,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        opacity: (loading || !newTransaction.description || !newTransaction.amount) ? 0.5 : 1
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Mobile Stock Portfolio View Component
const PORTFOLIO_DRAFT_STORAGE_KEY = 'mobile_portfolio_entry_draft';

const MobileStockPortfolioView = ({authUser, authRole, onBack}) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [stockNames, setStockNames] = useState([]);
    const [stockPrices, setStockPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        ticker_symbol: '',
        percentage: '',
        value_ils: '',
        base_price: '',
        entry_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        units: 1
    });

    // Prevent body scroll when form is open
    useEffect(() => {
        if (showForm) {
            const originalOverflow = window.getComputedStyle(document.body).overflow;
            const originalPosition = window.getComputedStyle(document.body).position;
            const originalWidth = window.getComputedStyle(document.body).width;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                document.body.style.width = originalWidth;
            };
        }
    }, [showForm]);

    useEffect(() => {
        fetchTabs();
    }, []);

    useEffect(() => {
        if (activeTabId !== null) {
            fetchEntries();
            fetchSummary();
            fetchStockNames();
        }
    }, [activeTabId]);

    useEffect(() => {
        if (activeTabId !== null && entries.length > 0) {
            fetchStockPrices();
            const interval = setInterval(fetchStockPrices, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [activeTabId, entries]);

    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio-tabs?username=${authUser}&role=${authRole}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setTabs(data);
                if (data.length > 0) {
                    setActiveTabId(prev => (prev !== null ? prev : data[0].id));
                } else {
                    // Create default tab so new entries always have a tab
                    const createRes = await fetch(`${API_BASE}/portfolio-tabs`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ name: 'Default', username: authUser })
                    });
                    if (createRes.ok) {
                        const newTab = await createRes.json();
                        const id = newTab.id ?? newTab.tab_id;
                        if (id) {
                            setTabs([{ id, name: 'Default' }]);
                            setActiveTabId(id);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        }
    };

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/portfolio?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`);
            const data = await response.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching entries:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/summary?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`);
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            console.error('Error fetching summary:', err);
        }
    };

    const fetchStockNames = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/names?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`);
            const data = await response.json();
            setStockNames(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching stock names:', err);
        }
    };

    const fetchStockPrices = async () => {
        if (!activeTabId || entries.length === 0) return;
        
        try {
            setPriceLoading(true);
            // Get unique ticker symbols from entries
            const tickers = [...new Set(entries
                .map(entry => entry.ticker_symbol)
                .filter(ticker => ticker && ticker.trim() !== ''))];
            
            if (tickers.length === 0) {
                setPriceLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE}/portfolio/stock-prices`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tickers})
            });

            if (response.ok) {
                const data = await response.json();
                const priceMap = {};
                if (data.prices) {
                    data.prices.forEach(price => {
                        if (price.ticker && !price.error) {
                            priceMap[price.ticker] = price;
                        }
                    });
                }
                setStockPrices(priceMap);
            }
        } catch (err) {
            console.error('Failed to fetch stock prices:', err);
        } finally {
            setPriceLoading(false);
        }
    };

    // Draft management functions
    const getEmptyFormData = () => ({
        name: '',
        ticker_symbol: '',
        percentage: '',
        value_ils: '',
        base_price: '',
        entry_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        units: 1
    });

    const isFormDirty = () => {
        if (!showForm || editingEntry) return false; // Don't check for edits, only new entries
        if (!initialFormData) return false;
        
        // Check if any field has changed from initial state
        return (
            formData.name !== initialFormData.name ||
            formData.ticker_symbol !== initialFormData.ticker_symbol ||
            formData.percentage !== initialFormData.percentage ||
            formData.value_ils !== initialFormData.value_ils ||
            formData.base_price !== initialFormData.base_price ||
            formData.entry_date !== initialFormData.entry_date ||
            formData.currency !== initialFormData.currency ||
            formData.units !== initialFormData.units
        );
    };

    const hasFormData = () => {
        // Check if form has any meaningful data
        return !!(
            formData.name?.trim() ||
            formData.ticker_symbol?.trim() ||
            formData.percentage ||
            formData.value_ils ||
            formData.base_price ||
            formData.currency !== 'USD' ||
            formData.units !== 1
        );
    };

    const saveDraft = () => {
        if (!editingEntry && hasFormData()) {
            localStorage.setItem(PORTFOLIO_DRAFT_STORAGE_KEY, JSON.stringify({
                ...formData,
                tab_id: activeTabId
            }));
        }
    };

    const loadDraft = () => {
        try {
            const draft = localStorage.getItem(PORTFOLIO_DRAFT_STORAGE_KEY);
            if (draft) {
                const draftData = JSON.parse(draft);
                // Only load if it's for the current tab or no tab was saved
                if (!draftData.tab_id || draftData.tab_id === activeTabId) {
                    return draftData;
                }
            }
        } catch (e) {
            console.error('Error loading draft:', e);
        }
        return null;
    };

    const clearDraft = () => {
        localStorage.removeItem(PORTFOLIO_DRAFT_STORAGE_KEY);
    };

    const handleCloseForm = (forceClose = false) => {
        if (forceClose || !isFormDirty()) {
            // Clear draft if closing without saving
            if (!editingEntry) {
                clearDraft();
            }
            setShowForm(false);
            setEditingEntry(null);
            setInitialFormData(null);
            setFormData(getEmptyFormData());
        } else {
            // Show draft dialog
            setShowDraftDialog(true);
        }
    };

    const handleSaveDraft = () => {
        saveDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const handleDismissDraft = () => {
        clearDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const handleSaveEntry = async () => {
        try {
            setLoading(true);
            const url = editingEntry
                ? `${API_BASE}/portfolio/${editingEntry.id}?username=${authUser}&role=${authRole}`
                : `${API_BASE}/portfolio?username=${authUser}&role=${authRole}`;
            const method = editingEntry ? 'PUT' : 'POST';
            
            // Parse units - ensure it's always a valid positive integer
            const unitsValue = formData.units;
            let units = 1;
            if (unitsValue != null && unitsValue !== '') {
                const strValue = String(unitsValue).trim();
                if (strValue !== '') {
                    const numValue = parseInt(strValue, 10);
                    if (!isNaN(numValue) && numValue > 0 && isFinite(numValue)) {
                        units = numValue;
                    }
                }
            }
            // Ensure units is always a number, never undefined or null
            units = Number.isInteger(units) && units > 0 ? units : 1;

            const body = {
                ...formData,
                tab_id: activeTabId,
                percentage: parseFloat(formData.percentage) || 0,
                value_ils: parseFloat(formData.value_ils) || 0,
                base_price: (formData.base_price !== '' && formData.base_price != null) ? parseFloat(formData.base_price) : null,
                username: authUser,
                currency: formData.currency || 'USD',
                units: units  // Always a positive integer
            };

            const response = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });

            if (response.ok) {
                // Clear draft on successful save
                if (!editingEntry) {
                    clearDraft();
                }
                handleCloseForm(true); // Force close immediately
                setLoading(false); // Stop loading so UI is responsive
                // Refresh data in background (don't block UI)
                fetchEntries();
                fetchSummary();
                return; // Skip finally's setLoading
            }
        } catch (err) {
            console.error('Failed to save entry:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await fetch(`${API_BASE}/portfolio/${id}?username=${authUser}&role=${authRole}`, {
                method: 'DELETE'
            });
            await fetchEntries();
            await fetchSummary();
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    // Group entries by stock name
    const groupedEntries = entries.reduce((acc, entry) => {
        if (!acc[entry.name]) {
            acc[entry.name] = [];
        }
        acc[entry.name].push(entry);
        return acc;
    }, {});

    // Helper: current price per unit (live or from stored value), total value, and growth
    const getEntryValues = (entry, livePrice) => {
        const units = entry.units ?? 1;
        const currency = entry.currency || 'ILS';
        const currentPricePerUnit = livePrice?.currentPrice ?? (entry.value_ils / units);
        const totalValue = units * currentPricePerUnit;
        const basePrice = entry.base_price != null && entry.base_price !== '' ? parseFloat(entry.base_price) : null;
        const growthAmount = basePrice != null && basePrice !== 0
            ? currentPricePerUnit - basePrice
            : null;
        const growthPercent = basePrice != null && basePrice !== 0
            ? ((currentPricePerUnit - basePrice) / basePrice) * 100
            : null;
        return { units, currency, currentPricePerUnit, totalValue, growthAmount, growthPercent };
    };

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        STOCK PORTFOLIO
                    </h1>
                </div>

                {/* Tabs */}
                {tabs.length > 0 && (
                    <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px'}}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                style={{
                                    padding: '8px 16px',
                                    border: '3px solid #000',
                                    background: activeTabId === tab.id ? THEME.primary : '#fff',
                                    color: activeTabId === tab.id ? '#fff' : '#000',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary */}
            {summary && (
                <div style={{padding: '16px', borderBottom: '3px solid #000', background: '#f8f8f8'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px'}}>
                        Total Value: {formatCurrencyWithCode(summary.total_value_ils ?? summary.total_value ?? 0, 'ILS')}
                    </div>
                    {summary.exchange_rates && summary.exchange_rates.USD && (
                        <div style={{fontSize: '0.8rem', color: THEME.muted, marginBottom: '4px'}}>
                            USD/ILS: {summary.exchange_rates.USD.toFixed(2)}
                        </div>
                    )}
                    <div style={{fontSize: '0.85rem', color: THEME.muted}}>
                        {summary.latest_entries?.length || 0} stocks
                    </div>
                </div>
            )}

            {/* Entries List */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : Object.keys(groupedEntries).length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No portfolio entries found
                    </div>
                ) : (
                    Object.entries(groupedEntries).map(([stockName, stockEntries]) => {
                        const tickerSymbol = stockEntries[0]?.ticker_symbol;
                        const livePrice = tickerSymbol ? stockPrices[tickerSymbol] : null;
                        
                        return (
                            <div
                                key={stockName}
                                style={{
                                    border: '3px solid #000',
                                    padding: '16px',
                                    marginBottom: '16px',
                                    background: '#fff'
                                }}
                            >
                                <div style={{fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px'}}>
                                    {stockName}
                                    {tickerSymbol && (
                                        <span style={{fontSize: '0.8rem', color: THEME.muted, marginLeft: '8px'}}>
                                            ({tickerSymbol})
                                        </span>
                                    )}
                                </div>
                                
                                {/* Live Price Display */}
                                {livePrice && livePrice.currentPrice && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#f8f8f8',
                                        border: '2px solid #000',
                                        marginBottom: '12px',
                                        fontSize: '0.85rem'
                                    }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontWeight: 700, fontSize: '0.9rem'}}>
                                                    Live Price: {formatCurrency(livePrice.currentPrice)} {livePrice.currency || 'USD'}
                                                </div>
                                                {livePrice.change !== null && livePrice.change !== undefined && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: livePrice.change >= 0 ? THEME.success : THEME.accent,
                                                        fontWeight: 700,
                                                        marginTop: '2px'
                                                    }}>
                                                        {livePrice.change >= 0 ? '↑' : '↓'} {Math.abs(livePrice.change).toFixed(2)} 
                                                        {livePrice.changePercent !== null && livePrice.changePercent !== undefined && 
                                                            ` (${livePrice.changePercent >= 0 ? '+' : ''}${livePrice.changePercent.toFixed(2)}%)`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            {priceLoading && (
                                                <div style={{fontSize: '0.7rem', color: THEME.muted}}>Updating...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            {stockEntries.map(entry => {
                                const { units, currency, totalValue, growthAmount, growthPercent } = getEntryValues(entry, livePrice);
                                return (
                                <div
                                    key={entry.id}
                                    style={{
                                        border: '2px solid #000',
                                        padding: '12px',
                                        marginBottom: '8px',
                                        background: '#f8f8f8'
                                    }}
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                        <div style={{fontSize: '0.85rem', color: THEME.muted}}>
                                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div style={{fontSize: '1.1rem', fontWeight: 900}}>
                                            {formatCurrencyWithCode(entry.value_ils, currency)}
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: THEME.muted}}>
                                        <span>Quantity: {(units).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
                                        <span>{entry.percentage}%</span>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px'}}>
                                        <span>Total value: {formatCurrencyWithCode(totalValue, currency)}</span>
                                    </div>
                                    {entry.base_price != null && entry.base_price !== '' && (
                                        <div style={{fontSize: '0.8rem', marginBottom: '4px'}}>
                                            Base: {formatCurrencyWithCode(parseFloat(entry.base_price), currency)}
                                        </div>
                                    )}
                                    {(growthAmount != null && growthPercent != null) ? (
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: growthAmount >= 0 ? THEME.success : THEME.accent,
                                            marginBottom: '8px'
                                        }}>
                                            {growthAmount >= 0 ? <TrendingUp size={14} style={{verticalAlign: 'middle', marginRight: '4px'}} /> : <TrendingDown size={14} style={{verticalAlign: 'middle', marginRight: '4px'}} />}
                                            {formatCurrencyWithCode(Math.abs(growthAmount), currency)} ({growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%)
                                        </div>
                                    ) : (
                                        <div style={{fontSize: '0.8rem', color: THEME.muted, marginBottom: '8px'}}>Growth: —</div>
                                    )}
                                    <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                                        <button
                                            onClick={() => {
                                                setEditingEntry(entry);
                                                const editFormData = {
                                                    name: entry.name,
                                                    ticker_symbol: entry.ticker_symbol || '',
                                                    percentage: entry.percentage?.toString() || '',
                                                    value_ils: entry.value_ils?.toString() || '',
                                                    base_price: entry.base_price != null && entry.base_price !== '' ? String(entry.base_price) : '',
                                                    entry_date: entry.entry_date.split('T')[0],
                                                    currency: entry.currency || 'USD',
                                                    units: entry.units != null ? entry.units : 1
                                                };
                                                setFormData(editFormData);
                                                setInitialFormData({ ...editFormData }); // Track initial state for edits too
                                                setShowForm(true);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                border: '2px solid #000',
                                                background: THEME.primary,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            style={{
                                                padding: '6px',
                                                border: '2px solid #000',
                                                background: THEME.accent,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        );
                    })
                )}
            </div>

            {/* Add Entry Button */}
            <button
                onClick={() => {
                    setEditingEntry(null);
                    
                    // Try to load draft, otherwise use empty form
                    const draft = loadDraft();
                    const emptyForm = getEmptyFormData();
                    const initialForm = draft || emptyForm;
                    
                    setFormData(initialForm);
                    setInitialFormData({ ...initialForm }); // Track initial state
                    setShowForm(true);
                }}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        touchAction: 'none',
                        overscrollBehavior: 'contain'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCloseForm();
                        }
                    }}
                    onTouchMove={(e) => {
                        // Prevent background scroll when touching overlay
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                        }
                    }}
                >
                    <div 
                        style={{
                            width: '100%',
                            maxHeight: '90vh',
                            background: '#fff',
                            borderRadius: '16px 16px 0 0',
                            padding: '20px',
                            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain',
                            touchAction: 'pan-y',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '20px',
                            flexShrink: 0,
                            position: 'sticky',
                            top: 0,
                            background: '#fff',
                            zIndex: 1,
                            paddingBottom: '8px'
                        }}>
                            <h2 style={{fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                {editingEntry ? 'Edit Entry' : 'New Entry'}
                            </h2>
                            <button onClick={() => handleCloseForm()} style={{background: 'none', border: 'none', padding: '8px', flexShrink: 0}}>
                                <X size={28}/>
                            </button>
                        </div>

                        <div style={{
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            flex: 1,
                            minHeight: 0
                        }}>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Stock Name
                                </label>
                                <CustomAutocomplete
                                    value={formData.name}
                                    onChange={(value) => setFormData({...formData, name: value})}
                                    options={stockNames}
                                    placeholder="Stock name..."
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Ticker Symbol
                                </label>
                                <input
                                    type="text"
                                    value={formData.ticker_symbol}
                                    onChange={(e) => setFormData({...formData, ticker_symbol: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Currency
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                >
                                    <option value="USD">USD</option>
                                    <option value="ILS">ILS (Israeli Shekel)</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Quantity (units)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={formData.units}
                                    onChange={(e) => setFormData({...formData, units: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Value
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.value_ils}
                                    onChange={(e) => setFormData({...formData, value_ils: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Percentage
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.percentage}
                                        onChange={(e) => setFormData({...formData, percentage: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Base Price (optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.base_price}
                                        onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                                        placeholder="Optional"
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.entry_date}
                                    onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div style={{
                                display: 'flex', 
                                gap: '12px', 
                                marginTop: '8px',
                                flexShrink: 0,
                                paddingTop: '8px',
                                paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
                            }}>
                                <button
                                    onClick={() => handleCloseForm()}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEntry}
                                    disabled={loading || !formData.name || !formData.value_ils}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: THEME.primary,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        opacity: (loading || !formData.name || !formData.value_ils) ? 0.5 : 1,
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Draft Confirmation Dialog */}
            {showDraftDialog && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}
                    onClick={() => setShowDraftDialog(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '400px',
                            border: '3px solid #000',
                            boxShadow: '4px 4px 0px #000'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <AlertCircle size={28} color={THEME.accent} style={{ marginRight: '12px' }} />
                            <h2 style={{
                                margin: 0,
                                fontWeight: 800,
                                fontSize: '1.3rem',
                                color: '#000'
                            }}>
                                Unsaved Changes
                            </h2>
                        </div>
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            color: THEME.muted
                        }}>
                            You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexDirection: 'column'
                        }}>
                            <button
                                onClick={handleDismissDraft}
                                style={{
                                    padding: '14px',
                                    background: '#fff',
                                    border: '3px solid #000',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    color: '#000',
                                    touchAction: 'manipulation'
                                }}
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                style={{
                                    padding: '14px',
                                    background: THEME.secondary,
                                    border: '3px solid #000',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    color: '#000',
                                    touchAction: 'manipulation'
                                }}
                            >
                                Save as Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Mobile Clients Management View Component
const MobileClientsView = ({authUser, authRole, onBack}) => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientTasks, setClientTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newClient, setNewClient] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/clients/manage`);
            const data = await response.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientTasks = async (clientName) => {
        try {
            const response = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}/tasks`);
            const data = await response.json();
            setClientTasks(Array.isArray(data) ? data : []);
            setSelectedClient(clientName);
        } catch (err) {
            console.error('Error fetching client tasks:', err);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!newClient.name?.trim()) return;

        try {
            setCreateLoading(true);
            const response = await fetch(`${API_BASE}/clients`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: newClient.name.trim(),
                    email: newClient.email?.trim() || '',
                    phone: newClient.phone?.trim() || '',
                    notes: newClient.notes?.trim() || '',
                    owner: authUser
                })
            });

            if (response.ok) {
                setNewClient({name: '', email: '', phone: '', notes: ''});
                setShowAddForm(false);
                await fetchClients();
            }
        } catch (err) {
            console.error('Failed to create client:', err);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteClient = async (clientName) => {
        if (!window.confirm(`Delete all tasks for "${clientName}"?`)) return;
        try {
            await fetch(`${API_BASE}/clients/${encodeURIComponent(clientName)}`, {
                method: 'DELETE'
            });
            setSelectedClient(null);
            setClientTasks([]);
            await fetchClients();
        } catch (err) {
            console.error('Failed to delete client:', err);
        }
    };

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        CLIENTS
                    </h1>
                </div>
            </div>

            {/* Clients List */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : clients.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No clients yet
                    </div>
                ) : (
                    clients.map(client => (
                        <div
                            key={client.client}
                            onClick={() => fetchClientTasks(client.client)}
                            style={{
                                border: '3px solid #000',
                                padding: '16px',
                                marginBottom: '12px',
                                background: selectedClient === client.client ? '#f8f8f8' : '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px'}}>
                                {client.client}
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: THEME.muted}}>
                                <div>
                                    <div style={{fontWeight: 700}}>{(client.total_hours || 0).toFixed(1)}h</div>
                                    <div style={{fontSize: '0.75rem'}}>Total Hours</div>
                                </div>
                                <div>
                                    <div style={{fontWeight: 700}}>{client.task_count || 0}</div>
                                    <div style={{fontSize: '0.75rem'}}>Tasks</div>
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client.client);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: '2px solid #000',
                                        background: THEME.accent,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Client Tasks */}
            {selectedClient && clientTasks.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: '50vh',
                    background: '#fff',
                    borderTop: '3px solid #000',
                    padding: '16px',
                    overflowY: 'auto',
                    zIndex: 100
                }}>
                    <div style={{fontSize: '1.1rem', fontWeight: 900, marginBottom: '12px'}}>
                        Tasks for {selectedClient}
                    </div>
                    {clientTasks.map(task => (
                        <div
                            key={task.id}
                            style={{
                                border: '2px solid #000',
                                padding: '12px',
                                marginBottom: '8px',
                                background: task.status === 'completed' ? '#f8f8f8' : '#fff'
                            }}
                        >
                            <div style={{fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px'}}>
                                {task.title}
                            </div>
                            <div style={{fontSize: '0.8rem', color: THEME.muted}}>
                                {new Date(task.task_date).toLocaleDateString('en-GB')}
                                {task.duration && ` • ${task.duration}h`}
                                {task.status === 'completed' && ' • ✓ Completed'}
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setSelectedClient(null)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '3px solid #000',
                            background: THEME.primary,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            marginTop: '12px'
                        }}
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Add Client Button */}
            <button
                onClick={() => setShowAddForm(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            {/* Add Client Form Modal */}
            {showAddForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddForm(false);
                        }
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '80vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        padding: '20px',
                        overflowY: 'auto'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                New Client
                            </h2>
                            <button onClick={() => setShowAddForm(false)} style={{background: 'none', border: 'none', padding: '8px'}}>
                                <X size={28}/>
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient}>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                                        required
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={newClient.phone}
                                        onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Notes
                                    </label>
                                    <textarea
                                        value={newClient.notes}
                                        onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                                        rows={3}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            border: '3px solid #000',
                                            background: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createLoading || !newClient.name?.trim()}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            border: '3px solid #000',
                                            background: THEME.primary,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            opacity: (createLoading || !newClient.name?.trim()) ? 0.5 : 1
                                        }}
                                    >
                                        {createLoading ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const DRAFT_STORAGE_KEY = 'taskTracker_mobile_draft';
const BULK_DRAFT_STORAGE_KEY = 'taskTracker_mobile_bulkDraft';

// Brutalist theme - EXACTLY matching desktop TaskTracker
const THEME = {
    bg: '#fff',
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    text: '#000',
    muted: '#666',
    success: '#00AA00',
    border: '#000'
};

// Font stack - EXACTLY matching desktop
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileTaskTracker = ({authRole, authUser, onLogout}) => {
    const navigate = useNavigate();
    const isSharedUser = authRole === 'shared';
    const isLimitedUser = authRole === 'limited';
    const isAdmin = authRole === 'admin';

    // State
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [appView, setAppView] = useState('tasks'); // 'tasks', 'transactions', 'stats', 'portfolio', 'clients'
    const [filterMode, setFilterMode] = useState('all'); // all, active, done
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharingTask, setSharingTask] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showBulkInput, setShowBulkInput] = useState(false);
    const [bulkTasksText, setBulkTasksText] = useState('');
    const [bulkCategory, setBulkCategory] = useState([]);
    const [bulkClient, setBulkClient] = useState('');
    const formChangeTimeoutRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categories: [],
        client: '',
        task_date: new Date().toISOString().split('T')[0],
        task_time: new Date().toTimeString().slice(0, 5),
        duration: '',
        status: 'uncompleted',
        tags: [],
        notes: '',
        shared: false
    });

    // Swipe state
    const [swipeStates, setSwipeStates] = useState({}); // { taskId: offsetX }
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);
    const swipeThreshold = 100; // px to trigger delete

    // Auto-save draft
    useEffect(() => {
        if (showTaskModal && (formData.title || formData.description)) {
            if (formChangeTimeoutRef.current) {
                clearTimeout(formChangeTimeoutRef.current);
            }
            formChangeTimeoutRef.current = setTimeout(() => {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
            }, 1000);
        }
        // cleanup to avoid leaking timers
        return () => {
            if (formChangeTimeoutRef.current) {
                clearTimeout(formChangeTimeoutRef.current);
            }
        };
    }, [formData, showTaskModal]);

    // Auto-save bulk draft
    useEffect(() => {
        if (showBulkInput && bulkTasksText) {
            const timeoutId = setTimeout(() => {
                saveBulkDraft();
            }, 1000); // Auto-save after 1 second of no changes
            return () => clearTimeout(timeoutId);
        }
    }, [bulkTasksText, showBulkInput]);

    // Load bulk draft when modal opens
    useEffect(() => {
        if (showBulkInput && !bulkTasksText) {
            const draft = loadBulkDraft();
            if (draft) {
                setBulkTasksText(draft);
            }
        }
    }, [showBulkInput]);

    const saveDraft = () => {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    };

    const loadDraft = () => {
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
            return JSON.parse(draft);
        }
        return null;
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    };

    const saveBulkDraft = () => {
        if (bulkTasksText.trim()) {
            localStorage.setItem(BULK_DRAFT_STORAGE_KEY, bulkTasksText);
        }
    };

    const loadBulkDraft = () => {
        const draft = localStorage.getItem(BULK_DRAFT_STORAGE_KEY);
        return draft || '';
    };

    const clearBulkDraft = () => {
        localStorage.removeItem(BULK_DRAFT_STORAGE_KEY);
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            await Promise.all([
                fetchTasks(),
                fetchCategories(),
                fetchClients(),
                fetchTags()
            ]);
        };
        loadData();
    }, [authUser, authRole]); // reload when auth context changes

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks?username=${authUser}&role=${authRole}`);
            if (!response.ok) throw new Error(`Tasks fetch failed: ${response.status}`);
            const data = await response.json();
            const sorted = (data || []).sort((a, b) => {
                if (a.status === 'uncompleted' && b.status === 'completed') return -1;
                if (a.status === 'completed' && b.status === 'uncompleted') return 1;
                return 0;
            });
            setTasks(sorted);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE}/categories`);
            if (!response.ok) throw new Error(`Categories fetch failed: ${response.status}`);
            const data = await response.json();
            setCategories(data || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE}/clients`);
            if (!response.ok) throw new Error(`Clients fetch failed: ${response.status}`);
            const data = await response.json();
            const clientNames = (data || []).map(client =>
                typeof client === 'string' ? client : client.name || client.client || client
            );
            setClients(clientNames);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch(`${API_BASE}/tags`);
            if (!response.ok) throw new Error(`Tags fetch failed: ${response.status}`);
            const data = await response.json();
            setAllTags(data || []);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    };

    // Task actions
    const toggleTaskStatus = async (taskId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'uncompleted' : 'completed';
            await fetch(`${API_BASE}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({status: newStatus})
            });
            await fetchTasks();
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;

        try {
            await fetch(`${API_BASE}/tasks/${taskId}`, {method: 'DELETE'});
            await fetchTasks();
            setSwipeStates(prev => {
                const updated = {...prev};
                delete updated[taskId];
                return updated;
            });
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    const saveTask = async () => {
        try {
            setLoading(true);
            const method = editingTask ? 'PUT' : 'POST';
            const url = editingTask
                ? `${API_BASE}/tasks/${editingTask.id}`
                : `${API_BASE}/tasks`;

            const response = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...formData,
                    username: authUser,
                    role: authRole
                })
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => null);
                throw new Error(`Save failed: ${response.status} ${errBody || ''}`);
            }

            await fetchTasks();
            clearDraft();
            closeModal();
        } catch (err) {
            console.error('Failed to save task:', err);
            alert('Failed to save task. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const parseBulkTasks = (text) => {
        const lines = text.split('\n');
        const tasksToCreate = [];
        let currentTask = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Check if line starts with a number followed by . or )
            const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);

            if (numberedMatch) {
                // This is a new numbered task
                if (currentTask) {
                    // Save previous task
                    tasksToCreate.push(currentTask.trim());
                }
                // Start new task
                currentTask = numberedMatch[2];
            } else {
                // This is either a continuation of current task or a new unnumbered task
                if (currentTask) {
                    // Append to current task (multi-line task)
                    currentTask += '\n' + line;
                } else {
                    // Unnumbered single-line task
                    tasksToCreate.push(line);
                }
            }
        }

        // Add the last numbered task if exists
        if (currentTask) {
            tasksToCreate.push(currentTask.trim());
        }

        return tasksToCreate;
    };

    const handleBulkTaskSubmit = async () => {
        if (!bulkTasksText.trim()) return;

        const taskTitles = parseBulkTasks(bulkTasksText);
        if (taskTitles.length === 0) return;

        const tasksToCreate = taskTitles.map(title => ({
            title,
            description: '',
            categories: bulkCategory.length > 0 ? bulkCategory : [],
            client: bulkClient || '',
            task_date: formData.task_date,
            task_time: formData.task_time || '',
            duration: '',
            status: 'uncompleted',
            tags: [],
            notes: '',
            username: authUser,
            role: authRole
        }));

        try {
            setLoading(true);
            const promises = tasksToCreate.map(task =>
                fetch(`${API_BASE}/tasks`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(task)
                })
            );

            await Promise.all(promises);

            await fetchTasks();
            await fetchClients();

            setBulkTasksText('');
            setBulkCategory([]);
            setBulkClient('');
            clearBulkDraft();
            setShowBulkInput(false);
        } catch (err) {
            console.error('Failed to create bulk tasks:', err);
            alert('Failed to create bulk tasks. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTask(null);
        const draft = loadDraft();
        if (draft) {
            setFormData(draft);
        } else {
            setFormData({
                title: '',
                description: '',
                categories: [],
                client: '',
                task_date: new Date().toISOString().split('T')[0],
                task_time: new Date().toTimeString().slice(0, 5),
                duration: '',
                status: 'uncompleted',
                tags: [],
                notes: '',
                shared: false
            });
        }
        setShowTaskModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            categories: task.categories || [],
            client: task.client || '',
            task_date: task.task_date || new Date().toISOString().split('T')[0],
            task_time: task.task_time || '',
            duration: task.duration || '',
            status: task.status || 'uncompleted',
            tags: task.tags || [],
            notes: task.notes || '',
            shared: task.shared || false
        });
        setShowTaskModal(true);
    };

    const hasUnsavedChanges = () => {
        if (editingTask) {
            // Check if editing task has unsaved changes
            return (
                formData.title !== editingTask.title ||
                formData.description !== (editingTask.description || '') ||
                JSON.stringify(formData.categories) !== JSON.stringify(editingTask.categories || []) ||
                formData.client !== (editingTask.client || '') ||
                formData.task_date !== editingTask.task_date ||
                formData.task_time !== (editingTask.task_time || '') ||
                formData.duration !== (editingTask.duration || '') ||
                formData.status !== editingTask.status ||
                JSON.stringify(formData.tags) !== JSON.stringify(editingTask.tags || []) ||
                formData.notes !== (editingTask.notes || '') ||
                formData.shared !== (editingTask.shared || false)
            );
        } else {
            // Check if new task has any data
            return !!(formData.title || formData.description);
        }
    };

    const closeModal = () => {
        if (hasUnsavedChanges()) {
            const message = editingTask
                ? 'You have unsaved changes. Are you sure you want to close without saving?'
                : 'You have unsaved changes. Are you sure you want to discard this draft?';

            if (window.confirm(message)) {
                if (!editingTask) {
                    clearDraft();
                }
                setShowTaskModal(false);
                setEditingTask(null);
            }
        } else {
            setShowTaskModal(false);
            setEditingTask(null);
        }
    };

    const duplicateTask = (task) => {
        setEditingTask(null);
        setFormData({
            title: task.title + ' (copy)',
            description: task.description || '',
            categories: task.categories || [],
            client: task.client || '',
            task_date: new Date().toISOString().split('T')[0],
            task_time: new Date().toTimeString().slice(0, 5),
            duration: task.duration || '',
            status: 'uncompleted',
            tags: task.tags || [],
            notes: task.notes || '',
            shared: task.shared || false
        });
        setShowTaskModal(true);
    };

    const openShareModal = (task) => {
        setSharingTask(task);
        setShareEmail('');
        setShowShareModal(true);
    };

    const closeShareModal = () => {
        setShowShareModal(false);
        setSharingTask(null);
        setShareEmail('');
    };

    const shareTask = async () => {
        if (!shareEmail.trim()) {
            alert('Please enter an email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(shareEmail)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/tasks/${sharingTask.id}/share`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: shareEmail.trim()})
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to share task');
            }

            alert(`Task shared successfully with ${shareEmail}!`);
            closeShareModal();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Swipe handlers
    const handleTouchStart = (e, taskId) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e, taskId) => {
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchCurrentX.current - touchStartX.current;

        // Only allow left swipe (negative diff)
        if (diff < 0) {
            setSwipeStates(prev => ({...prev, [taskId]: diff}));
        }
    };

    const handleTouchEnd = (taskId) => {
        const diff = touchCurrentX.current - touchStartX.current;

        if (Math.abs(diff) > swipeThreshold) {
            // Swiped far enough - show delete confirmation
            deleteTask(taskId);
        }

        // Reset swipe
        setSwipeStates(prev => ({...prev, [taskId]: 0}));
    };

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (filterMode === 'active') return task.status !== 'completed';
        if (filterMode === 'done') return task.status === 'completed';
        return true;
    });

    const counts = {
        all: tasks.length,
        active: tasks.filter(t => t.status !== 'completed').length,
        done: tasks.filter(t => t.status === 'completed').length
    };

    // Toggle category in form
    const toggleCategory = (catId) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(catId)
                ? prev.categories.filter(id => id !== catId)
                : [...prev.categories, catId]
        }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: THEME.bg,
            paddingBottom: '20px',
            fontFamily: FONT_STACK
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
        
        * {
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
        }
        
        body {
          font-family: ${FONT_STACK};
        }
        
        .mobile-btn {
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 10px;
          background: #fff;
          font-family: ${FONT_STACK};
          font-weight: 600;
          text-transform: none;
          font-size: 1rem;
          padding: 14px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-btn:active {
          opacity: 0.7;
        }

        .mobile-btn-primary {
          background: ${THEME.primary};
          color: #fff;
          border-color: ${THEME.primary};
        }

        .mobile-btn-accent {
          background: ${THEME.accent};
          color: #fff;
          border-color: ${THEME.accent};
        }
        
        .filter-pill {
          border: 3px solid #000;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.9rem;
          background: #fff;
          cursor: pointer;
          font-family: ${FONT_STACK};
          text-transform: none;
        }
        
        .filter-pill.active {
          background: ${THEME.primary};
          color: #fff;
        }
        
        .task-card {
          border: 3px solid #000;
          background: #fff;
          margin-bottom: 12px;
          position: relative;
          transition: transform 0.2s ease;
        }
        
        .category-pill {
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 16px;
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          background: #f5f5f5;
          font-family: ${FONT_STACK};
          transition: all 0.2s ease;
        }

        .category-pill.selected {
          background: ${THEME.primary};
          color: #fff;
          border-color: ${THEME.primary};
        }
        
        input, textarea, select {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 12px;
          font-size: 1rem;
          font-family: ${FONT_STACK};
          background: #fff;
        }

        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .color-bar {
          height: 12px;
          width: 100%;
          background: linear-gradient(90deg, #FF0000 0%, #FF0000 33.33%, #FFD500 33.33%, #FFD500 66.66%, #0000FF 66.66%, #0000FF 100%);
        }
      `}</style>

            {/* Conditional View Rendering */}
            {appView === 'stats' && (
                <MobileStatsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'transactions' && (
                <MobileBankTransactionsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'portfolio' && (
                <MobileStockPortfolioView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'clients' && (
                <MobileClientsView
                    authUser={authUser}
                    authRole={authRole}
                    onBack={() => setAppView('tasks')}
                />
            )}

            {appView === 'tasks' && (<>
                {/* Header with tri-color bar */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: '#fff',
                    borderBottom: '3px solid #000'
                }}>
                    {/* Tri-color bar - 12px like desktop */}
                    <div className="color-bar"/>

                    <div style={{
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '1.75rem',
                                fontWeight: 900,
                                margin: '0 0 4px 0',
                                textTransform: 'uppercase',
                                letterSpacing: '-0.5px',
                                fontFamily: FONT_STACK
                            }}>
                                TASKS
                            </h1>

                            <p style={{
                                fontSize: '0.9rem',
                                color: THEME.muted,
                                margin: 0,
                                fontFamily: FONT_STACK
                            }}>
                                {counts.active} active • {counts.done} done
                            </p>
                        </div>

                        {/* Hamburger Menu Button */}
                        <button
                            onClick={() => setShowMobileSidebar(true)}
                            style={{
                                background: '#fff',
                                border: '3px solid #000',
                                padding: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Menu size={24} color={THEME.text}/>
                        </button>
                    </div>

                    {/* Quick filters - below header */}
                    <div style={{padding: '0 16px 16px 16px'}}>
                        <div style={{display: 'flex', gap: '8px', overflowX: 'auto'}}>
                            <div
                                className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterMode('all')}
                            >
                                All ({counts.all})
                            </div>
                            <div
                                className={`filter-pill ${filterMode === 'active' ? 'active' : ''}`}
                                onClick={() => setFilterMode('active')}
                            >
                                Active ({counts.active})
                            </div>
                            <div
                                className={`filter-pill ${filterMode === 'done' ? 'active' : ''}`}
                                onClick={() => setFilterMode('done')}
                            >
                                Done ({counts.done})
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task List */}
                <div style={{padding: '16px'}}>
                    {loading ? (
                        <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                            Loading...
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                            No tasks found
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const swipeOffset = swipeStates[task.id] || 0;
                            const isCompleted = task.status === 'completed';

                            return (
                                <div
                                    key={task.id}
                                    className="task-card"
                                    style={{
                                        transform: `translateX(${swipeOffset}px)`,
                                        borderLeft: `8px solid ${isCompleted ? THEME.secondary : THEME.accent}`
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, task.id)}
                                    onTouchMove={(e) => handleTouchMove(e, task.id)}
                                    onTouchEnd={() => handleTouchEnd(task.id)}
                                >
                                    <div style={{padding: '20px'}}>
                                        {/* Header row */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            marginBottom: '12px'
                                        }}>
                                            {/* Status toggle */}
                                            <button
                                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    minWidth: '32px',
                                                    minHeight: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle size={32} color={THEME.secondary}
                                                                 fill={THEME.secondary}/>
                                                ) : (
                                                    <Circle size={32} color={THEME.accent} strokeWidth={3}/>
                                                )}
                                            </button>

                                            {/* Title */}
                                            <div style={{flex: 1}}>
                                                <h3 style={{
                                                    fontSize: '1.15rem',
                                                    fontWeight: 800,
                                                    margin: 0,
                                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                                    color: isCompleted ? THEME.muted : THEME.text,
                                                    fontFamily: FONT_STACK
                                                }}>
                                                    {task.title}
                                                </h3>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{display: 'flex', gap: '4px'}}>
                                                {/* Duplicate button */}
                                                <button
                                                    onClick={() => duplicateTask(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Copy size={20} color={THEME.secondary}/>
                                                </button>

                                                {/* Share button */}
                                                <button
                                                    onClick={() => openShareModal(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Share2 size={20} color={THEME.accent}/>
                                                </button>

                                                {/* Edit button */}
                                                <button
                                                    onClick={() => openEditModal(task)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Edit2 size={20} color={THEME.primary}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description with proper line breaks */}
                                        {task.description && (
                                            <p style={{
                                                fontSize: '0.95rem',
                                                color: THEME.muted,
                                                margin: '0 0 12px 44px',
                                                lineHeight: '1.5',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Meta info */}
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            marginLeft: '44px',
                                            fontSize: '0.85rem',
                                            color: THEME.muted
                                        }}>
                                            {task.task_date && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Calendar size={14}/>
                                                    {new Date(task.task_date).toLocaleDateString('en-GB')}
                      </span>
                                            )}
                                            {task.duration && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Clock size={14}/>
                                                    {task.duration}h
                      </span>
                                            )}
                                            {task.client && (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Users size={14}/>
                                                    {task.client}
                      </span>
                                            )}
                                        </div>

                                        {/* Categories */}
                                        {task.categories && task.categories.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '6px',
                                                marginTop: '12px',
                                                marginLeft: '44px'
                                            }}>
                                                {task.categories.map(cat => (
                                                    <span
                                                        key={cat.id}
                                                        style={{
                                                            border: '2px solid #000',
                                                            padding: '4px 10px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            background: cat.color || '#f0f0f0'
                                                        }}
                                                    >
                          {cat.label}
                        </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Swipe indicator */}
                                    {swipeOffset < -20 && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '20px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: THEME.accent,
                                            fontWeight: 700,
                                            fontSize: '0.9rem'
                                        }}>
                                            <Trash2 size={24}/>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Floating Action Buttons */}
                {/* Bulk Add Button */}
                <button
                    onClick={() => setShowBulkInput(true)}
                    style={{
                        position: 'fixed',
                        bottom: '100px',
                        right: '20px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: THEME.accent,
                        border: '3px solid #000',
                        boxShadow: '4px 4px 0px #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 90,
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#000'
                    }}
                    title="Bulk Add Tasks"
                >
                    ≡
                </button>

                {/* Main Add Button */}
                <button
                    onClick={openCreateModal}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: THEME.primary,
                        border: '3px solid #000',
                        boxShadow: '4px 4px 0px #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 90
                    }}
                >
                    <Plus size={32} color="#fff" strokeWidth={3}/>
                </button>
            </>)/* End of tasks view */}

            {/* Mobile Sidebar Menu */}
            {showMobileSidebar && (
                <>
                    {/* Overlay */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 300
                        }}
                        onClick={() => setShowMobileSidebar(false)}
                    />

                    {/* Sidebar */}
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '85%',
                        maxWidth: '350px',
                        background: '#fff',
                        borderLeft: '3px solid #000',
                        zIndex: 301,
                        overflowY: 'auto',
                        padding: '24px',
                        fontFamily: FONT_STACK
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowMobileSidebar(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                padding: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} color={THEME.text}/>
                        </button>

                        {/* User info - only show for admin */}
                        {isAdmin && (
                            <div style={{marginBottom: '32px', paddingTop: '8px'}}>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    margin: '0 0 8px 0',
                                    textTransform: 'uppercase',
                                    fontFamily: FONT_STACK
                                }}>
                                    Menu
                                </h2>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: THEME.muted,
                                    margin: 0,
                                    fontFamily: FONT_STACK
                                }}>
                                    👤 {authUser} (admin)
                                </p>
                            </div>
                        )}

                        {!isAdmin && (
                            <div style={{marginBottom: '32px', paddingTop: '8px'}}>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    margin: 0,
                                    textTransform: 'uppercase',
                                    fontFamily: FONT_STACK
                                }}>
                                    Menu
                                </h2>
                            </div>
                        )}

                        {/* Menu sections */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                            {/* Quick Actions */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Quick Actions
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn mobile-btn-primary"
                                        onClick={() => {
                                            openCreateModal();
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <Plus size={16} style={{marginRight: '8px'}}/>
                                        New Task
                                    </button>
                                    <button
                                        className="mobile-btn"
                                        onClick={async () => {
                                            await fetchTasks();
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <RefreshCw size={16} style={{marginRight: '8px'}}/>
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Export / Import */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Export / Import
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn"
                                        onClick={() => {
                                            // Export CSV logic here
                                            setShowMobileSidebar(false);
                                        }}
                                        disabled={tasks.length === 0}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <Download size={16} style={{marginRight: '8px'}}/>
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Stats - for ALL users */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Analytics
                                </h3>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button
                                        className="mobile-btn"
                                        onClick={() => {
                                            setAppView('stats');
                                            setShowMobileSidebar(false);
                                        }}
                                        style={{width: '100%', justifyContent: 'flex-start'}}
                                    >
                                        <BarChart3 size={16} style={{marginRight: '8px'}}/>
                                        View Stats
                                    </button>
                                </div>
                            </div>

                            {/* Bank Transactions - for ALL users (admin, shared, limited) */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Bank Transactions
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('transactions');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <DollarSign size={16} style={{marginRight: '8px'}}/>
                                            View Transactions
                                        </button>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                document.getElementById('mobile-transaction-upload').click();
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <Upload size={16} style={{marginRight: '8px'}}/>
                                            Upload File
                                        </button>
                                        <input
                                            type="file"
                                            id="mobile-transaction-upload"
                                            accept=".csv,.xlsx,.xls"
                                            style={{display: 'none'}}
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const uploadFormData = new FormData();
                                                uploadFormData.append('file', file);
                                                uploadFormData.append('transaction_type', 'credit'); // default to credit
                                                uploadFormData.append('username', authUser); // tag with username

                                                try {
                                                    const response = await fetch(`${API_BASE}/transactions/upload`, {
                                                        method: 'POST',
                                                        body: uploadFormData
                                                    });

                                                    const data = await response.json().catch(() => null);

                                                    if (response.ok) {
                                                        alert(`Successfully uploaded ${data?.transaction_count || '0'} transactions!`);
                                                    } else {
                                                        alert(`Error: ${data?.error || 'Upload failed'}`);
                                                    }
                                                } catch (err) {
                                                    alert(`Error uploading file: ${err?.message || err}`);
                                                }

                                                setShowMobileSidebar(false);
                                                e.target.value = ''; // Reset input
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Stock Portfolio - for ALL users */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Stock Portfolio
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('portfolio');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <TrendingUp size={16} style={{marginRight: '8px'}}/>
                                            View Portfolio
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Clients Management - for ALL users */}
                            {(isAdmin || isSharedUser || isLimitedUser) && (
                                <div>
                                    <h3 style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px',
                                        fontFamily: FONT_STACK
                                    }}>
                                        Clients
                                    </h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        <button
                                            className="mobile-btn"
                                            onClick={() => {
                                                setAppView('clients');
                                                setShowMobileSidebar(false);
                                            }}
                                            style={{width: '100%', justifyContent: 'flex-start'}}
                                        >
                                            <Users size={16} style={{marginRight: '8px'}}/>
                                            Manage Clients
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Account */}
                            <div>
                                <h3 style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                    fontFamily: FONT_STACK
                                }}>
                                    Account
                                </h3>
                                <button
                                    className="mobile-btn mobile-btn-accent"
                                    onClick={() => {
                                        navigate('/settings');
                                        setShowMobileSidebar(false);
                                    }}
                                    style={{width: '100%', justifyContent: 'flex-start', marginBottom: '12px'}}
                                >
                                    <Settings size={16} style={{marginRight: '8px'}}/>
                                    Settings
                                </button>
                                <button
                                    className="mobile-btn mobile-btn-accent"
                                    onClick={() => {
                                        setShowMobileSidebar(false);
                                        if (onLogout) onLogout();
                                    }}
                                    style={{width: '100%', justifyContent: 'flex-start'}}
                                >
                                    <LogOut size={16} style={{marginRight: '8px'}}/>
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Close button at bottom */}
                        <button
                            className="mobile-btn"
                            onClick={() => setShowMobileSidebar(false)}
                            style={{width: '100%', marginTop: '32px'}}
                        >
                            Close Menu
                        </button>
                    </div>
                </>
            )}

            {/* Task Modal */}
            {showTaskModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '75vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            background: '#fff',
                            zIndex: 1
                        }}>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 900,
                                margin: 0,
                                textTransform: 'uppercase',
                                fontFamily: FONT_STACK
                            }}>
                                {editingTask ? 'Edit Task' : 'New Task'}
                            </h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={28} color={THEME.text}/>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{padding: '16px', paddingBottom: '32px'}}>
                            {/* Title */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="Task title..."
                                />
                            </div>

                            {/* Description */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Description
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Task description..."
                                />
                            </div>

                            {/* Date & Time */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.task_date}
                                        onChange={(e) => setFormData({...formData, task_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.task_time}
                                        onChange={(e) => setFormData({...formData, task_time: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Duration & Client */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '100px 1fr',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Hours
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Client
                                    </label>
                                    <CustomAutocomplete
                                        value={formData.client}
                                        onChange={(value) => setFormData({...formData, client: value})}
                                        options={clients.map(c => typeof c === 'string' ? c : String(c))}
                                        placeholder="Client name..."
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Categories
                                </label>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`category-pill ${formData.categories.includes(cat.id) ? 'selected' : ''}`}
                                            onClick={() => toggleCategory(cat.id)}
                                        >
                                            {cat.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Tags
                                </label>
                                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Add tag..."
                                        list="tags-list"
                                        style={{flex: 1}}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="mobile-btn mobile-btn-primary"
                                        style={{padding: '14px 20px'}}
                                    >
                                        <Plus size={16}/>
                                    </button>
                                </div>
                                <datalist id="tags-list">
                                    {allTags.map(tag => (
                                        <option key={tag} value={tag}/>
                                    ))}
                                </datalist>
                                {formData.tags.length > 0 && (
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px'}}>
                                        {formData.tags.map(tag => (
                                            <div
                                                key={tag}
                                                style={{
                                                    border: '2px solid #000',
                                                    padding: '4px 10px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    background: THEME.primary,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {tag}
                                                <X
                                                    size={14}
                                                    onClick={() => removeTag(tag)}
                                                    style={{cursor: 'pointer'}}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="uncompleted">Uncompleted</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Additional notes..."
                                />
                            </div>

                            {/* Shared checkbox (only for admin) */}
                            {isAdmin && (
                                <div style={{marginBottom: '24px'}}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.shared}
                                            onChange={(e) => setFormData({...formData, shared: e.target.checked})}
                                            style={{width: 'auto', margin: 0}}
                                        />
                                        Share with other users
                                    </label>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button
                                    onClick={closeModal}
                                    className="mobile-btn"
                                    style={{flex: 1}}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveTask}
                                    className="mobile-btn mobile-btn-primary"
                                    style={{flex: 1}}
                                    disabled={loading || !formData.title.trim()}
                                >
                                    {loading ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                                </button>
                            </div>

                            {/* Delete button (only when editing) */}
                            {editingTask && (
                                <button
                                    onClick={() => {
                                        deleteTask(editingTask.id);
                                        closeModal();
                                    }}
                                    className="mobile-btn mobile-btn-accent"
                                    style={{width: '100%', marginTop: '12px'}}
                                    disabled={loading}
                                >
                                    <Trash2 size={16}
                                            style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                                    Delete Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Tasks Modal */}
            {showBulkInput && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowBulkInput(false);
                        }
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxHeight: '70vh',
                        background: '#fff',
                        borderRadius: '16px 16px 0 0',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            background: THEME.accent,
                            zIndex: 1
                        }}>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 900,
                                margin: 0,
                                textTransform: 'uppercase',
                                fontFamily: FONT_STACK,
                                color: '#000'
                            }}>
                                Bulk Add Tasks
                            </h2>
                            <button
                                onClick={() => setShowBulkInput(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={28} color="#000"/>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{padding: '16px', paddingBottom: '32px'}}>
                            <p style={{
                                marginBottom: '16px',
                                fontSize: '0.9rem',
                                color: '#666',
                                lineHeight: '1.5'
                            }}>
                                Enter each task on a new line. You can use numbered lists (1., 2.) or just plain text.
                            </p>

                            {/* Task List Textarea */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Tasks ({parseBulkTasks(bulkTasksText).length})
                                </label>
                                <textarea
                                    rows={10}
                                    value={bulkTasksText}
                                    onChange={(e) => setBulkTasksText(e.target.value)}
                                    placeholder={"1. First task\n2. Second task\n3. Third task"}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        border: '3px solid #000',
                                        borderRadius: '0',
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        lineHeight: '1.6',
                                        boxSizing: 'border-box',
                                        resize: 'vertical',
                                        minHeight: '200px'
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* Categories */}
                            <div style={{marginBottom: '16px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Category (Optional)
                                </label>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`category-pill ${bulkCategory.includes(cat.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                if (bulkCategory.includes(cat.id)) {
                                                    setBulkCategory(bulkCategory.filter(c => c !== cat.id));
                                                } else {
                                                    setBulkCategory([...bulkCategory, cat.id]);
                                                }
                                            }}
                                        >
                                            {cat.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Client */}
                            <div style={{marginBottom: '24px'}}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Client (Optional)
                                </label>
                                <CustomAutocomplete
                                    value={bulkClient}
                                    onChange={(value) => setBulkClient(value)}
                                    options={clients.map(c => typeof c === 'string' ? c : String(c))}
                                    placeholder="Client name..."
                                />
                            </div>

                            {/* Action buttons */}
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button
                                    onClick={() => {
                                        setBulkTasksText('');
                                        setBulkCategory([]);
                                        setBulkClient('');
                                        clearBulkDraft();
                                        setShowBulkInput(false);
                                    }}
                                    className="mobile-btn"
                                    style={{flex: 1}}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkTaskSubmit}
                                    className="mobile-btn mobile-btn-accent"
                                    style={{flex: 1}}
                                    disabled={loading || !bulkTasksText.trim()}
                                >
                                    {loading ? 'Creating...' : `Create ${parseBulkTasks(bulkTasksText).length} Tasks`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Task Modal */}
            {showShareModal && sharingTask && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                    onClick={closeShareModal}
                >
                    <div
                        style={{
                            width: '100%',
                            maxHeight: '65vh',
                            background: '#fff',
                            borderRadius: '16px 16px 0 0',
                            padding: '20px',
                            fontFamily: FONT_STACK,
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                Share Task
                            </h2>
                            <button onClick={closeShareModal} style={{background: 'none', border: 'none', padding: '8px'}}>
                                <X size={28} />
                            </button>
                        </div>

                        <p style={{color: THEME.muted, marginBottom: '24px', fontSize: '0.95rem'}}>
                            Share "{sharingTask.title}" via email
                        </p>

                        <div style={{marginBottom: '24px'}}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.85rem',
                                letterSpacing: '0.5px'
                            }}>
                                Email Address *
                            </label>
                            <input
                                type="email"
                                placeholder="recipient@example.com"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && shareEmail.trim()) {
                                        shareTask();
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #000',
                                    fontSize: '1rem',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '12px'}}>
                            <button
                                onClick={closeShareModal}
                                className="mobile-btn"
                                style={{flex: 1}}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={shareTask}
                                className="mobile-btn mobile-btn-primary"
                                style={{flex: 1}}
                                disabled={loading || !shareEmail.trim()}
                            >
                                <Share2 size={16} style={{marginRight: '8px'}}/>
                                {loading ? 'Sharing...' : 'Share'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileTaskTracker;