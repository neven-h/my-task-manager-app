import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Edit3, Check, X, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import useTransactionBalanceForecast from '../../../hooks/useTransactionBalanceForecast';
import {
    runwayMonths, runwayInfo, healthScore, healthLabel,
    generateInsights, applyWhatIf, WHAT_IF_OPTIONS,
} from '../../../utils/cashflowHelpers';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmt  = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// ── Mini bar chart ────────────────────────────────────────────────────────────
const MiniChart = ({ monthly_history, predicted_monthly, adjust }) => {
    const H = 90, BOTTOM = 18;
    const factor = 1 + adjust / 100;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, total: Math.round(m.total * factor), type: 'predicted' })),
    ];
    if (!allMonths.length) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const plotH  = H - BOTTOM;
    const total  = allMonths.length;
    const bw     = 100 / total;
    const gap    = bw * 0.22;

    return (
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
            style={{ display: 'block' }}>
            {allMonths.map((m, i) => {
                const x    = i * bw + gap / 2;
                const bwI  = bw - gap;
                const barH = plotH * (m.total / maxVal);
                const y    = plotH - barH;
                const isPred = m.type === 'predicted';
                const fill = isPred
                    ? (adjust < 0 ? '#22c55e' : adjust > 0 ? '#ef4444' : 'rgba(48,176,199,0.45)')
                    : IOS.teal;
                return (
                    <g key={`${m.month}-${i}`}>
                        <rect x={x} y={y} width={bwI} height={barH} fill={fill} rx="1"
                            strokeDasharray={isPred ? '1,0.8' : 'none'}
                            stroke={isPred ? fill : 'none'} strokeWidth="0.4" opacity={isPred ? 0.9 : 1} />
                        <text x={x + bwI / 2} y={H - 2} textAnchor="middle" fontSize="4" fill={IOS.label}>
                            {fmtM(m.month).split(' ')[0]}
                        </text>
                    </g>
                );
            })}
            {predicted_monthly.length > 0 && monthly_history.length > 0 && (
                <line x1={monthly_history.length * bw} y1={0}
                    x2={monthly_history.length * bw} y2={plotH}
                    stroke={IOS.teal} strokeWidth="0.6" strokeDasharray="1.5,1" />
            )}
        </svg>
    );
};

