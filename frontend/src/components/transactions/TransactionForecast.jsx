import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const CONF_COLOR  = (c) => c >= 0.7 ? '#22c55e' : c >= 0.5 ? '#f59e0b' : '#ef4444';
const fmt = (n) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TransactionForecast = () => {
    const { txPredictions, fetchTransactionPredictions, colors } = useBankTransactionContext();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        if (!open && txPredictions.length === 0) {
            setLoading(true);
            await fetchTransactionPredictions(3);
            setLoading(false);
        }
        setOpen(v => !v);
    };

    const projectedTotal = txPredictions.reduce((s, p) => s + p.predicted_amount, 0);

    return (
        <div style={{ marginBottom: '1.5rem', border: '2px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {/* Header row */}
            <div
                onClick={toggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', background: '#64748b', color: '#ffffff', color: '#fff', cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                    <Sparkles size={18} />
                    AI Forecast
                    {txPredictions.length > 0 && (
                        <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800, marginLeft: 4, borderRadius: 20 }}>
                            {txPredictions.length}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {loading && (
                        <div style={{ padding: '20px', textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>
                            <span style={{ marginRight: 8 }}>✦</span>
                            Running Chronos deep learning model…
                        </div>
                    )}

                    {!loading && txPredictions.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontWeight: 600 }}>
                            No recurring patterns detected yet. Upload more transaction history to enable forecasting.
                        </div>
                    )}

                    {!loading && txPredictions.length > 0 && (
                        <>
                            {/* Summary bar */}
                            <div style={{ padding: '10px 20px', background: '#f5f3ff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 24, alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6366f1' }}>
                                    Next 3 months projected:
                                </span>
                                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: colors.accent }}>
                                    ₪{fmt(projectedTotal)}
                                </span>
                                <button
                                    onClick={async (e) => { e.stopPropagation(); setLoading(true); await fetchTransactionPredictions(3); setLoading(false); }}
                                    style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#6366f1' }}
                                >
                                    Refresh
                                </button>
                            </div>

                            {/* Prediction rows */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        {['Date', 'Description', 'Type', 'Amount (80% range)', 'Confidence', 'Every'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', whiteSpace: 'nowrap', color: '#6b7280' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {txPredictions.map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px dashed #ccc', opacity: 0.9 }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap', color: '#444', fontSize: '0.875rem' }}>{p.predicted_date}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.875rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>{p.transaction_type}</td>
                                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: colors.accent }}>
                                                    ₪{fmt(p.predicted_amount)}
                                                </span>
                                                {p.predicted_amount_low != null && (
                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 1 }}>
                                                        ₪{fmt(p.predicted_amount_low)} – ₪{fmt(p.predicted_amount_high)}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <span style={{ background: CONF_COLOR(p.confidence), color: '#fff', padding: '2px 10px', fontWeight: 700, fontSize: '0.72rem', borderRadius: 20 }}>
                                                    {Math.round(p.confidence * 100)}%
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>{p.interval_days}d</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionForecast;
