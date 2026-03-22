import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wrench, DollarSign, PiggyBank, CheckSquare, Settings, X } from 'lucide-react';
import { useTaskContext } from './context/TaskContext';
import API_BASE from './config';
import { getAuthHeaders } from './api.js';

const SYS = {
    primary: '#0000FF', accent: '#FF0000', success: '#00AA00',
    bg: '#fff', text: '#000', light: '#666', border: '#000',
};

const STORAGE_KEY = 'renovation_budget_tab_id';

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const StatCard = ({ label, value, color, sub }) => (
    <div style={{
        flex: '1 1 160px', border: `3px solid ${SYS.border}`, padding: '16px 20px',
        background: SYS.bg,
    }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: SYS.light, marginBottom: 6 }}>
            {label}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>
            {sub}{fmt(value)}
        </div>
    </div>
);

const QuickNavCard = ({ icon: Icon, label, sub, color, onClick }) => (
    <button onClick={onClick} style={{
        flex: '1 1 160px', border: `3px solid ${SYS.border}`, padding: '20px', background: SYS.bg,
        cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
        fontFamily: 'inherit', transition: 'background 0.1s',
    }}
        onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
        onMouseLeave={e => e.currentTarget.style.background = SYS.bg}
    >
        <Icon size={24} color={color} />
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: SYS.text }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: SYS.light }}>{sub}</div>
    </button>
);

