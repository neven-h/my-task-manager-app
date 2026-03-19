import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, Clock, FileText, CreditCard, CheckSquare } from 'lucide-react';

const ITEM_TYPE_CONFIG = {
    budget_tab: { icon: FileText, label: 'Budget Tab', color: '#10b981' },
    transaction_tab: { icon: CreditCard, label: 'Bank Tab', color: '#3b82f6' },
    task: { icon: CheckSquare, label: 'Task', color: '#8b5cf6' },
};

const TrashItem = ({ item, onRestore, onPermanentDelete, restoring, confirmDelete, setConfirmDelete, formatDate }) => {
    const config = ITEM_TYPE_CONFIG[item.item_type] || { icon: FileText, label: item.item_type, color: '#666' };
    const Icon = config.icon;
    const isDeleting = confirmDelete === item.id;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
            }}
        >
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={20} color={config.color} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>
                    {item.item_name || `${config.label} #${item.item_id}`}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#6b7280' }}>
                    <span style={{
                        padding: '2px 8px',
                        background: `${config.color}15`,
                        color: config.color,
                        borderRadius: 4,
                        fontWeight: 600,
                    }}>
                        {config.label}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        Deleted {formatDate(item.deleted_at)}
                    </span>
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: item.days_remaining <= 7 ? '#dc2626' : '#6b7280',
                        fontWeight: item.days_remaining <= 7 ? 600 : 400,
                    }}>
                        <AlertTriangle size={12} />
                        {item.days_remaining} days left
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {isDeleting ? (
                    <>
                        <button
                            onClick={() => onPermanentDelete(item.id)}
                            style={{
                                padding: '8px 14px',
                                border: '2px solid #dc2626',
                                borderRadius: 8,
                                background: '#dc2626',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Delete Forever
                        </button>
                        <button
                            onClick={() => setConfirmDelete(null)}
                            style={{
                                padding: '8px 12px',
                                border: '2px solid #ccc',
                                borderRadius: 8,
                                background: '#fff',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onRestore(item.id)}
                            disabled={restoring === item.id}
                            style={{
                                padding: '8px 14px',
                                border: '2px solid #10b981',
                                borderRadius: 8,
                                background: '#10b981',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: restoring === item.id ? 'wait' : 'pointer',
                                opacity: restoring === item.id ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <RotateCcw size={14} />
                            {restoring === item.id ? 'Restoring...' : 'Restore'}
                        </button>
                        <button
                            onClick={() => setConfirmDelete(item.id)}
                            style={{
                                padding: '8px 12px',
                                border: '2px solid #dc2626',
                                borderRadius: 8,
                                background: '#fff',
                                color: '#dc2626',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default TrashItem;
