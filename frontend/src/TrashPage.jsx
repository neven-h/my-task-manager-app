import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, CheckSquare, CreditCard, PiggyBank } from 'lucide-react';
import useTrash from './hooks/useTrash';
import TrashItem from './components/settings/TrashItem';

const TABS = [
    { key: 'task', label: 'Tasks', icon: CheckSquare, color: '#8b5cf6' },
    { key: 'transaction_tab', label: 'Transactions', icon: CreditCard, color: '#3b82f6' },
    { key: 'budget_tab', label: 'Budget', icon: PiggyBank, color: '#10b981' },
];

const TrashPage = () => {
    const navigate = useNavigate();
    const { items, loading, error, fetchTrash, restoreItem, permanentlyDelete, emptyTrash } = useTrash();
    const [activeTab, setActiveTab] = useState('task');
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [restoring, setRestoring] = useState(null);

    useEffect(() => { fetchTrash(); }, [fetchTrash]);

    const filteredItems = useMemo(
        () => items.filter(i => i.item_type === activeTab),
        [items, activeTab],
    );

    const countByType = useMemo(() => {
        const m = { task: 0, transaction_tab: 0, budget_tab: 0 };
        items.forEach(i => { if (m[i.item_type] !== undefined) m[i.item_type]++; });
        return m;
    }, [items]);

    const handleRestore = async (id) => { setRestoring(id); await restoreItem(id); setRestoring(null); };
    const handlePermanentDelete = async (id) => { await permanentlyDelete(id); setConfirmDelete(null); };
    const handleEmptyTrash = async () => { await emptyTrash(); setConfirmEmpty(false); };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            <div style={{
                background: '#fff', borderBottom: '2px solid #000',
                padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <button onClick={() => navigate(-1)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    display: 'flex', alignItems: 'center',
                }}>
                    <ArrowLeft size={22} />
                </button>
                <Trash2 size={24} color="#ef4444" />
                <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Trash</h1>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                    Auto-deleted after 30 days
                </span>
                <div style={{ flex: 1 }} />
                {items.length > 0 && !confirmEmpty && (
                    <button onClick={() => setConfirmEmpty(true)} style={{
                        padding: '8px 16px', border: '2px solid #dc2626', borderRadius: 8,
                        background: '#fff', color: '#dc2626', fontWeight: 600,
                        fontSize: '0.82rem', cursor: 'pointer',
                    }}>Empty Trash</button>
                )}
                {confirmEmpty && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleEmptyTrash} style={{
                            padding: '8px 16px', border: '2px solid #dc2626', borderRadius: 8,
                            background: '#dc2626', color: '#fff', fontWeight: 600,
                            fontSize: '0.82rem', cursor: 'pointer',
                        }}>Confirm</button>
                        <button onClick={() => setConfirmEmpty(false)} style={{
                            padding: '8px 12px', border: '2px solid #ccc', borderRadius: 8,
                            background: '#fff', fontSize: '0.82rem', cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                )}
            </div>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                        padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: '0.9rem',
                    }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                    {TABS.map(({ key, label, icon: Icon, color }) => {
                        const active = activeTab === key;
                        const count = countByType[key] || 0;
                        return (
                            <button key={key} onClick={() => setActiveTab(key)} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '12px 24px', border: 'none',
                                borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
                                background: 'none', cursor: 'pointer',
                                fontWeight: active ? 700 : 500,
                                fontSize: '0.9rem', color: active ? color : '#6b7280',
                                transition: 'all 0.15s',
                            }}>
                                <Icon size={16} />
                                {label}
                                {count > 0 && (
                                    <span style={{
                                        background: active ? color : '#e5e7eb',
                                        color: active ? '#fff' : '#6b7280',
                                        padding: '1px 8px', borderRadius: 10,
                                        fontSize: '0.75rem', fontWeight: 700,
                                    }}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading...</div>
                ) : filteredItems.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: 60, background: '#fff',
                        borderRadius: 12, border: '2px dashed #e5e7eb',
                    }}>
                        <Trash2 size={48} color="#d1d5db" style={{ marginBottom: 16 }} />
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                            No deleted {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                            Deleted items will appear here for 30 days
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredItems.map(item => (
                            <TrashItem key={item.id} item={item}
                                onRestore={handleRestore} onPermanentDelete={handlePermanentDelete}
                                restoring={restoring} confirmDelete={confirmDelete}
                                setConfirmDelete={setConfirmDelete} formatDate={formatDate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrashPage;
