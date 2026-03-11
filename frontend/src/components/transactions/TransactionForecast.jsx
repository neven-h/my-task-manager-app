import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const CONF_COLOR = (c) => c >= 0.7 ? '#00AA00' : c >= 0.5 ? '#FF8800' : '#FF0000';

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
        <div style={{ marginBottom: '1.5rem', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
            {/* Header row */}
            <div
                onClick={toggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', background: '#000', color: '#fff', cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Sparkles size={18} />
                    AI Forecast
                    {txPredictions.length > 0 && (
                        <span style={{ background: '#FFD500', color: '#000', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 900, marginLeft: 4 }}>
                            {txPredictions.length}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {loading && (
                        <div style={{ padding: '20px', textAlign: 'center', fontWeight: 700, color: '#666' }}>
                            Analysing transaction history…
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
                            <div style={{ padding: '10px 20px', background: '#fffbe6', borderBottom: '2px solid #000', display: 'flex', gap: 24, alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    Next 3 months projected:
                                </span>
                                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: colors.accent }}>
                                    ₪{projectedTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <button
                                    onClick={async (e) => { e.stopPropagation(); setLoading(true); await fetchTransactionPredictions(3); setLoading(false); }}
                                    style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', border: '2px solid #000', background: '#fff', cursor: 'pointer' }}
                                >
                                    Refresh
                                </button>
                            </div>

                            {/* Prediction rows */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #000' }}>
                                        {['Date', 'Description', 'Type', 'Amount', 'Confidence', 'Every'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', whiteSpace: 'nowrap' }}>
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
                                            <td style={{ padding: '8px 12px', fontWeight: 900, fontSize: '0.9rem', color: colors.accent, whiteSpace: 'nowrap' }}>
                                                ₪{p.predicted_amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <span style={{ background: CONF_COLOR(p.confidence), color: '#fff', padding: '2px 8px', fontWeight: 900, fontSize: '0.75rem' }}>
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
