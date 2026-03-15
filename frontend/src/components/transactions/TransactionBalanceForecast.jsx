import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, ChevronDown, ChevronUp,
    Edit3, Check, X, AlertTriangle, Zap,
} from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import useTransactionBalanceForecast from '../../hooks/useTransactionBalanceForecast';
import {
    runwayMonths, runwayInfo, healthScore, healthLabel,
    generateInsights, applyWhatIf, WHAT_IF_OPTIONS,
} from '../../utils/cashflowHelpers';

const fmt  = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// Compact axis label — avoids locale RTL issues in SVG text
const fmtAxis = (n) => {
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `₪${Math.round(n / 1000)}k`;
    return `₪${Math.round(n)}`;
};

// ── Bar chart (history + predicted) ─────────────────────────────────────────
const SpendingChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const H = 150, LEFT = 36, BOTTOM = 26;
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const plotH  = H - BOTTOM;
    const total  = allMonths.length;
    const bw     = (100 - LEFT) / total;
    const gap    = bw * 0.22;

    return (
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}>
            {[0.33, 0.67, 1].map(pct => {
                const y = plotH * (1 - pct);
                return (
                    <g key={pct}>
                        <line x1={LEFT} y1={y} x2={100} y2={y} stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="1,1" />
                        <text x={LEFT - 1} y={y + 1.5} textAnchor="end" fontSize="3.2" fill="#9ca3af"
                            style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                            {fmtAxis(maxVal * pct)}
                        </text>
                    </g>
                );
            })}

            {allMonths.map((m, i) => {
                const x    = LEFT + i * bw + gap / 2;
                const bwI  = bw - gap;
                const barH = plotH * (m.total / maxVal);
                const y    = plotH - barH;
                const isPred = m.type === 'predicted';
                const fill = isPred
                    ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(13,148,136,0.4)')
                    : '#0d9488';
                return (
                    <g key={`${m.month}-${i}`}>
                        {isPred && (
                            <rect x={x} y={0} width={bwI} height={plotH} fill="rgba(0,0,0,0.02)" />
                        )}
                        <rect x={x} y={y} width={bwI} height={barH} fill={fill} rx="0.8"
                            stroke={isPred ? fill : 'none'} strokeWidth="0.3"
                            strokeDasharray={isPred ? '1,0.8' : 'none'}
                            opacity={isPred ? 0.85 : 1} />
                        <text x={x + bwI / 2} y={H - 1} textAnchor="middle" fontSize="3.2" fill="#6b7280">
                            {fmtM(m.month).split(' ')[0]}
                        </text>
                    </g>
                );
            })}

            {predicted_monthly.length > 0 && monthly_history.length > 0 && (() => {
                const divX = LEFT + monthly_history.length * bw;
                return (
                    <>
                        <line x1={divX} y1={0} x2={divX} y2={plotH}
                            stroke="#0d9488" strokeWidth="0.5" strokeDasharray="1.5,1" />
                        <text x={divX + 0.8} y={5} fontSize="3" fill="#0d9488" fontWeight="700">
                            Forecast →
                        </text>
                    </>
                );
            })()}
        </svg>
    );
};

