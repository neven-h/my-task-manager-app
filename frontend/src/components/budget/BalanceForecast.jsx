import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { trendArrow, confidenceLabel, emptyStateMessage } from '../../utils/forecastHelpers';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666', border: '#000', text: '#000' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const BalanceForecast = ({ forecast, onFetch, loading, linkedTab }) => {
    const [open, setOpen] = useState(false);

    if (!linkedTab) return null;

    const handleToggle = () => {
        if (!open && !forecast) onFetch();
        setOpen(o => !o);
    };

    const tl = forecast?.timeline || [];

    return (
        <div style={{ marginTop: 24 }}>
            <button type="button" onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '12px 16px', borderRadius: open ? '10px 10px 0 0' : 10,
                    border: '2px solid #e0e0e0',
                    background: open ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : '#f9fafb',
                    color: open ? '#fff' : SYS.text,
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    fontFamily: 'inherit', transition: 'all 0.2s ease',
                }}>
                <TrendingUp size={16} />
                {open ? 'Hide' : 'Show'} Balance Forecast
            </button>

            {open && (
                <div style={{
                    border: '2px solid #e0e0e0', borderTop: 'none',
                    borderRadius: '0 0 10px 10px', background: '#FAFAFA',
                }}>
                    {loading && !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                            Calculating balance forecast…
                        </div>
                    ) : !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SYS.light, fontSize: '0.85rem' }}>
                            {emptyStateMessage(false)}
                        </div>
                    ) : (
                        <>
                            {/* Current balance summary */}
                            <div style={{
                                display: 'flex', gap: 16, padding: '14px 16px',
                                borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', alignItems: 'center',
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px' }}>
                                    Current balance:
                                </div>
                                <span style={{
                                    fontSize: '1.3rem', fontWeight: 800,
                                    color: forecast.current_balance >= 0 ? SYS.primary : SYS.accent,
                                }}>
                                    {forecast.current_balance >= 0 ? '+' : '−'}{fmt(forecast.current_balance)}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: SYS.light, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span>Income: <b style={{ color: SYS.success }}>+{fmt((forecast.budget_income || 0) + (forecast.bank_income || 0))}</b></span>
                                    <span>Budget exp: <b style={{ color: SYS.accent }}>−{fmt(forecast.budget_expense)}</b></span>
                                    {forecast.bank_expense > 0 && (
                                        <span>Bank exp: <b style={{ color: SYS.accent }}>−{fmt(forecast.bank_expense)}</b></span>
                                    )}
                                </div>
                            </div>

                            {/* Timeline header */}
                            {tl.length > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '8px 16px', borderBottom: '1px solid #e5e7eb',
                                    fontSize: '0.7rem', fontWeight: 700, color: SYS.light,
                                    textTransform: 'uppercase', letterSpacing: '0.4px',
                                }}>
                                    <div style={{ width: 75 }}>Date</div>
                                    <div style={{ flex: 1 }}>Description</div>
                                    <div style={{ width: 50, textAlign: 'center' }}>Source</div>
                                    <div style={{ width: 90, textAlign: 'right' }}>Amount</div>
                                    <div style={{ width: 100, textAlign: 'right' }}>Balance</div>
                                </div>
                            )}

                            {/* Timeline rows */}
                            {tl.map((p, idx) => {
                                const isIncome = p.type === 'income';
                                const amtColor = isIncome ? SYS.success : SYS.accent;
                                const balColor = p.running_balance >= 0 ? SYS.primary : SYS.accent;
                                const trend = trendArrow(p.trend);
                                const conf = confidenceLabel(p.confidence);
                                return (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '7px 16px', borderBottom: '1px dashed #ddd',
                                        fontSize: '0.82rem',
                                    }}>
                                        <div style={{ width: 75, flexShrink: 0, fontWeight: 600, color: SYS.light, fontSize: '0.78rem' }}>
                                            {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.description}
                                        </div>
                                        <div style={{
                                            width: 50, textAlign: 'center', fontSize: '0.65rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '0.3px',
                                            color: p.source === 'bank' ? '#6b7280' : SYS.primary,
                                        }}>
                                            {p.source}
                                        </div>
                                        <span style={{ flexShrink: 0, fontWeight: 800, color: trend.color, fontSize: '0.85rem' }} title={`${trend.label} · ${conf.text} confidence`}>
                                            {trend.symbol}
                                        </span>
                                        <div style={{ width: 90, textAlign: 'right', fontWeight: 800, color: amtColor, flexShrink: 0 }}>
                                            {isIncome ? '+' : '−'}{fmt(p.amount)}
                                        </div>
                                        <div style={{ width: 100, textAlign: 'right', fontWeight: 700, color: balColor, flexShrink: 0 }}>
                                            {p.running_balance >= 0 ? '' : '−'}{fmt(p.running_balance)}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Historical Actual Bank Spending */}
                            {forecast.monthly_actuals && forecast.monthly_actuals.length > 0 && (
                                <div style={{ borderTop: '2px solid #e5e7eb', padding: '12px 16px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px', marginBottom: 8 }}>
                                        Historical — Actual Bank Spending
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.68rem', fontWeight: 700, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                                        <div style={{ width: 70 }}>Month</div>
                                        <div style={{ width: 80, textAlign: 'right' }}>Expenses</div>
                                        <div style={{ width: 80, textAlign: 'right' }}>Income</div>
                                        <div style={{ width: 80, textAlign: 'right' }}>Net</div>
                                    </div>
                                    {forecast.monthly_actuals.map((m) => (
                                        <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', padding: '3px 0', borderBottom: '1px dashed #eee' }}>
                                            <div style={{ width: 70, fontWeight: 600, color: SYS.light, fontSize: '0.75rem' }}>
                                                {new Date(m.month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ width: 80, textAlign: 'right', color: SYS.accent, fontWeight: 600 }}>
                                                {m.expense > 0 ? `−${fmt(m.expense)}` : '—'}
                                            </div>
                                            <div style={{ width: 80, textAlign: 'right', color: SYS.success, fontWeight: 600 }}>
                                                {m.income > 0 ? `+${fmt(m.income)}` : '—'}
                                            </div>
                                            <div style={{ width: 80, textAlign: 'right', fontWeight: 700, color: m.net <= 0 ? SYS.success : SYS.accent }}>
                                                {m.net <= 0 ? `+${fmt(Math.abs(m.net))}` : `−${fmt(m.net)}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Projected end balance */}
                            {forecast.forecast_end_balance !== undefined && (
                                <div style={{
                                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderTop: '2px solid #e5e7eb',
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: SYS.light, letterSpacing: '0.4px' }}>
                                        Projected balance:
                                    </span>
                                    <span style={{
                                        fontSize: '1.15rem', fontWeight: 800,
                                        color: forecast.forecast_end_balance >= 0 ? SYS.primary : SYS.accent,
                                    }}>
                                        {forecast.forecast_end_balance >= 0 ? '+' : '−'}{fmt(forecast.forecast_end_balance)}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default BalanceForecast;
