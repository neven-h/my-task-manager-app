import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

/**
 * MobileBalanceForecast — iOS-styled balance forecast card.
 * Requires: forecast (from useBalanceForecast), linkedTab, onFetch, loading.
 * NOTE: Only usable when MobileBudgetView has tab support wired in.
 */
const MobileBalanceForecast = ({ forecast, onFetch, loading, linkedTab }) => {
    const [open, setOpen] = useState(false);

    if (!linkedTab) return null;

    const handleToggle = () => {
        if (!open && !forecast) onFetch();
        setOpen(o => !o);
    };

    const tl = forecast?.timeline || [];

    return (
        <div style={{ margin: '16px 16px 0' }}>
            <button type="button" onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, width: '100%', padding: '13px 16px',
                    borderRadius: open ? `${IOS.radius}px ${IOS.radius}px 0 0` : IOS.radius,
                    border: 'none',
                    background: open ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : IOS.card,
                    color: open ? '#fff' : IOS.blue,
                    fontWeight: 600, fontSize: '0.88rem',
                    fontFamily: 'inherit', transition: `all 0.35s ${IOS.spring}`,
                    boxShadow: open ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                <TrendingUp size={16} />
                {open ? 'Hide Balance Forecast' : 'Balance Forecast'}
            </button>

            {open && (
                <div style={{
                    background: IOS.card, borderRadius: `0 0 ${IOS.radius}px ${IOS.radius}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    {loading && !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Calculating balance forecast…
                        </div>
                    ) : !forecast ? (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Not enough data to forecast.
                        </div>
                    ) : (
                        <>
                            {/* Current balance hero */}
                            <div style={{ padding: '18px 16px 12px', textAlign: 'center', borderBottom: `0.5px solid ${IOS.separator}` }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                    Current Balance
                                </div>
                                <div style={{
                                    fontSize: '1.8rem', fontWeight: 700,
                                    color: forecast.current_balance >= 0 ? IOS.blue : IOS.red,
                                }}>
                                    {forecast.current_balance >= 0 ? '+' : '−'}{fmt(forecast.current_balance)}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: IOS.muted, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12 }}>
                                    <span>In: <b style={{ color: IOS.green }}>+{fmt(forecast.budget_income)}</b></span>
                                    <span>Out: <b style={{ color: IOS.red }}>−{fmt(forecast.budget_expense + forecast.bank_expense)}</b></span>
                                </div>
                            </div>

                            {/* Timeline rows */}
                            {tl.map((p, idx) => {
                                const isIncome = p.type === 'income';
                                return (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 16px',
                                        borderBottom: idx < tl.length - 1 ? `0.5px solid ${IOS.separator}` : 'none',
                                    }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                                            background: isIncome ? IOS.green : IOS.red,
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.description}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: IOS.muted }}>
                                                {new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                {' · '}
                                                <span style={{ color: p.source === 'bank' ? IOS.muted : IOS.blue }}>{p.source}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 600, color: isIncome ? IOS.green : IOS.red, fontSize: '0.88rem', flexShrink: 0 }}>
                                            {isIncome ? '+' : '−'}{fmt(p.amount)}
                                        </div>
                                        <div style={{
                                            fontWeight: 600, fontSize: '0.82rem', flexShrink: 0, width: 75, textAlign: 'right',
                                            color: p.running_balance >= 0 ? IOS.blue : IOS.red,
                                        }}>
                                            {p.running_balance >= 0 ? '' : '−'}{fmt(p.running_balance)}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* End balance */}
                            {forecast.forecast_end_balance !== undefined && (
                                <div style={{
                                    padding: '14px 16px', borderTop: `0.5px solid ${IOS.separator}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        Projected
                                    </span>
                                    <span style={{
                                        fontSize: '1.15rem', fontWeight: 700,
                                        color: forecast.forecast_end_balance >= 0 ? IOS.blue : IOS.red,
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

export default MobileBalanceForecast;
