import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { SYS, fmt } from './renovationConstants';
import RenovationStatusBadge from './RenovationStatusBadge';
import RenovationItemForm from './RenovationItemForm';
import RenovationPaymentList from './RenovationPaymentList';

const RenovationItem = ({ item, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localItem, setLocalItem] = useState(item);

    useEffect(() => { setLocalItem(item); }, [item]);

    const handleSave = async (form) => {
        setSaving(true);
        try {
            const updated = await onUpdate(item.id, {
                name: form.name,
                area: form.area || null,
                contractor: form.contractor || null,
                category: form.category || null,
                estimated_cost: form.estimated_cost !== '' ? parseFloat(form.estimated_cost) : null,
                status: form.status,
                notes: form.notes || null,
            });
            setLocalItem(updated);
            setEditing(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${localItem.name}" and all its payments?`)) return;
        try { await onDelete(item.id); } catch (e) { alert(e.message); }
    };

    const remaining = Math.max(0, (localItem.estimated_cost ?? 0) - (localItem.total_paid ?? 0));
    const overage = localItem.estimated_cost != null
        ? Math.max(0, (localItem.total_paid ?? 0) - localItem.estimated_cost)
        : 0;

    if (editing) {
        return (
            <div style={{ border: `2px solid ${SYS.primary}`, padding: '16px', marginBottom: 8, background: '#f5f8ff' }}>
                <RenovationItemForm
                    initial={{
                        name: localItem.name || '',
                        area: localItem.area || '',
                        contractor: localItem.contractor || '',
                        category: localItem.category || '',
                        estimated_cost: localItem.estimated_cost != null ? String(localItem.estimated_cost) : '',
                        status: localItem.status || 'planned',
                        notes: localItem.notes || '',
                    }}
                    onSave={handleSave}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                />
            </div>
        );
    }

    return (
        <div style={{ border: `2px solid ${SYS.borderLight}`, marginBottom: 6, background: SYS.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
                <button onClick={() => setExpanded(e => !e)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: SYS.light,
                    display: 'flex', alignItems: 'center',
                }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <span style={{ flex: '2 1 140px', fontWeight: 700, fontSize: '0.92rem' }}>{localItem.name}</span>

                {localItem.contractor && (
                    <span style={{ flex: '1 1 100px', fontSize: '0.82rem', color: SYS.light }}>{localItem.contractor}</span>
                )}

                <RenovationStatusBadge status={localItem.status} />

                <div style={{ flex: '1 1 120px', textAlign: 'right', fontSize: '0.85rem' }}>
                    {localItem.estimated_cost != null ? (
                        <>
                            <span style={{ color: SYS.accent, fontWeight: 700 }}>₪{fmt(localItem.total_paid)}</span>
                            <span style={{ color: SYS.light }}> / </span>
                            <span style={{ fontWeight: 700 }}>₪{fmt(localItem.estimated_cost)}</span>
                            {remaining > 0 && (
                                <span style={{ color: SYS.light, fontSize: '0.78rem' }}> (₪{fmt(remaining)} left)</span>
                            )}
                            {overage > 0 && (
                                <span style={{ color: SYS.accent, fontSize: '0.78rem', fontWeight: 700 }}> ⚠ ₪{fmt(overage)} over</span>
                            )}
                            {remaining <= 0 && overage <= 0 && localItem.estimated_cost > 0 && (
                                <span style={{ color: SYS.success, fontSize: '0.78rem' }}> ✓</span>
                            )}
                        </>
                    ) : (
                        <span style={{ color: SYS.accent, fontWeight: 700 }}>₪{fmt(localItem.total_paid)}</span>
                    )}
                </div>

                <button onClick={() => setEditing(true)} title="Edit" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: SYS.light, padding: '2px 4px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <Edit2 size={14} />
                </button>
                <button onClick={handleDelete} title="Delete" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: SYS.accent, padding: '2px 4px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <Trash2 size={14} />
                </button>
            </div>

            {localItem.notes && (
                <div style={{ padding: '0 12px 6px 36px', fontSize: '0.8rem', color: SYS.light }}>
                    {localItem.notes}
                </div>
            )}

            {expanded && (
                <div style={{ borderTop: `1px solid ${SYS.borderLight}`, padding: '8px 12px 4px 36px' }}>
                    <RenovationPaymentList
                        itemId={item.id}
                        onPaymentAdded={(payment) => {
                            setLocalItem(prev => ({ ...prev, total_paid: (prev.total_paid || 0) + payment.amount }));
                        }}
                        onPaymentDeleted={(payment) => {
                            setLocalItem(prev => ({ ...prev, total_paid: Math.max(0, (prev.total_paid || 0) - payment.amount) }));
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default RenovationItem;
