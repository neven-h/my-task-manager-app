import React from 'react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const SummaryCard = ({ label, value, bg, borderColor }) => (
    <div style={{ padding: '1rem', background: bg, border: `2px solid ${borderColor}`, textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{value}</div>
    </div>
);

const YahooPortfolioSummary = ({ colors, summary, holdings }) => {
    const gainLossPositive = summary.totalGainLoss >= 0;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <SummaryCard label="Total Value" bg="#f0f7ff" borderColor={colors.primary}
                value={<>
                    {formatCurrencyWithCode(summary.totalValue || 0, 'USD')}
                    {holdings.some(h => h.currency !== 'USD') && (
                        <div style={{ fontSize: '0.7rem', color: colors.textLight, marginTop: '0.25rem' }}>(USD Summary)</div>
                    )}
                </>}
            />
            <SummaryCard label="Total Cost" bg="#f0f7ff" borderColor={colors.primary}
                value={formatCurrencyWithCode(summary.totalCost || 0, 'USD')}
            />
            <div style={{ padding: '1rem', background: gainLossPositive ? '#f0fff0' : '#fff0f0', border: `2px solid ${gainLossPositive ? colors.success : colors.accent}`, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textLight, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Gain/Loss</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: gainLossPositive ? colors.success : colors.accent }}>
                    {gainLossPositive ? '+' : ''}{formatCurrencyWithCode(Math.abs(summary.totalGainLoss || 0), 'USD')}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: gainLossPositive ? colors.success : colors.accent, marginTop: '0.25rem' }}>
                    ({gainLossPositive ? '+' : ''}{summary.totalGainLossPct?.toFixed(2)}%)
                </div>
            </div>
            <SummaryCard label="Holdings" bg="#f8f8f8" borderColor={colors.border}
                value={summary.holdingsCount}
            />
        </div>
    );
};

export default YahooPortfolioSummary;
