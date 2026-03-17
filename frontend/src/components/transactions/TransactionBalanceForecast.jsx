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
    const [isDesktop, setIsDesktop]  = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 1100 : true
    );

    useEffect(() => { setOpen(false); setAdjust(0); }, [activeTabId]);
    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 1100);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

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
                padding: isDesktop ? '16px 24px' : '14px 20px',
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                color: '#fff', cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontWeight: 800,
                    fontSize: isDesktop ? '1.08rem' : '0.95rem',
                    letterSpacing: '0.2px',
                }}>
                    <TrendingUp size={18} />
                    Expenses Forecast
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
                        <div style={{ padding: isDesktop ? '18px 24px 10px' : '14px 20px 6px' }}>
                            <div style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: 14,
                                background: isDesktop ? '#f8fafc' : '#ffffff',
                                padding: isDesktop ? '18px 18px 14px' : '12px 12px 10px',
                                boxShadow: isDesktop ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: isDesktop ? 'row' : 'column',
                                    alignItems: isDesktop ? 'center' : 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    marginBottom: 12,
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            color: '#9ca3af',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            marginBottom: 4,
                                        }}>
                                            Monthly spending — actual vs forecast
                                        </div>
                                        <div style={{
                                            fontSize: isDesktop ? '0.95rem' : '0.84rem',
                                            fontWeight: 600,
                                            color: '#334155',
                                            lineHeight: 1.45,
                                            maxWidth: isDesktop ? '80%' : '100%',
                                        }}>
                                            Compare recent monthly spending with the forecast for the next months.
                                        </div>
                                    </div>
                                    {adjust !== 0 && (
                                        <span style={{
                                            alignSelf: isDesktop ? 'center' : 'flex-start',
                                            background: adjust < 0 ? '#dcfce7' : '#fee2e2',
                                            color: adjust < 0 ? '#166534' : '#b91c1c',
                                            borderRadius: 999,
                                            padding: '6px 10px',
                                            fontSize: '0.76rem',
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {adjust > 0 ? '+' : ''}{adjust}% scenario
                                        </span>
                                    )}
                                </div>
                                <div style={{
                                    padding: isDesktop ? '8px 8px 0' : '0',
                                }}>
                                    <SpendingChart
                                        monthly_history={data.monthly_history}
                                        predicted_monthly={data.predicted_monthly}
                                        adjust={adjust}
                                    />
                                </div>
                            </div>
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
