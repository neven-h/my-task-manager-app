import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import useTransactionBalanceForecast from '../../hooks/useTransactionBalanceForecast';
import {
    runwayMonths, runwayInfo, healthScore, healthLabel,
    generateInsights, applyWhatIf,
} from '../../utils/cashflowHelpers';
import { SpendingChart } from './SpendingChart';
import { WhatIfControls } from './WhatIfControls';
import { ProjectionTable } from './ProjectionTable';
import { BalanceInputBar } from './BalanceInputBar';
import { HealthCard, AnomalyCard } from './HealthCard';

// ── Main component ────────────────────────────────────────────────────────────
const TransactionBalanceForecast = () => {
    const { activeTabId } = useBankTransactionContext();
    const {
        data, loading,
        startingBalance, setStartingBalance,
        fetchForecast,
    } = useTransactionBalanceForecast(activeTabId);

    const [open, setOpen]            = useState(false);
    const [editingBal, setEditingBal] = useState(false);
    const [balInput, setBalInput]    = useState('');
    const [adjust, setAdjust]        = useState(0);

    useEffect(() => { setOpen(false); setAdjust(0); }, [activeTabId]);

    const toggle = async () => {
        if (!open && !data) await fetchForecast(3);
        setOpen(v => !v);
    };
    const saveBalance = () => {
        const v = parseFloat(balInput.replace(/[^0-9.-]/g, ''));
        if (!isNaN(v)) { setStartingBalance(v); }
        setEditingBal(false);
    };

    // ── Derived values ──────────────────────────────────────────────────────
    const runway   = useMemo(() =>
        runwayMonths(startingBalance, data?.avg_monthly_spend), [startingBalance, data]);
    const rwInfo   = runwayInfo(runway);
    const score    = useMemo(() =>
        healthScore(runway, data?.momentum, data?.anomalies?.length ?? 0), [runway, data]);
    const hlLabel  = healthLabel(score);
    const insights = useMemo(() =>
        generateInsights(data, startingBalance), [data, startingBalance]);

    const { adjusted: adjMonthly, endBalance: adjEndBal } = useMemo(() =>
        applyWhatIf(data?.predicted_monthly, startingBalance, adjust),
        [data, startingBalance, adjust]);

    const baseEndBal = useMemo(() =>
        data?.predicted_monthly?.reduce((b, m) => b - m.total, startingBalance ?? 0) ?? null,
        [data, startingBalance]);

    const needsBalance = startingBalance === null;
    const anomalies    = data?.anomalies ?? [];

    return (
        <div style={{
            marginBottom: '1.5rem',
            border: `2px solid ${hlLabel.bg === '#fef2f2' ? '#fecaca' : '#d1fae5'}`,
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                color: '#fff', cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.95rem' }}>
                    <TrendingUp size={18} />
                    Balance Forecast
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {runway != null && (
                        <span style={{
                            background: 'rgba(255,255,255,0.18)',
                            padding: '3px 10px', borderRadius: 20,
                            fontSize: '0.77rem', fontWeight: 800,
                        }}>
                            {rwInfo.emoji} {rwInfo.label} runway
                        </span>
                    )}
                    {adjust !== 0 && (
                        <span style={{
                            background: 'rgba(255,255,255,0.18)',
                            padding: '3px 10px', borderRadius: 20,
                            fontSize: '0.74rem', fontWeight: 700,
                            color: adjust < 0 ? '#bbf7d0' : '#fca5a5',
                        }}>
                            {adjust > 0 ? '+' : ''}{adjust}% scenario
                        </span>
                    )}
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {/* ── Balance input ─────────────────────────────────── */}
                    <BalanceInputBar
                        startingBalance={startingBalance}
                        editingBal={editingBal}
                        setEditingBal={setEditingBal}
                        balInput={balInput}
                        setBalInput={setBalInput}
                        needsBalance={needsBalance}
                        saveBalance={saveBalance}
                    />

                    {/* ── Loading ───────────────────────────────────────── */}
                    {loading && (
                        <div style={{ padding: 24, textAlign: 'center', fontWeight: 700, color: '#0d9488' }}>
                            <span style={{ marginRight: 8 }}>✦</span> Analysing patterns…
                        </div>
                    )}

                    {!loading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                            Not enough transaction history to forecast.
                        </div>
                    )}

                    {!loading && data && (<>

                        {/* ── AI Health Card ────────────────────────────── */}
                        {startingBalance != null && (
                            <HealthCard
                                score={score}
                                hlLabel={hlLabel}
                                rwInfo={rwInfo}
                                insights={insights}
                                avgMonthlySpend={data.avg_monthly_spend}
                            />
                        )}

                        {/* ── Anomaly alerts ────────────────────────────── */}
                        {anomalies.length > 0 && (
                            <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <div style={{
                                    padding: '7px 16px', background: '#fff1f2',
                                    fontSize: '0.72rem', fontWeight: 700, color: '#be123c',
                                    textTransform: 'uppercase', letterSpacing: '0.4px',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    <AlertTriangle size={11} />
                                    Spending spikes this month
                                </div>
                                {anomalies.map((a, i) => (
                                    <AnomalyCard key={i} anomaly={a} />
                                ))}
                            </div>
                        )}

                        {/* ── Bar chart ─────────────────────────────────── */}
                        <div style={{ padding: '14px 20px 6px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Monthly spending — actual vs forecast
                                {adjust !== 0 && (
                                    <span style={{ marginLeft: 8, color: adjust < 0 ? '#16a34a' : '#dc2626' }}>
                                        ({adjust > 0 ? '+' : ''}{adjust}% scenario)
                                    </span>
                                )}
                            </div>
                            <SpendingChart
                                monthly_history={data.monthly_history}
                                predicted_monthly={data.predicted_monthly}
                                adjust={adjust}
                            />
                        </div>

                        {/* ── What-if controls ──────────────────────────── */}
                        <WhatIfControls adjust={adjust} setAdjust={setAdjust} />

                        {/* ── Projection table ──────────────────────────── */}
                        {startingBalance != null && adjMonthly.length > 0 && (
                            <ProjectionTable
                                adjMonthly={adjMonthly}
                                adjust={adjust}
                                baseEndBal={baseEndBal}
                                adjEndBal={adjEndBal}
                            />
                        )}

                    </>)}
                </div>
            )}
        </div>
    );
};

export default TransactionBalanceForecast;
