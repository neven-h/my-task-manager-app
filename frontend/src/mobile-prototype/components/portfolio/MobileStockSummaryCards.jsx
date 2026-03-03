import React from 'react';
import { formatCurrencyWithCode } from '../../../utils/formatCurrency';

const MobileStockSummaryCards = ({
    summary,
    summaryDisplayCurrency,
    setSummaryDisplayCurrency,
    theme,
    fontStack
}) => {
    if (!summary) return null;

    return (
        <div style={{ padding: '16px', borderBottom: '3px solid #000', background: '#f8f8f8' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>
                    Total Value: {summaryDisplayCurrency === 'ILS'
                        ? formatCurrencyWithCode(summary.total_value_ils ?? 0, 'ILS')
                        : formatCurrencyWithCode(summary.total_value ?? 0, 'USD')}
                </span>
                <button
                    type="button"
                    onClick={() => setSummaryDisplayCurrency(prev => prev === 'ILS' ? 'USD' : 'ILS')}
                    style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: theme.primary,
                        color: '#fff',
                        border: '2px solid #000',
                        cursor: 'pointer',
                        fontFamily: fontStack,
                        textTransform: 'uppercase'
                    }}
                >
                    {summaryDisplayCurrency === 'ILS' ? '₪ ILS' : '$ USD'}
                </button>
            </div>
            {summary.exchange_rates?.USD && (
                <div style={{ fontSize: '0.8rem', color: theme.muted, marginBottom: '4px' }}>
                    USD/ILS: {summary.exchange_rates.USD.toFixed(2)}
                </div>
            )}
            <div style={{ fontSize: '0.85rem', color: theme.muted }}>
                {summary.entries?.length ?? summary.count ?? 0} stocks
            </div>
        </div>
    );
};

export default MobileStockSummaryCards;
