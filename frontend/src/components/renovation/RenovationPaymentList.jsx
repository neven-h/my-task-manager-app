import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { SYS, fmtDec } from './renovationConstants';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import RenovationPaymentForm from './RenovationPaymentForm';

const PaymentRow = ({ payment, onDelete }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '5px 0', borderBottom: `1px solid ${SYS.borderLight}`, fontSize: '0.85rem',
    }}>
        <span style={{ color: SYS.light, minWidth: 90, fontSize: '0.8rem' }}>{payment.payment_date}</span>
        <span style={{ fontWeight: 700, color: SYS.accent, minWidth: 80 }}>₪{fmtDec(payment.amount)}</span>
        <span style={{ flex: 1, color: SYS.light, fontSize: '0.8rem' }}>{payment.notes}</span>
        <button onClick={() => onDelete(payment)} title="Delete payment" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: SYS.light, padding: '2px 4px',
            display: 'flex', alignItems: 'center',
        }}>
            <X size={14} />
        </button>
    </div>
);

const RenovationPaymentList = ({ itemId, onPaymentAdded, onPaymentDeleted }) => {
    const [payments, setPayments] = useState(null);
    const [loadingPay, setLoadingPay] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        setLoadingPay(true);
        fetch(`${API_BASE}/renovation/items/${itemId}/payments`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(d => setPayments(Array.isArray(d) ? d : []))
            .catch(() => setPayments([]))
            .finally(() => setLoadingPay(false));
    }, [itemId]);

    const handleAdded = (payment) => {
        setPayments(prev => [...(prev || []), payment]);
        setShowAddForm(false);
        onPaymentAdded(payment);
    };

    const handleDelete = async (payment) => {
        if (!window.confirm(`Delete payment of ₪${fmtDec(payment.amount)} on ${payment.payment_date}?`)) return;
        try {
            const res = await fetch(`${API_BASE}/renovation/payments/${payment.id}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed');
            setPayments(prev => prev.filter(p => p.id !== payment.id));
            onPaymentDeleted(payment);
        } catch (e) { alert(e.message || 'Delete failed'); }
    };

    if (loadingPay) return <div style={{ padding: '8px 0', color: SYS.light, fontSize: '0.82rem' }}>Loading payments…</div>;

    return (
        <div style={{ paddingLeft: 16, paddingTop: 4, paddingBottom: 8 }}>
            {payments && payments.length > 0 ? (
                payments.map(p => <PaymentRow key={p.id} payment={p} onDelete={handleDelete} />)
            ) : (
                <div style={{ color: SYS.light, fontSize: '0.82rem', padding: '4px 0' }}>No payments yet.</div>
            )}
            {showAddForm ? (
                <RenovationPaymentForm itemId={itemId} onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
            ) : (
                <button onClick={() => setShowAddForm(true)} style={{
                    marginTop: 8, background: 'none', border: `1px dashed ${SYS.border}`,
                    padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8rem', color: SYS.primary, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <Plus size={13} /> Add Payment
                </button>
            )}
        </div>
    );
};

export default RenovationPaymentList;
