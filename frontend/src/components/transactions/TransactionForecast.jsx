import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { groupPredictions, activePredictions, loadDismissed, saveDismissed, emptyStateMessage } from '../../utils/forecastHelpers';
import GroupSection from './TransactionForecastGroup';

const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TransactionForecast = () => {
    const { txPredictions, fetchTransactionPredictions, colors, activeTabId } = useBankTransactionContext();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(() => loadDismissed(activeTabId));

    useEffect(() => { setDismissed(loadDismissed(activeTabId)); }, [activeTabId]);

    const toggle = async () => {
        if (!open && txPredictions.length === 0) {
            setLoading(true);
            await fetchTransactionPredictions(3);
            setLoading(false);
        }
        setOpen(v => !v);
    };

    const dismiss = (idx) => {
        setDismissed(prev => { const s = new Set(prev).add(idx); saveDismissed(activeTabId, s); return s; });
    };
    const restore = (idx) => {
        setDismissed(prev => { const s = new Set(prev); s.delete(idx); saveDismissed(activeTabId, s); return s; });
    };

    const active = activePredictions(txPredictions, dismissed);
    const projectedTotal = active.reduce((s, p) => s + p.predicted_amount, 0);
    const groups = useMemo(() => groupPredictions(txPredictions, dismissed), [txPredictions, dismissed]);

    return (
        <div style={{ marginBottom: '1.5rem', border: '2px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div onClick={toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#64748b', color: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                    <Sparkles size={18} />
                    AI Forecast
                    {txPredictions.length > 0 && (
                        <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800, borderRadius: 20 }}>
                            {active.length}{dismissed.size > 0 ? `/${txPredictions.length}` : ''}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {loading && (
                        <div style={{ padding: 20, textAlign: 'center', fontWeight: 700, color: '#0000FF' }}>
                            <span style={{ marginRight: 8 }}>✦</span> Analyzing recurring patterns…
                        </div>
                    )}
                    {!loading && txPredictions.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontWeight: 600 }}>{emptyStateMessage(false)}</div>
                    )}
                    {!loading && txPredictions.length > 0 && (<>
                        <div style={{ padding: '10px 20px', background: '#f5f3ff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0000FF' }}>Next 3 months:</span>
                            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: colors?.accent || '#dc2626' }}>₪{fmt(projectedTotal)}</span>
                            {dismissed.size > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>({dismissed.size} dismissed)</span>
                            )}
                            <button
                                onClick={async (e) => { e.stopPropagation(); setLoading(true); const s = new Set(); setDismissed(s); saveDismissed(activeTabId, s); await fetchTransactionPredictions(3); setLoading(false); }}
                                style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#0000FF' }}
                            >
                                Refresh
                            </button>
                        </div>
                        <GroupSection groupKey="fixed"     items={groups.fixed}     onDismiss={dismiss} onRestore={restore} />
                        <GroupSection groupKey="variable"  items={groups.variable}  onDismiss={dismiss} onRestore={restore} />
                        <GroupSection groupKey="anomalies" items={groups.anomalies} onDismiss={dismiss} onRestore={restore} />
                    </>)}
                </div>
            )}
        </div>
    );
};

export default TransactionForecast;
