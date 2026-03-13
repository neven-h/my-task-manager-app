import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import useTransactionBalanceForecast from '../../../hooks/useTransactionBalanceForecast';

const IOS = {
    blue:    '#007AFF',
    teal:    '#30B0C7',
    green:   '#34C759',
    red:     '#FF3B30',
    bg:      '#F2F2F7',
    card:    '#FFFFFF',
    label:   '#8E8E93',
    text:    '#000000',
};

const fmt = (n, abs = false) => {
    const v = abs ? Math.abs(n) : n;
    return v.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// ── Compact bar chart ────────────────────────────────────────────────────────
const MiniBarChart = ({ monthly_history, predicted_monthly }) => {
    const H = 90, LEFT = 0, BOTTOM = 18;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, type: 'predicted' })),
    ];
    if (allMonths.length === 0) return null;

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
                const fill = m.type === 'actual' ? IOS.teal : 'rgba(48,176,199,0.38)';
                return (
                    <g key={m.month}>
                        <rect x={x} y={y} width={bwI} height={barH} fill={fill} rx="1"
                            stroke={m.type === 'predicted' ? IOS.teal : 'none'}
                            strokeWidth="0.4" strokeDasharray={m.type === 'predicted' ? '1,0.8' : 'none'} />
                        <text x={x + bwI / 2} y={H - 2} textAnchor="middle" fontSize="4" fill={IOS.label}>
                            {fmtMonth(m.month).split(' ')[0]}
                        </text>
                    </g>
                );
            })}
            {predicted_monthly.length > 0 && monthly_history.length > 0 && (
                <line
                    x1={monthly_history.length * bw} y1={0}
                    x2={monthly_history.length * bw} y2={plotH}
                    stroke={IOS.teal} strokeWidth="0.6" strokeDasharray="1.5,1"
                />
            )}
        </svg>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const MobileTransactionBalanceForecast = ({ activeTabId }) => {
    const {
        data, loading, startingBalance, setStartingBalance,
        clearStartingBalance, fetchForecast,
    } = useTransactionBalanceForecast(activeTabId);

    const [open, setOpen]            = useState(false);
    const [editingBal, setEditingBal] = useState(false);
    const [balInput, setBalInput]    = useState('');

    useEffect(() => { setOpen(false); }, [activeTabId]);

    const toggle = async () => {
        if (!open && !data) await fetchForecast(3);
        setOpen(v => !v);
    };

    const saveBalance = () => {
        const v = parseFloat(balInput.replace(/[^0-9.-]/g, ''));
        if (!isNaN(v)) { setStartingBalance(v); setEditingBal(false); }
    };

    const projection = useMemo(() => {
        if (startingBalance === null || !data) return [];
        let bal = startingBalance;
        return (data.predicted_monthly || []).map(({ month, total }) => {
            bal = Math.round((bal - total) * 100) / 100;
            return { month, spend: total, balance: bal };
        });
    }, [startingBalance, data]);

    const endBalance  = projection.length > 0 ? projection[projection.length - 1].balance : null;
    const avgSpend    = data?.avg_monthly_spend ?? 0;
    const needsBalance = startingBalance === null;

    return (
        <div style={{ padding: '0 16px 4px', fontFamily: FONT_STACK }}>
            {/* Toggle header card */}
            <div
                onClick={toggle}
                style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                    borderRadius: open ? '16px 16px 0 0' : 16,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrendingUp size={18} color="#fff" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                        Balance Forecast
                    </span>
                    {endBalance !== null && !needsBalance && (
                        <span style={{
                            background: 'rgba(255,255,255,0.22)', padding: '2px 8px',
                            borderRadius: 12, fontSize: '0.73rem', fontWeight: 700, color: '#fff',
                        }}>
                            → ₪{fmt(endBalance)}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
            </div>

            {open && (
                <div style={{
                    background: IOS.card, borderRadius: '0 0 16px 16px',
                    border: '0.5px solid rgba(0,0,0,0.1)',
                    borderTop: 'none', marginBottom: 8,
                    overflow: 'hidden',
                }}>
                    {/* Balance input */}
                    <div style={{
                        padding: '12px 16px',
                        background: needsBalance ? '#f0fdf4' : '#f9fafb',
                        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                            Current balance:
                        </span>
                        {editingBal || needsBalance ? (
                            <>
                                <input
                                    autoFocus
                                    type="number" inputMode="decimal"
                                    value={balInput}
                                    onChange={e => setBalInput(e.target.value)}
                                    placeholder="e.g. 15000"
                                    style={{
                                        border: `1.5px solid ${IOS.teal}`, borderRadius: 8,
                                        padding: '6px 10px', fontSize: '0.88rem', fontWeight: 700,
                                        width: 110, outline: 'none', fontFamily: FONT_STACK,
                                    }}
                                />
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
                                        background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
                                        padding: '6px 10px', cursor: 'pointer', color: IOS.label,
                                        fontFamily: FONT_STACK,
                                    }}>
                                        <X size={13} />
                                    </button>
                                )}
                                {needsBalance && (
                                    <span style={{ fontSize: '0.75rem', color: IOS.label, width: '100%' }}>
                                        Enter your balance to project future cash flow
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span style={{
                                    fontWeight: 900, fontSize: '1.05rem',
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

                    {/* Loading */}
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

                    {!loading && data && (
                        <>
                            {/* Stats strip */}
                            <div style={{
                                display: 'flex', gap: 0,
                                borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                            }}>
                                {[
                                    { label: 'Avg / month', val: `₪${fmt(avgSpend, true)}`, color: '#111827' },
                                    endBalance !== null
                                        ? { label: `In ${data.predicted_monthly?.length ?? 0} months`, val: `₪${fmt(endBalance)}`, color: endBalance >= 0 ? IOS.green : IOS.red }
                                        : null,
                                ].filter(Boolean).map((item, i, arr) => (
                                    <div key={item.label} style={{
                                        flex: 1, padding: '12px 16px',
                                        borderRight: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                                    }}>
                                        <div style={{ fontSize: '0.68rem', color: IOS.label, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                                            {item.label}
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '1.05rem', color: item.color }}>
                                            {item.val}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chart */}
                            <div style={{ padding: '12px 16px 4px' }}>
                                <div style={{ fontSize: '0.68rem', color: IOS.label, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>
                                    Monthly spending
                                </div>
                                <MiniBarChart
                                    monthly_history={data.monthly_history}
                                    predicted_monthly={data.predicted_monthly}
                                />
                            </div>

                            {/* Projection rows */}
                            {projection.length > 0 && (
                                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                                    <div style={{ padding: '8px 16px', fontSize: '0.68rem', fontWeight: 700, color: IOS.label, textTransform: 'uppercase', letterSpacing: '0.3px', background: '#f9f9f9' }}>
                                        Projected balance
                                    </div>
                                    {projection.map((row, i) => (
                                        <div key={row.month} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 16px',
                                            borderBottom: i < projection.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{fmtMonth(row.month)}</div>
                                                <div style={{ fontSize: '0.73rem', color: IOS.label, marginTop: 1 }}>
                                                    −₪{fmt(row.spend, true)} spending
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
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileTransactionBalanceForecast;