// ── Health badge ──────────────────────────────────────────────────────────────
const HealthBadge = ({ score, label }) => (
    <div style={{
        background: label.bg, borderRadius: 10,
        padding: '6px 12px', textAlign: 'center', minWidth: 80,
    }}>
        <div style={{ fontWeight: 900, fontSize: '1.4rem', color: label.color, lineHeight: 1 }}>
            {score}
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: label.color, textTransform: 'uppercase', marginTop: 2 }}>
            {label.text}
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const MobileTransactionBalanceForecast = ({ activeTabId }) => {
    const {
        data, loading, startingBalance, setStartingBalance,
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
        if (!isNaN(v)) { setStartingBalance(v); setEditingBal(false); }
    };

    const runway   = useMemo(() => runwayMonths(startingBalance, data?.avg_monthly_spend), [startingBalance, data]);
    const rwInfo   = runwayInfo(runway);
    const score    = useMemo(() => healthScore(runway, data?.momentum, data?.anomalies?.length ?? 0), [runway, data]);
    const hlLabel  = healthLabel(score);
    const insights = useMemo(() => generateInsights(data, startingBalance), [data, startingBalance]);

    const { adjusted: adjMonthly, endBalance: adjEndBal } = useMemo(() =>
        applyWhatIf(data?.predicted_monthly, startingBalance, adjust),
        [data, startingBalance, adjust]);

    const baseEndBal = useMemo(() =>
        data?.predicted_monthly?.reduce((b, m) => b - m.total, startingBalance ?? 0) ?? null,
        [data, startingBalance]);

    const needsBalance = startingBalance === null;
    const anomalies    = data?.anomalies ?? [];

    return (
        <div style={{ padding: '8px 16px 4px', fontFamily: FONT_STACK }}>
            {/* ── Header ───────────────────────────────────────────────── */}
            <div onClick={toggle} style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                borderRadius: open ? '16px 16px 0 0' : 16,
                padding: '13px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrendingUp size={18} color="#fff" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                        Balance Forecast
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {runway != null && (
                        <span style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '2px 8px', borderRadius: 12,
                            fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                        }}>
                            {rwInfo.emoji} {rwInfo.label}
                        </span>
                    )}
                    {open ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
                </div>
            </div>

            {open && (
                <div style={{
                    background: IOS.card,
                    borderRadius: '0 0 16px 16px',
                    border: `0.5px solid ${IOS.sep}`,
                    borderTop: 'none', marginBottom: 8,
                    overflow: 'hidden',
                }}>
                    {/* ── Balance input ─────────────────────────────────── */}
                    <div style={{
                        padding: '12px 16px',
                        background: needsBalance ? '#f0fdf4' : '#f9fafb',
                        borderBottom: `0.5px solid ${IOS.sep}`,
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                            Current balance:
                        </span>
                        {editingBal || needsBalance ? (
                            <>
                                <input autoFocus type="number" inputMode="decimal"
                                    value={balInput}
                                    onChange={e => setBalInput(e.target.value)}
                                    placeholder="e.g. 15000"
                                    style={{
                                        border: `1.5px solid ${IOS.teal}`, borderRadius: 8,
                                        padding: '6px 10px', fontSize: '0.88rem', fontWeight: 700,
                                        width: 110, outline: 'none', fontFamily: FONT_STACK,
                                    }} />
                                <button onClick={saveBalance} style={{
                                    background: IOS.teal, color: '#fff', border: 'none',
                                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '0.82rem',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    fontFamily: FONT_STACK,
                                }}>
                                    <Check size={13} /> Save
                                </button>
                                {!needsBalance && (
                                    <button onClick={() => setEditingBal(false)} style={{
                                        background: 'none', border: `1px solid ${IOS.sep}`,
                                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                        color: IOS.label, fontFamily: FONT_STACK,
                                    }}>
                                        <X size={13} />
                                    </button>
                                )}
                                {needsBalance && (
                                    <span style={{ fontSize: '0.75rem', color: IOS.label, width: '100%' }}>
                                        Enter your balance to unlock AI insights
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span style={{
                                    fontWeight: 900, fontSize: '1.1rem',
                                    color: startingBalance >= 0 ? IOS.green : IOS.red,
                                }}>
                                    ₪{fmt(startingBalance)}
                                </span>
                                <button onClick={() => { setBalInput(String(startingBalance)); setEditingBal(true); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                    <Edit3 size={15} color={IOS.label} />
                                </button>
                            </>
                        )}
                    </div>

                    {loading && (
                        <div style={{ padding: 24, textAlign: 'center', fontWeight: 600, color: IOS.teal, fontSize: '0.9rem' }}>
                            Analysing patterns…
                        </div>
                    )}

                    {!loading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: IOS.label, fontSize: '0.85rem' }}>
                            Not enough history to forecast.
                        </div>
                    )}

                    {!loading && data && (<>

                        {/* ── Health card ───────────────────────────────── */}
                        {startingBalance != null && (
                            <div style={{
                                padding: '14px 16px',
                                background: hlLabel.bg,
                                borderBottom: `0.5px solid ${IOS.sep}`,
                                display: 'flex', gap: 14, alignItems: 'flex-start',
                            }}>
                                <HealthBadge score={score} label={hlLabel} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hlLabel.color, marginBottom: 5 }}>
                                        {rwInfo.emoji} {rwInfo.label} runway
                                    </div>
                                    {insights.map((line, i) => (
                                        <div key={i} style={{
                                            fontSize: '0.77rem', color: '#374151',
                                            fontWeight: 500, lineHeight: 1.4, marginBottom: 3,
                                        }}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Anomaly alerts ────────────────────────────── */}
                        {anomalies.length > 0 && (
                            <div style={{ borderBottom: `0.5px solid ${IOS.sep}` }}>
                                <div style={{
                                    padding: '7px 16px', background: '#fff1f2',
                                    fontSize: '0.68rem', fontWeight: 700, color: '#be123c',
                                    textTransform: 'uppercase', letterSpacing: '0.3px',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                }}>
                                    <AlertTriangle size={10} /> Spending spikes this month
                                </div>
                                {anomalies.map((a, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '9px 16px',
                                        borderBottom: i < anomalies.length - 1 ? `0.5px solid #fecaca` : 'none',
                                    }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {a.description}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: IOS.label, marginTop: 1 }}>
                                                ₪{fmt(a.current, true)} this month vs ₪{fmt(a.avg, true)} avg
                                            </div>
                                        </div>
                                        <div style={{
                                            background: '#fef2f2', color: IOS.red,
                                            padding: '2px 8px', borderRadius: 12,
                                            fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, marginLeft: 8,
                                        }}>
                                            +{a.pct_above}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Avg / Projected strip ─────────────────────── */}
                        <div style={{
                            display: 'flex', borderBottom: `0.5px solid ${IOS.sep}`,
                        }}>
                            {[
                                { label: 'Avg / month', val: `₪${fmt(data.avg_monthly_spend, true)}`, color: '#111' },
                                adjEndBal != null
                                    ? { label: `In ${adjMonthly.length} months`, val: `₪${fmt(adjEndBal)}`, color: adjEndBal >= 0 ? IOS.green : IOS.red }
                                    : null,
                            ].filter(Boolean).map((item, i, arr) => (
                                <div key={item.label} style={{
                                    flex: 1, padding: '12px 16px',
                                    borderRight: i < arr.length - 1 ? `0.5px solid ${IOS.sep}` : 'none',
                                }}>
                                    <div style={{ fontSize: '0.65rem', color: IOS.label, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: item.color }}>
                                        {item.val}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Chart ─────────────────────────────────────── */}
                        <div style={{ padding: '12px 16px 4px' }}>
                            <div style={{
                                fontSize: '0.67rem', color: IOS.label, fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8,
                                display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                                Monthly spending
                                {adjust !== 0 && (
                                    <span style={{ color: adjust < 0 ? IOS.green : IOS.red }}>
                                        ({adjust > 0 ? '+' : ''}{adjust}% scenario)
                                    </span>
                                )}
                            </div>
                            <MiniChart
                                monthly_history={data.monthly_history}
                                predicted_monthly={data.predicted_monthly}
                                adjust={adjust}
                            />
                        </div>

                        {/* ── What-if ───────────────────────────────────── */}
                        <div style={{
                            padding: '10px 16px',
                            background: '#f9f9f9',
                            borderTop: `0.5px solid ${IOS.sep}`,
                        }}>
                            <div style={{
                                fontSize: '0.67rem', color: IOS.label, fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8,
                                display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                                <Zap size={10} /> What if I adjust spending?
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {WHAT_IF_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => setAdjust(opt.value)} style={{
                                        padding: '5px 10px', borderRadius: 20,
                                        border: `1.5px solid ${adjust === opt.value ? IOS.teal : IOS.sep}`,
                                        background: adjust === opt.value ? IOS.teal : '#fff',
                                        color: adjust === opt.value ? '#fff' : opt.value < 0 ? IOS.green : opt.value > 0 ? IOS.red : '#374151',
                                        fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                                        fontFamily: FONT_STACK, transition: 'all 0.15s ease',
                                    }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {adjust !== 0 && baseEndBal != null && adjEndBal != null && (
                                <div style={{
                                    marginTop: 8, fontSize: '0.77rem', fontWeight: 600,
                                    color: (adjEndBal - baseEndBal) > 0 ? IOS.green : IOS.red,
                                }}>
                                    {(adjEndBal - baseEndBal) > 0 ? '+' : ''}
                                    ₪{fmt(adjEndBal - baseEndBal)} vs baseline in {adjMonthly.length} months
                                </div>
                            )}
                        </div>

                        {/* ── Projection rows ───────────────────────────── */}
                        {adjMonthly.length > 0 && startingBalance != null && (
                            <div style={{ borderTop: `0.5px solid ${IOS.sep}` }}>
                                <div style={{
                                    padding: '7px 16px', background: '#f9f9f9',
                                    fontSize: '0.67rem', fontWeight: 700, color: IOS.label,
                                    textTransform: 'uppercase', letterSpacing: '0.3px',
                                }}>
                                    Projected balance
                                </div>
                                {adjMonthly.map((row, i) => (
                                    <div key={row.month} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 16px',
                                        borderBottom: i < adjMonthly.length - 1 ? `0.5px solid ${IOS.sep}` : 'none',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{fmtM(row.month)}</div>
                                            <div style={{ fontSize: '0.72rem', color: IOS.label, marginTop: 1 }}>
                                                −₪{fmt(row.total, true)} spending
                                            </div>
                                        </div>
                                        <div style={{
                                            fontWeight: 900, fontSize: '1rem',
                                            color: row.balance >= 0 ? IOS.green : IOS.red,
                                        }}>
                                            ₪{fmt(row.balance)}
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

export default MobileTransactionBalanceForecast;
