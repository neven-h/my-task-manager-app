import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Edit3, Check, X, RotateCcw } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import useTransactionBalanceForecast from '../../hooks/useTransactionBalanceForecast';

const fmt = (n, abs = false) => {
    const v = abs ? Math.abs(n) : n;
    return v.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// ── Spending bar chart (SVG) ─────────────────────────────────────────────────
const SpendingChart = ({ monthly_history, predicted_monthly }) => {
    const H = 140, LEFT = 48, BOTTOM = 24, BAR_GAP = 0.25;
    const allMonths = [
        ...monthly_history.map(m => ({ ...m, type: 'actual' })),
        ...predicted_monthly.map(m => ({ ...m, type: 'predicted' })),
    ];
    if (allMonths.length === 0) return null;

    const maxVal = Math.max(...allMonths.map(m => m.total), 1);
    const plotH = H - BOTTOM;
    const barW = (n) => (100 - LEFT) / n;

    return (
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}>
            {/* Y gridlines */}
            {[0.25, 0.5, 0.75, 1].map(pct => {
                const y = plotH * (1 - pct);
                return (
                    <g key={pct}>
                        <line x1={LEFT} y1={y} x2={100} y2={y}
                            stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="1,1" />
                        <text x={LEFT - 1} y={y + 1} textAnchor="end"
                            fontSize="3.5" fill="#9ca3af">
                            {fmt(maxVal * pct, true)}
                        </text>
                    </g>
                );
            })}

            {/* Bars + labels */}
            {allMonths.map((m, i) => {
                const bw   = barW(allMonths.length);
                const gap  = bw * BAR_GAP;
                const bwInner = bw - gap;
                const x    = LEFT + i * bw + gap / 2;
                const barH = plotH * (m.total / maxVal);
                const y    = plotH - barH;
                const fill = m.type === 'actual' ? '#0d9488' : 'rgba(13,148,136,0.4)';
                return (
                    <g key={m.month}>
                        {m.type === 'predicted' && (
                            <rect x={x} y={0} width={bwInner} height={plotH}
                                fill="rgba(13,148,136,0.04)" />
                        )}
                        <rect x={x} y={y} width={bwInner} height={barH}
                            fill={fill} rx="0.8"
                            stroke={m.type === 'predicted' ? '#0d9488' : 'none'}
                            strokeWidth="0.3"
                            strokeDasharray={m.type === 'predicted' ? '1,0.8' : 'none'} />
                        <text x={x + bwInner / 2} y={H - 1}
                            textAnchor="middle" fontSize="3.2" fill="#6b7280">
                            {fmtMonth(m.month)}
                        </text>
                    </g>
                );
            })}

            {/* "Forecast →" divider */}
            {predicted_monthly.length > 0 && monthly_history.length > 0 && (() => {
                const bw = barW(allMonths.length);
                const divX = LEFT + monthly_history.length * bw;
                return (
                    <g>
                        <line x1={divX} y1={0} x2={divX} y2={plotH}
                            stroke="#0d9488" strokeWidth="0.5" strokeDasharray="1.5,1" />
                        <text x={divX + 1} y={5} fontSize="3" fill="#0d9488" fontWeight="700">
                            Forecast →
                        </text>
                    </g>
                );
            })()}
        </svg>
    );
};

