import React, { useEffect, useRef, useState } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const YahooHoldingEditForm = ({ colors, holding, onSaved, onCancel }) => {
    const [quantity, setQuantity] = useState(String(holding.quantity ?? ''));
    const [avgCost, setAvgCost] = useState(String(holding.avgCostBasis ?? ''));
    const [notes, setNotes] = useState(holding.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const formRef = useRef(null);

    // The form renders above the table, so bring it into view when a row further down was tapped
    useEffect(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [holding.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const qty = parseFloat(quantity);
        const cost = parseFloat(avgCost);
        if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(cost) || cost < 0) {
            setError('Quantity and average cost must be valid, non-negative numbers');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings/${holding.id}`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: qty, avg_cost_basis: cost, notes }),
            });
            if (response.ok) {
                await onSaved(`${holding.ticker} updated`);
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data.error || 'Failed to update holding');
            }
        } catch {
            setError('Failed to update holding');
        } finally {
            setSaving(false);
        }
    };

    const labelStyle = { display: 'block', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: colors.text };
    const inputStyle = { width: '100%', padding: '0.6rem', border: `2px solid ${colors.border}`, fontSize: '1rem', boxSizing: 'border-box', background: '#fff', color: colors.text };

    return (
        <form ref={formRef} onSubmit={handleSubmit} style={{ border: `2px solid ${colors.border}`, padding: '1rem', marginBottom: '1rem', background: colors.card, scrollMarginTop: '120px' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: colors.primary, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Edit {holding.ticker}{holding.name ? ` — ${holding.name}` : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                    <label style={labelStyle}>Quantity</label>
                    <input type="number" inputMode="decimal" step="any" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Avg Cost ({holding.currency || 'USD'})</label>
                    <input type="number" inputMode="decimal" step="any" min="0" value={avgCost} onChange={e => setAvgCost(e.target.value)} style={inputStyle} />
                </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea dir="auto" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && (
                <div style={{ color: colors.accent, fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.6rem 1rem', background: saving ? colors.textLight : colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.6rem 1rem', background: colors.card, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default YahooHoldingEditForm;
