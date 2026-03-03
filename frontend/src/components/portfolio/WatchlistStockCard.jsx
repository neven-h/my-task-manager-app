import React from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const WatchlistStockCard = ({ item, price, loading, colors, onRemove, onRetry }) => {
    const hasPrice = price && price.currentPrice != null;
    const isPositive = price && price.change != null && price.change >= 0;

    return (
        <div style={{ border: `3px solid ${colors.border}`, padding: '1rem', background: '#fff', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        {item.stock_name || item.ticker_symbol}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: colors.textLight, fontWeight: 600 }}>
                        {item.ticker_symbol}{price?.exchange && ` • ${price.exchange}`}
                    </div>
                </div>
                <button
                    onClick={() => onRemove(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: colors.accent, display: 'flex', alignItems: 'center' }}
                    title="Remove from watchlist"
                >
                    <X size={18} />
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: colors.textLight, fontSize: '0.9rem' }}>
                    Loading price...
                </div>
            ) : hasPrice ? (
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: colors.text }}>
                        {formatCurrencyWithCode(Number(price.currentPrice), price.currency || 'USD')}
                    </div>
                    {price.change != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, color: isPositive ? colors.success : colors.accent }}>
                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {isPositive ? '+' : ''}{price.changePercent?.toFixed(2) ?? price.change?.toFixed(2)}%
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                ({isPositive ? '+' : ''}{price.change.toFixed(2)})
                            </span>
                        </div>
                    )}
                    {price.marketState && (
                        <div style={{ fontSize: '0.75rem', color: colors.textLight, marginTop: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            {price.marketState === 'REGULAR' ? '● Market Open' : price.marketState === 'CLOSED' ? '○ Market Closed' : price.marketState}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: colors.textLight, fontSize: '0.85rem' }}>
                    <div>Price unavailable</div>
                    <button
                        onClick={onRetry}
                        style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', background: colors.primary, color: '#fff', border: `1px solid ${colors.border}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

export default WatchlistStockCard;