// ── Health ring (simple SVG arc gauge) ───────────────────────────────────────
const HealthRing = ({ score, label }) => {
    const R = 18, C = 2 * Math.PI * R;
    const pct = Math.max(0, Math.min(1, score / 100));
    const dash = C * pct;
    const color = label.color;
    return (
        <svg width="52" height="52" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={R} fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle cx="22" cy="22" r={R} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${C}`} strokeDashoffset={C / 4}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
            <text x="22" y="24" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>
                {score}
            </text>
        </svg>
    );
};

// ── Anomaly card ──────────────────────────────────────────────────────────────
const AnomalyCard = ({ anomaly }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', borderBottom: '1px dashed #fecaca',
        fontSize: '0.83rem',
    }}>
        <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>{anomaly.description}</span>
            <span style={{ color: '#6b7280' }}> — ₪{fmt(anomaly.current, true)} this month</span>
        </div>
        <div style={{
            background: '#fef2f2', color: '#dc2626',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.73rem', fontWeight: 800, flexShrink: 0,
        }}>
            +{anomaly.pct_above}% vs avg
        </div>
    </div>
);

// ── What-if controls ──────────────────────────────────────────────────────────
const WhatIfControls = ({ adjust, setAdjust }) => (
    <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
    }}>
        <div style={{
            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
        }}>
            <Zap size={11} /> What if I adjust spending?
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WHAT_IF_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setAdjust(opt.value)} style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: `1.5px solid ${adjust === opt.value ? '#0d9488' : '#d1d5db'}`,
                    background: adjust === opt.value ? '#0d9488' : '#fff',
                    color: adjust === opt.value ? '#fff' : opt.value < 0 ? '#16a34a' : opt.value > 0 ? '#dc2626' : '#374151',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}>
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const TransactionBalanceForecast = () => {
    const { activeTabId } = useBankTransactionContext();
    const {
        data, loading,
        startingBalance, setStartingBalance, clearStartingBalance,
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
                    <div style={{
                        padding: '12px 20px',
                        background: needsBalance ? '#f0fdf4' : '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                            Current balance:
                        </span>
                        {editingBal || needsBalance ? (
                            <>
                                <input autoFocus type="number" value={balInput}
                                    onChange={e => setBalInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBal(false); }}
                                    placeholder="e.g. 15000"
                                    style={{
                                        border: '1.5px solid #0d9488', borderRadius: 6,
                                        padding: '5px 10px', fontSize: '0.88rem',
                                        fontWeight: 700, width: 120, outline: 'none',
                                    }} />
                                <button onClick={saveBalance} style={{
                                    background: '#0d9488', color: '#fff', border: 'none',
                                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '0.82rem',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <Check size={13} /> Save
                                </button>
                                {!needsBalance && (
                                    <button onClick={() => setEditingBal(false)} style={{
                                        background: 'none', border: '1px solid #d1d5db', borderRadius: 6,
                                        padding: '5px 10px', cursor: 'pointer', color: '#6b7280',
                                    }}>
                                        <X size={13} />
                                    </button>
                                )}
                                {needsBalance && (
                                    <span style={{ fontSize: '0.77rem', color: '#6b7280', marginLeft: 4 }}>
                                        Enter your account balance to see AI insights
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span style={{
                                    fontWeight: 900, fontSize: '1.1rem',
                                    color: startingBalance >= 0 ? '#059669' : '#dc2626',
                                }}>
                                    {startingBalance < 0 ? '−' : ''}₪{fmt(startingBalance, true)}
                                </span>
                                <button onClick={() => { setBalInput(String(startingBalance)); setEditingBal(true); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                                    <Edit3 size={14} />
                                </button>
                            </>
                        )}
                    </div>

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
                            <div style={{
                                padding: '14px 20px',
                                background: hlLabel.bg,
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex', gap: 16, alignItems: 'flex-start',
                            }}>
                                <HealthRing score={score} label={hlLabel} />
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 800, fontSize: '0.9rem',
                                        color: hlLabel.color, marginBottom: 6,
                                    }}>
                                        {hlLabel.text} — {rwInfo.emoji} {rwInfo.label} runway
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {insights.map((line, i) => (
                                            <div key={i} style={{
                                                fontSize: '0.8rem', color: '#374151',
                                                fontWeight: 500, lineHeight: 1.4,
                                            }}>
                                                {line}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Avg/month
                                    </div>
                                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#111827' }}>
                                        ₪{fmt(data.avg_monthly_spend, true)}
                                    </div>
                                </div>
                            </div>
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
                            <div style={{ borderTop: '1px solid #e5e7eb' }}>
                                <div style={{
                                    padding: '8px 16px', background: '#f9fafb',
                                    fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
                                    textTransform: 'uppercase', letterSpacing: '0.4px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span>Projected balance</span>
                                    {adjust !== 0 && baseEndBal != null && adjEndBal != null && (
                                        <span style={{
                                            fontSize: '0.73rem', fontWeight: 700,
                                            color: (adjEndBal - baseEndBal) > 0 ? '#16a34a' : '#dc2626',
                                        }}>
                                            {(adjEndBal - baseEndBal) > 0 ? '+' : ''}
                                            ₪{fmt(adjEndBal - baseEndBal)} vs baseline
                                        </span>
                                    )}
                                </div>
                                {adjMonthly.map((row, i) => (
                                    <div key={row.month} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '9px 16px',
                                        borderBottom: i < adjMonthly.length - 1 ? '1px dashed #e5e7eb' : 'none',
                                        fontSize: '0.84rem',
                                    }}>
                                        <div style={{ width: 68, fontWeight: 700, color: '#555', flexShrink: 0 }}>
                                            {fmtM(row.month)}
                                        </div>
                                        <div style={{ flex: 1, color: '#6b7280', fontSize: '0.78rem' }}>
                                            −₪{fmt(row.total, true)} spending
                                        </div>
                                        <div style={{
                                            fontWeight: 900, fontSize: '0.95rem',
                                            color: row.balance >= 0 ? '#059669' : '#dc2626',
                                        }}>
                                            {row.balance < 0 ? '−' : ''}₪{fmt(row.balance, true)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </>)}
                </div>
            )}
        </div>
    );
};

export default TransactionBalanceForecast;