const Renovation = ({ onBackToTasks }) => {
    const { setAppView, tasks, stats } = useTaskContext();

    const [budgetTabs, setBudgetTabs] = useState([]);
    const [selectedTabId, setSelectedTabId] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? parseInt(saved, 10) : null;
    });
    const [entries, setEntries] = useState([]);
    const [linkedTxTab, setLinkedTxTab] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showTabPicker, setShowTabPicker] = useState(false);

    // Fetch budget tabs
    useEffect(() => {
        fetch(`${API_BASE}/budget-tabs`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setBudgetTabs(data); })
            .catch(() => {});
    }, []);

    // Fetch entries and linked tx tab when selectedTabId changes
    const fetchData = useCallback(async (tabId) => {
        if (!tabId) return;
        setLoading(true);
        try {
            const [entriesRes, linkRes] = await Promise.all([
                fetch(`${API_BASE}/budget/entries`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE}/budget-tabs/${tabId}/link`, { headers: getAuthHeaders() }),
            ]);
            const allEntries = await entriesRes.json();
            if (Array.isArray(allEntries)) {
                setEntries(allEntries.filter(e => e.tab_id === tabId));
            }
            if (linkRes.ok) {
                const linkData = await linkRes.json();
                setLinkedTxTab(linkData || null);
            } else {
                setLinkedTxTab(null);
            }
        } catch (_) {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(selectedTabId);
    }, [selectedTabId, fetchData]);

    const handleSelectTab = (tabId) => {
        setSelectedTabId(tabId);
        localStorage.setItem(STORAGE_KEY, String(tabId));
        setShowTabPicker(false);
    };

    // Renovation stats: outcome = paid, income = future
    const { paid, future } = useMemo(() => ({
        paid: entries.filter(e => e.type === 'outcome').reduce((s, e) => s + Number(e.amount), 0),
        future: entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0),
    }), [entries]);

    const totalCost = paid + future;

    const selectedTab = budgetTabs.find(t => t.id === selectedTabId);

    const completedCount = useMemo(() => (tasks || []).filter(t => t.status === 'completed').length, [tasks]);
    const totalTasks = (tasks || []).length;

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{
                background: SYS.bg, borderBottom: `4px solid ${SYS.border}`,
                padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                {onBackToTasks && (
                    <button onClick={onBackToTasks} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: SYS.primary, fontWeight: 700, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.4px', padding: 0,
                    }}>
                        ← Back
                    </button>
                )}
                <Wrench size={20} color={SYS.primary} />
                <h1 style={{
                    flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                    Renovation Tracker
                </h1>
                <button onClick={() => setShowTabPicker(s => !s)} title="Configure renovation budget tab" style={{
                    background: 'none', border: `2px solid ${SYS.border}`, cursor: 'pointer',
                    padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
                    fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                    <Settings size={14} /> Configure
                </button>
            </div>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>

                {/* Tab picker */}
                {showTabPicker && (
                    <div style={{ border: `3px solid ${SYS.border}`, padding: '20px', marginBottom: 28, background: '#f9f9f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Select Renovation Budget Tab
                            </span>
                            <button onClick={() => setShowTabPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        {budgetTabs.length === 0 ? (
                            <p style={{ color: SYS.light, fontSize: '0.9rem' }}>No budget tabs found. Create one in the Budget section first.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {budgetTabs.map(tab => (
                                    <button key={tab.id} onClick={() => handleSelectTab(tab.id)} style={{
                                        padding: '8px 16px', border: `2px solid ${SYS.border}`,
                                        background: tab.id === selectedTabId ? SYS.primary : '#fff',
                                        color: tab.id === selectedTabId ? '#fff' : SYS.text,
                                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                        fontFamily: 'inherit',
                                    }}>
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* No tab selected */}
                {!selectedTabId && (
                    <div style={{ border: `3px solid ${SYS.border}`, padding: '40px', textAlign: 'center', marginBottom: 32 }}>
                        <Wrench size={36} color={SYS.light} style={{ marginBottom: 16 }} />
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No renovation budget tab configured</p>
                        <p style={{ color: SYS.light, marginBottom: 20 }}>Click "Configure" to link a budget tab to this renovation dashboard.</p>
                        <button onClick={() => setShowTabPicker(true)} style={{
                            padding: '10px 24px', border: `2px solid ${SYS.border}`,
                            background: SYS.primary, color: '#fff', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                        }}>
                            Configure
                        </button>
                    </div>
                )}

                {/* Stats section */}
                {selectedTabId && (
                    <>
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: SYS.light }}>
                                Budget tab:
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedTab?.name ?? '—'}</span>
                            {linkedTxTab && (
                                <>
                                    <span style={{ color: SYS.light, fontSize: '0.75rem' }}>·</span>
                                    <span style={{ fontSize: '0.75rem', color: SYS.light }}>linked to: <strong>{linkedTxTab.name}</strong></span>
                                </>
                            )}
                        </div>

                        {loading ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: SYS.light, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Loading…
                            </div>
                        ) : (
                            <>
                                {/* Financial summary */}
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
                                    <StatCard label="Paid" value={paid} color={SYS.accent} sub="−" />
                                    <StatCard label="Future Payments" value={future} color={SYS.primary} sub="+" />
                                    <StatCard label="Total Project Cost" value={totalCost} color={SYS.text} sub="" />
                                </div>

                                {/* Tasks summary */}
                                <div style={{ border: `3px solid ${SYS.border}`, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <CheckSquare size={20} color={SYS.success} />
                                    <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.85rem' }}>Tasks</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: SYS.success }}>{completedCount}</span>
                                    <span style={{ color: SYS.light, fontSize: '0.9rem' }}>completed</span>
                                    <span style={{ color: SYS.light }}>·</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totalTasks}</span>
                                    <span style={{ color: SYS.light, fontSize: '0.9rem' }}>total</span>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Quick navigation */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: SYS.light, marginBottom: 12 }}>
                        Quick Navigation
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <QuickNavCard
                            icon={CheckSquare}
                            label="Tasks"
                            sub="Manage your task list"
                            color={SYS.success}
                            onClick={() => setAppView('tasks')}
                        />
                        <QuickNavCard
                            icon={DollarSign}
                            label="Payments"
                            sub={linkedTxTab ? `Open "${linkedTxTab.name}"` : 'Track bank transactions'}
                            color={SYS.primary}
                            onClick={() => setAppView('transactions')}
                        />
                        <QuickNavCard
                            icon={PiggyBank}
                            label="Budget"
                            sub={selectedTab ? `Open "${selectedTab.name}"` : 'Plan renovation costs'}
                            color={SYS.accent}
                            onClick={() => setAppView('budget')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Renovation;
