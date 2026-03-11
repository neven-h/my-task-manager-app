import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { FONT_STACK } from '../../theme';

const IOS = {
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    green:     '#34C759',
    red:       '#FF3B30',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    radius:    16,
};

const fmt    = (n) => Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const confBg = (c) => c >= 0.7 ? '#34C75922' : c >= 0.5 ? '#FF950022' : '#FF3B3022';
const confFg = (c) => c >= 0.7 ? IOS.green    : c >= 0.5 ? '#FF9500'   : IOS.red;

const MobileBankForecast = ({ predictions, onFetch, loading }) => {
    const [open, setOpen] = useState(false);

    const handleToggle = () => {
        if (!open && predictions.length === 0) onFetch();
        setOpen(o => !o);
    };

    const credits  = predictions.filter(p => p.transaction_type === 'credit');
    const debits   = predictions.filter(p => p.transaction_type !== 'credit');
    const totalIn  = credits.reduce((s, p) => s + p.predicted_amount, 0);
    const totalOut = debits.reduce((s, p) => s + p.predicted_amount, 0);
    const net      = totalIn - totalOut;

    return (
        <div style={{ margin: '12px 16px 0', fontFamily: FONT_STACK }}>
            {/* Toggle button */}
            <button type="button" onClick={handleToggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 16px',
                border: 'none', borderRadius: IOS.radius,
                background: open ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : IOS.card,
                color: open ? '#fff' : '#000',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: FONT_STACK,
                transition: 'background 0.2s',
            }}>
                <Zap size={16} />
                {open ? 'Hide' : 'Show'} AI Forecast
                {predictions.length > 0 && (
                    <span style={{
                        background: open ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                        color: open ? '#fff' : '#6366f1',
                        borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                        {predictions.length}
                    </span>
                )}
            </button>

            {/* Expanded panel */}
            {open && (
                <div style={{
                    background: IOS.card, borderRadius: IOS.radius,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    marginTop: 8, overflow: 'hidden',
                }}>
                    {/* Empty / loading state */}
                    {predictions.length === 0 && (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            {loading ? '✦ Running Chronos deep learning model…' : 'Not enough recurring data to predict.'}
                        </div>
                    )}

                    {predictions.length > 0 && (<>
                        {/* Summary row */}
                        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `0.5px solid ${IOS.separator}`, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase' }}>3-month projection:</span>
                            <span style={{ fontWeight: 700, color: IOS.green,                  fontSize: '0.85rem' }}>+₪{fmt(totalIn)}</span>
                            <span style={{ fontWeight: 700, color: IOS.red,                    fontSize: '0.85rem' }}>−₪{fmt(totalOut)}</span>
                            <span style={{ fontWeight: 700, color: net >= 0 ? IOS.blue : IOS.red, fontSize: '0.85rem' }}>
                                Net: {net >= 0 ? '+' : '−'}₪{fmt(net)}
                            </span>
                        </div>

                        {/* Prediction rows */}
                        {predictions.map((p, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                                borderBottom: i < predictions.length - 1 ? `0.5px solid ${IOS.separator}` : 'none',
                                fontSize: '0.82rem',
                            }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p.transaction_type === 'credit' ? IOS.green : IOS.red }} />
                                <div style={{ width: 52, flexShrink: 0, fontWeight: 600, color: IOS.muted }}>{dayFmt(p.predicted_date)}</div>
                                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                                <div style={{ fontWeight: 700, color: p.transaction_type === 'credit' ? IOS.green : IOS.red, flexShrink: 0 }}>
                                    {p.transaction_type === 'credit' ? '+' : '−'}₪{fmt(p.predicted_amount)}
                                </div>
                                <div style={{ flexShrink: 0, padding: '2px 7px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700, background: confBg(p.confidence), color: confFg(p.confidence) }}>
                                    {Math.round(p.confidence * 100)}%
                                </div>
                            </div>
                        ))}
                    </>)}
                </div>
            )}
        </div>
    );
};

export default MobileBankForecast;