// ── Balance projection row ───────────────────────────────────────────────────
const BalanceRow = ({ month, spend, balance, isFirst }) => {
    const positive = balance >= 0;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 16px',
            borderBottom: '1px dashed #e5e7eb',
            fontSize: '0.84rem',
        }}>
            <div style={{ width: 68, flexShrink: 0, fontWeight: 700, color: '#555' }}>
                {fmtMonth(month)}
            </div>
            <div style={{ flex: 1, color: '#6b7280', fontSize: '0.78rem' }}>
                {isFirst ? 'Opening balance' : `−₪${fmt(spend, true)} spending`}
            </div>
            <div style={{
                fontWeight: 900, fontSize: '0.95rem',
                color: positive ? '#059669' : '#dc2626',
            }}>
                ₪{fmt(balance)}
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const TransactionBalanceForecast = () => {
    const { activeTabId, colors } = useBankTransactionContext();
    const {
        data, loading, startingBalance, setStartingBalance,
        clearStartingBalance, fetchForecast,
    } = useTransactionBalanceForecast(activeTabId);

    const [open, setOpen]           = useState(false);
    const [editingBal, setEditingBal] = useState(false);
    const [balInput, setBalInput]   = useState('');

    const toggle = async () => {
        if (!open && !data) {
            await fetchForecast(3);
        }
        setOpen(v => !v);
    };

    // When tab changes, reset open state
    useEffect(() => { setOpen(false); }, [activeTabId]);

    const saveBalance = () => {
        const v = parseFloat(balInput.replace(/[^0-9.-]/g, ''));
        if (!isNaN(v)) { setStartingBalance(v); }
        setEditingBal(false);
    };

    // Compute projected balance timeline
    const projection = useMemo(() => {
        if (startingBalance === null || !data) return [];
        let bal = startingBalance;
        const rows = [];
        rows.push({ month: 'now', spend: 0, balance: bal, isFirst: true });
        (data.predicted_monthly || []).forEach(({ month, total }) => {
            bal = Math.round((bal - total) * 100) / 100;
            rows.push({ month, spend: total, balance: bal, isFirst: false });
        });
        return rows;
    }, [startingBalance, data]);

    const endBalance   = projection.length > 1 ? projection[projection.length - 1].balance : null;
    const monthsAhead  = data?.predicted_monthly?.length ?? 0;
    const avgSpend     = data?.avg_monthly_spend ?? 0;

    const needsBalance = startingBalance === null;

    return (
        <div style={{
            marginBottom: '1.5rem',
            border: '2px solid #d1fae5',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                color: '#fff', cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.95rem' }}>
                    <TrendingUp size={18} />
                    Balance Forecast
                    {endBalance !== null && (
                        <span style={{
                            background: 'rgba(255,255,255,0.22)', padding: '2px 10px',
                            fontSize: '0.75rem', fontWeight: 800, borderRadius: 20,
                        }}>
                            {monthsAhead}m outlook
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {endBalance !== null && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, opacity: 0.9 }}>
                            → ₪{fmt(endBalance)}
                        </span>
                    )}
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {/* Starting balance input */}
                    <div style={{
                        padding: '12px 20px',
                        background: needsBalance ? '#f0fdf4' : '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                            Current account balance:
                        </span>
                        {editingBal || needsBalance ? (
                            <>
                                <input
                                    autoFocus
                                    type="number"
                                    value={balInput}
                                    onChange={e => setBalInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBal(false); }}
                                    placeholder="e.g. 15000"
                                    style={{
                                        border: '1.5px solid #0d9488', borderRadius: 6,
                                        padding: '5px 10px', fontSize: '0.88rem', fontWeight: 700,
                                        width: 120, outline: 'none',
                                    }}
                                />
                                <button onClick={saveBalance} style={{
                                    background: '#0d9488', color: '#fff', border: 'none',
                                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <Check size={13} /> Save
                                </button>
                                {!needsBalance && (
                                    <button onClick={() => setEditingBal(false)} style={{
                                        background: 'none', border: '1px solid #d1d5db', borderRadius: 6,
                                        padding: '5px 10px', cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem',
                                    }}>
                                        <X size={13} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: startingBalance >= 0 ? '#059669' : '#dc2626' }}>
                                    ₪{fmt(startingBalance)}
                                </span>
                                <button onClick={() => { setBalInput(String(startingBalance)); setEditingBal(true); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                                    <Edit3 size={14} />
                                </button>
                                <button onClick={clearStartingBalance}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2 }}
                                    title="Clear balance">
                                    <RotateCcw size={12} />
                                </button>
                            </>
                        )}
                        {needsBalance && (
                            <span style={{ fontSize: '0.77rem', color: '#6b7280', marginLeft: 4 }}>
                                Enter your balance to project future cash flow
                            </span>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div style={{ padding: 24, textAlign: 'center', fontWeight: 700, color: '#0d9488' }}>
                            <span style={{ marginRight: 8 }}>✦</span> Analysing spending patterns…
                        </div>
                    )}

                    {/* No data */}
                    {!loading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                            Not enough transaction history to generate a forecast.
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            {/* Summary strip */}
                            <div style={{
                                padding: '10px 20px',
                                background: '#f0fdfa',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0d9488' }}>
                                        Avg monthly spend
                                    </div>
                                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#111827' }}>
                                        ₪{fmt(avgSpend, true)}
                                    </div>
                                </div>
                                {endBalance !== null && (
                                    <div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0d9488' }}>
                                            Projected in {monthsAhead} months
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: endBalance >= 0 ? '#059669' : '#dc2626' }}>
                                            ₪{fmt(endBalance)}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => fetchForecast(3)}
                                    style={{
                                        marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700,
                                        padding: '4px 12px', border: '1px solid #d1d5db',
                                        borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#0d9488',
                                    }}
                                >
                                    Refresh
                                </button>
                            </div>

                            {/* Bar chart */}
                            <div style={{ padding: '16px 20px 4px 20px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Monthly spending — actual vs predicted
                                </div>
                                <SpendingChart
                                    monthly_history={data.monthly_history}
                                    predicted_monthly={data.predicted_monthly}
                                />
                            </div>

                            {/* Balance projection (only when starting balance is known) */}
                            {startingBalance !== null && projection.length > 1 && (
                                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <div style={{
                                        padding: '8px 16px',
                                        background: '#f9fafb',
                                        fontSize: '0.72rem', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6b7280',
                                    }}>
                                        Projected balance
                                    </div>
                                    {projection.slice(1).map(row => (
                                        <BalanceRow key={row.month} {...row} />
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

export default TransactionBalanceForecast;
