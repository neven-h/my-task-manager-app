import React, { useEffect, useRef, useState } from 'react';
import { formatCurrencyWithCode } from '../../../utils/formatCurrency';

const MobileStockSummaryCards = ({
    summary,
    summaryDisplayCurrency,
    setSummaryDisplayCurrency,
    theme,
    fontStack
}) => {
    if (!summary) return null;

    const rawValue = summaryDisplayCurrency === 'ILS'
        ? summary.total_value_ils ?? 0
        : summary.total_value ?? 0;

    const [animatedValue, setAnimatedValue] = useState(rawValue);
    const previousValueRef = useRef(rawValue);
    const animationRef = useRef(null);

    useEffect(() => {
        const start = previousValueRef.current;
        const end = rawValue;
        const duration = 450;
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            const eased = 1 - Math.pow(1 - progress, 3);
            const value = start + (end - start) * eased;

            setAnimatedValue(value);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(step);
            } else {
                previousValueRef.current = end;
            }
        };

        cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(step);

        return () => cancelAnimationFrame(animationRef.current);
    }, [rawValue]);

    const [currencyTransition, setCurrencyTransition] = useState(false);

    useEffect(() => {
        setCurrencyTransition(true);
        const t = setTimeout(() => setCurrencyTransition(false), 300);
        return () => clearTimeout(t);
    }, [summaryDisplayCurrency]);

    return (
        <div style={{
            padding: '20px 16px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: '#ffffff'
        }}>
            {/* Total Value */}
            <div style={{ marginBottom: '4px' }}>
                <div style={{
                    fontSize: '2.2rem',
                    fontWeight: 600,
                    letterSpacing: '-0.8px',
                    lineHeight: 1.1,
                    transition: 'transform 300ms ease, opacity 300ms ease',
                    transform: currencyTransition ? 'translateY(6px)' : 'translateY(0)',
                    opacity: currencyTransition ? 0.6 : 1
                }}>
                    {formatCurrencyWithCode(animatedValue, summaryDisplayCurrency)}
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: theme.muted,
                    opacity: 0.85,
                    marginTop: '4px'
                }}>
                    Total Portfolio Value
                </div>
            </div>

            {/* Meta Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px'
            }}>
                <div style={{ fontSize: '0.85rem', color: theme.muted }}>
                    {summary.entries?.length ?? summary.count ?? 0} holdings
                </div>

                <button
                    type="button"
                    onClick={() => setSummaryDisplayCurrency(prev => prev === 'ILS' ? 'USD' : 'ILS')}
                    style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: '#f2f2f7',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: fontStack,
                        borderRadius: '8px'
                    }}
                >
                    {summaryDisplayCurrency === 'ILS' ? '₪ ILS' : '$ USD'}
                </button>
            </div>

            {/* Exchange Rate */}
            {summary.exchange_rates?.USD && (
                <div style={{
                    fontSize: '0.75rem',
                    color: theme.muted,
                    marginTop: '8px'
                }}>
                    USD/ILS {summary.exchange_rates.USD.toFixed(2)}
                </div>
            )}

            {summary.growth_percent != null && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: summary.growth_percent >= 0 ? theme.success : theme.accent,
                    transition: 'transform 200ms ease',
                    transform: currencyTransition ? 'scale(1.05)' : 'scale(1)'
                }}>
                    {summary.growth_percent >= 0 ? '▲' : '▼'} {summary.growth_percent >= 0 ? '+' : ''}{summary.growth_percent.toFixed(2)}%
                </div>
            )}
        </div>
    );
};

export default MobileStockSummaryCards;
