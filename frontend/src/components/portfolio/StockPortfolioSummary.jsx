import React from 'react';
import { TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const colors = {
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    success: '#00AA00',
    card: '#ffffff',
    text: '#000',
    textLight: '#666',
    border: '#000'
};

const StockPortfolioSummary = ({ summary, summaryDisplayCurrency, onToggleCurrency, portfolioGrowth }) => {
    if (!summary) return null;

    return (
        <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
        }}>
            <style>{`
                @media (max-width: 768px) {
                    .stats-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 0.75rem !important;
                    }
                    .stats-card {
                        padding: 1rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            <div className="stats-card" style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <TrendingUp size={40} color={colors.primary} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.primary }}>
                    {summaryDisplayCurrency === 'ILS'
                        ? formatCurrencyWithCode(summary.total_value_ils ?? 0, 'ILS')
                        : formatCurrencyWithCode(summary.total_value ?? 0, 'USD')
                    }
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700' }}>
                        Total value
                    </span>
                    <button
                        onClick={onToggleCurrency}
                        style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: colors.primary,
                            color: '#fff',
                            border: `2px solid ${colors.border}`,
                            cursor: 'pointer',
                            fontFamily: '"Inter", sans-serif',
                            textTransform: 'uppercase'
                        }}
                    >
                        {summaryDisplayCurrency === 'ILS' ? '₪ ILS' : '$ USD'}
                    </button>
                </div>
                {summary.exchange_rates && summary.exchange_rates.USD && (
                    <div style={{ color: colors.textLight, fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        USD/ILS: {summary.exchange_rates.USD.toFixed(2)}
                    </div>
                )}
            </div>

            <div className="stats-card" style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <PieChart size={40} color={colors.success} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.success }}>
                    {summary.count || 0}
                </div>
                <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                    📊 Total Stocks
                </div>
            </div>

            {portfolioGrowth != null && (() => {
                const positive = portfolioGrowth.growthPercent >= 0;
                const growthColor = positive ? colors.success : colors.accent;
                const sign = positive ? '+' : '';
                const useUSD = summaryDisplayCurrency === 'USD' && portfolioGrowth.growthAmountUSD != null;
                const growthAmt = useUSD ? portfolioGrowth.growthAmountUSD : portfolioGrowth.growthAmountILS;
                const displayCurrency = useUSD ? 'USD' : 'ILS';
                return (
                    <div className="stats-card" style={{ background: colors.card, border: `2px solid ${colors.border}`, padding: '1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                            {positive ? <TrendingUp size={40} color={growthColor} /> : <TrendingDown size={40} color={growthColor} />}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: growthColor }}>
                            {sign}{formatCurrencyWithCode(Math.abs(growthAmt), displayCurrency)}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: growthColor, marginTop: '0.15rem' }}>
                            {sign}{portfolioGrowth.growthPercent.toFixed(2)}%
                        </div>
                        <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                            Total Growth{portfolioGrowth.hasLive ? ' · Live' : ''}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StockPortfolioSummary;
