import React, {useState, useEffect} from 'react';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import API_BASE from '../../config';
import { formatCurrency } from '../../utils/formatCurrency';

// Brutalist theme
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
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

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

export default MobileBankTransactionsView;
