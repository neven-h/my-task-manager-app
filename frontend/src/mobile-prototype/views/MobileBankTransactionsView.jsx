import React, {useState, useEffect, useMemo} from 'react';
import { ArrowLeft, Edit2, Plus, Trash2, PieChart } from 'lucide-react';
import API_BASE from '../../config';
import { formatCurrency } from '../../utils/formatCurrency';

const THEME = {
    bg: '#fff', primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    text: '#000', muted: '#666', success: '#00AA00', border: '#000'
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
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
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
    }, [authUser, authRole]);

    useEffect(() => {
        if (activeTabId === null) return;
        setSelectedMonth('all');
        fetchMonths();
        fetchStats();
    }, [activeTabId]);

    useEffect(() => {
        if (activeTabId === null) return;
        fetchTransactions();
    }, [activeTabId, selectedMonth]);

    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_BASE}/transaction-tabs?username=${authUser}&role=${authRole}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                const normalized = data.map(t => ({ ...t, id: Number(t.id) }));
                setTabs(normalized);
                if (normalized.length > 0) {
                    setActiveTabId(prev => (prev === null ? normalized[0].id : prev));
                } else {
                    setActiveTabId(null);
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        }
    };

    const handleCreateTab = async () => {
        const name = window.prompt('New tab name:', '');
        if (!name || !name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/transaction-tabs`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: name.trim(), username: authUser })
            });
            if (!res.ok) return;
            const newTab = await res.json();
            const id = Number(newTab.id);
            if (id) {
                setTabs(prev => [...prev, { id, name: newTab.name || name.trim() }]);
                setActiveTabId(id);
                setTransactions([]);
                setStats(null);
            }
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    const fetchMonths = async () => {
        try {
            const response = await fetch(`${API_BASE}/transactions/months?username=${authUser}&role=${authRole}&tab_id=${activeTabId}`);
            const data = await response.json();
            // Backend returns array of objects { month_year: "2025-11", ... }; normalize to strings
            const list = Array.isArray(data)
                ? data.map(m => (typeof m === 'string' ? m : (m && m.month_year) || '')).filter(Boolean)
                : [];
            setAvailableMonths(list);
            setSelectedMonth('all');
        } catch (err) {
            console.error('Error fetching months:', err);
            setAvailableMonths([]);
        }
    };

    const formatMonthYear = (monthYear) => {
        if (monthYear == null || monthYear === '' || monthYear === 'all') return 'All';
        const str = typeof monthYear === 'string' ? monthYear : (monthYear.month_year || '');
        if (!str || str === 'all') return 'All';
        const parts = str.split('-');
        if (parts.length < 2) return str;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const path = selectedMonth === 'all'
                ? `${API_BASE}/transactions/all?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`
                : `${API_BASE}/transactions/${selectedMonth}?tab_id=${activeTabId}&username=${authUser}&role=${authRole}`;
            const response = await fetch(path);
            const data = await response.json();
            setTransactions(Array.isArray(data) ? data : []);
            setError(!response.ok ? (data?.error || 'Failed to load transactions') : null);
        } catch (err) {
            setError('Failed to load transactions');
            setTransactions([]);
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
                tab_id: Number(activeTabId),
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

    const filteredTransactions = useMemo(() =>
        transactions.filter(t => {
            if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
            if (searchTerm && !(t.description || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        }),
        [transactions, typeFilter, searchTerm]
    );

    const aggregateByCategory = (list) => {
        const categoryData = {};
        (list || []).forEach(t => {
            const desc = t.description || 'Other';
            const amount = Number(t.amount) || 0;
            if (!categoryData[desc]) categoryData[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
            categoryData[desc].count++;
            categoryData[desc].total += amount;
            if (t.transaction_type === 'cash') categoryData[desc].cash += amount;
            else categoryData[desc].credit += amount;
        });
        return categoryData;
    };

    const chartData = useMemo(() => {
        if (filteredTransactions.length === 0) return null;
        const categoryData = aggregateByCategory(filteredTransactions);
        const totalAmount = filteredTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        if (totalAmount === 0 || !Number.isFinite(totalAmount)) return null;
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5);
        return { sortedCategories, totalAmount };
    }, [filteredTransactions]);

    const PIE_COLORS = ['#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF6B35'];

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
                {tabs.length > 0 ? (
                    <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', minHeight: '44px', alignItems: 'center'}}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(Number(tab.id))}
                                style={{
                                    padding: '8px 16px',
                                    border: '3px solid #000',
                                    background: Number(activeTabId) === Number(tab.id) ? THEME.primary : '#fff',
                                    color: Number(activeTabId) === Number(tab.id) ? '#fff' : '#000',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.name}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={handleCreateTab}
                            style={{
                                padding: '8px 16px',
                                border: '3px solid #000',
                                background: THEME.secondary,
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            + Tab
                        </button>
                    </div>
                ) : (
                    <p style={{fontSize: '0.9rem', color: THEME.muted, margin: 0}}>No tabs yet. Create one below.</p>
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

            {/* Expense Distribution (diagram like desktop) */}
            {chartData && chartData.sortedCategories.length > 0 && (() => {
                const { sortedCategories, totalAmount } = chartData;
                return (
                    <div style={{
                        margin: '0 16px 16px',
                        border: '2px solid #000',
                        padding: '12px',
                        background: '#fff'
                    }}>
                        <h2 style={{
                            margin: '0 0 10px 0',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <PieChart size={20} color={THEME.primary} />
                            Expense distribution (top 5)
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <svg viewBox="0 0 200 200" style={{ width: '160px', height: '160px', flexShrink: 0 }}>
                                {(() => {
                                    let currentAngle = 0;
                                    return sortedCategories.map(([category, data], idx) => {
                                        const percentage = totalAmount !== 0 ? (data.total / totalAmount) * 100 : 0;
                                        const angle = (percentage / 100) * 360;
                                        const startAngle = currentAngle;
                                        const endAngle = currentAngle + angle;
                                        currentAngle = endAngle;
                                        const startRad = (startAngle - 90) * (Math.PI / 180);
                                        const endRad = (endAngle - 90) * (Math.PI / 180);
                                        const x1 = 100 + 90 * Math.cos(startRad);
                                        const y1 = 100 + 90 * Math.sin(startRad);
                                        const x2 = 100 + 90 * Math.cos(endRad);
                                        const y2 = 100 + 90 * Math.sin(endRad);
                                        const largeArc = angle > 180 ? 1 : 0;
                                        const pathData = [`M 100 100`, `L ${x1} ${y1}`, `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`, `Z`].join(' ');
                                        return (
                                            <g key={category}>
                                                <path d={pathData} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="#000" strokeWidth="2" />
                                                {percentage > 8 && (() => {
                                                    const midAngle = (startAngle + endAngle) / 2;
                                                    const midRad = (midAngle - 90) * (Math.PI / 180);
                                                    const labelX = 100 + 55 * Math.cos(midRad);
                                                    const labelY = 100 + 55 * Math.sin(midRad);
                                                    return (
                                                        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="800" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                            {percentage.toFixed(0)}%
                                                        </text>
                                                    );
                                                })()}
                                            </g>
                                        );
                                    });
                                })()}
                            </svg>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {sortedCategories.map(([category, data], idx) => {
                                    const percentage = totalAmount !== 0 ? ((data.total / totalAmount) * 100) : 0;
                                    return (
                                        <div key={category} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 8px',
                                            border: '1px solid #000',
                                            background: '#f8f8f8',
                                            fontSize: '0.75rem'
                                        }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                background: PIE_COLORS[idx % PIE_COLORS.length],
                                                border: '1px solid #000',
                                                flexShrink: 0
                                            }} />
                                            <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category}</span>
                                            <span style={{ fontWeight: 800 }}>{formatCurrency(data.total)}</span>
                                            <span style={{ color: THEME.muted }}>{percentage.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Filters */}
            <div style={{padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '100px',
                            padding: '10px',
                            border: '2px solid #000',
                            fontSize: '0.9rem'
                        }}
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: '10px',
                            border: '2px solid #000',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            minWidth: '100px'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="credit">Credit</option>
                        <option value="cash">Cash</option>
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{
                            padding: '10px',
                            border: '2px solid #000',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            minWidth: '100px'
                        }}
                        title="Month"
                    >
                        <option value="all">All months</option>
                        {[...availableMonths].sort((a, b) => b.localeCompare(a)).map(m => (
                            <option key={m} value={m}>{formatMonthYear(m)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Transactions List */}
            <div style={{padding: '0 16px 16px 16px', minHeight: '200px', overflow: 'visible'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : activeTabId === null && tabs.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        Loading tabs...
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No transactions found
                    </div>
                ) : (
                    filteredTransactions.map(transaction => (
                        <div
                            key={transaction.id}
                            style={{
                                border: '2px solid #000',
                                padding: '6px 10px',
                                marginBottom: '6px',
                                background: '#fff'
                            }}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px'}}>
                                <div style={{flex: 1, minWidth: 0}}>
                                    <div style={{fontSize: '0.8rem', fontWeight: 700, marginBottom: '1px'}}>
                                        {transaction.description ?? '—'}
                                    </div>
                                    <div style={{fontSize: '0.7rem', color: THEME.muted, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap'}}>
                                        <span>{transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('en-GB') : '—'}</span>
                                        <span style={{
                                            padding: '1px 4px',
                                            border: '1px solid #000',
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: (transaction.transaction_type || 'credit') === 'cash' ? THEME.secondary : THEME.primary,
                                            color: '#000'
                                        }}>
                                            {transaction.transaction_type || 'credit'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0}}>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        color: (Number(transaction.amount) || 0) < 0 ? THEME.accent : THEME.text
                                    }}>
                                        {formatCurrency(transaction.amount)}
                                    </div>
                                    <button
                                        onClick={() => {
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
                                        }}
                                        style={{
                                            padding: '5px',
                                            border: '2px solid #000',
                                            background: '#fff',
                                            color: THEME.text,
                                            cursor: 'pointer'
                                        }}
                                        title="Edit"
                                    >
                                        <Edit2 size={12}/>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                        style={{
                                            padding: '5px',
                                            border: '2px solid #000',
                                            background: THEME.accent,
                                            color: '#fff',
                                            cursor: 'pointer'
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
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
