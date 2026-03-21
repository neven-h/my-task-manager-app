import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import useTrash from '../../hooks/useTrash';
import TrashItem from './TrashItem';

const TrashSection = () => {
    const { items, loading, error, fetchTrash, restoreItem, permanentlyDelete, emptyTrash } = useTrash();
    const [filter, setFilter] = useState('all');
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [restoring, setRestoring] = useState(null);

    useEffect(() => {
        fetchTrash();
    }, [fetchTrash]);

    const filteredItems = filter === 'all' ? items : items.filter(i => i.item_type === filter);

    const handleRestore = async (trashId) => {
        setRestoring(trashId);
        await restoreItem(trashId);
        setRestoring(null);
    };

    const handlePermanentDelete = async (trashId) => {
        await permanentlyDelete(trashId);
        setConfirmDelete(null);
    };

    const handleEmptyTrash = async () => {
        await emptyTrash();
        setConfirmEmpty(false);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ marginTop: 40 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #f0f0f0'
            }}>
                <Trash2 size={28} color="#ef4444" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111' }}>
                    Trash
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: 8 }}>
                    Items are automatically deleted after 30 days
                </span>
            </div>

            {error && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16,
                    color: '#dc2626',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'budget_tab', label: 'Budget Tabs' },
                    { key: 'transaction_tab', label: 'Bank Tabs' },
                    { key: 'task', label: 'Tasks' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        style={{
                            padding: '8px 16px',
                            border: '2px solid #000',
                            borderRadius: 8,
                            background: filter === key ? '#000' : '#fff',
                            color: filter === key ? '#fff' : '#000',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {label}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                {items.length > 0 && (
                    confirmEmpty ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={handleEmptyTrash}
                                style={{
                                    padding: '8px 16px',
                                    border: '2px solid #dc2626',
                                    borderRadius: 8,
                                    background: '#dc2626',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Confirm Empty
                            </button>
                            <button
                                onClick={() => setConfirmEmpty(false)}
                                style={{
                                    padding: '8px 12px',
                                    border: '2px solid #ccc',
                                    borderRadius: 8,
                                    background: '#fff',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmEmpty(true)}
                            style={{
                                padding: '8px 16px',
                                border: '2px solid #dc2626',
                                borderRadius: 8,
                                background: '#fff',
                                color: '#dc2626',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Empty Trash
                        </button>
                    )
                )}
            </div>

            {/* Items list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                    Loading...
                </div>
            ) : filteredItems.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 60,
                    background: '#f9fafb',
                    borderRadius: 12,
                    border: '2px dashed #e5e7eb',
                }}>
                    <Trash2 size={48} color="#d1d5db" style={{ marginBottom: 16 }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                        Trash is empty
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                        Deleted items will appear here for 30 days
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredItems.map(item => (
                        <TrashItem
                            key={item.id}
                            item={item}
                            onRestore={handleRestore}
                            onPermanentDelete={handlePermanentDelete}
                            restoring={restoring}
                            confirmDelete={confirmDelete}
                            setConfirmDelete={setConfirmDelete}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrashSection;
