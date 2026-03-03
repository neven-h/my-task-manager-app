import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import WatchlistSearch from './WatchlistSearch';
import WatchlistStockCard from './WatchlistStockCard';

const WatchlistSection = ({ colors, authUser }) => {
    const [showWatchlist, setShowWatchlist] = useState(true);
    const [watchlist, setWatchlist] = useState([]);
    const [watchlistPrices, setWatchlistPrices] = useState({});
    const [watchlistLoading, setWatchlistLoading] = useState(false);

    const fetchWatchlist = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/watchlist`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setWatchlist(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch watchlist:', err);
        }
    };

    const fetchWatchlistPrices = async () => {
        if (watchlist.length === 0) return;
        try {
            setWatchlistLoading(true);
            const response = await fetch(`${API_BASE}/portfolio/watchlist/prices`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                const priceMap = {};
                (data.prices || []).forEach(price => {
                    if (price.ticker && !price.error) priceMap[price.ticker] = price;
                });
                setWatchlistPrices(priceMap);
            }
        } catch (err) {
            console.error('Failed to fetch watchlist prices:', err);
        } finally {
            setWatchlistLoading(false);
        }
    };

    useEffect(() => {
        if (authUser) fetchWatchlist();
    }, [authUser]);

    useEffect(() => {
        if (watchlist.length > 0) {
            fetchWatchlistPrices();
            const interval = setInterval(fetchWatchlistPrices, 60000);
            return () => clearInterval(interval);
        }
    }, [watchlist]);

    const handleAddToWatchlist = async (ticker, name) => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/watchlist`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ticker_symbol: ticker, stock_name: name })
            });
            if (response.ok) await fetchWatchlist();
        } catch (err) {
            console.error('Failed to add stock to watchlist:', err);
        }
    };

    const handleRemoveFromWatchlist = async (watchlistId) => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/watchlist/${watchlistId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (response.ok) await fetchWatchlist();
        } catch (err) {
            console.error('Failed to remove stock from watchlist:', err);
        }
    };

    return (
        <div style={{ background: colors.card, border: `3px solid ${colors.border}`, padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <TrendingUp size={28} color={colors.primary} />
                    Yahoo Finance Watchlist
                </h2>
                <button
                    onClick={() => setShowWatchlist(!showWatchlist)}
                    style={{ padding: '0.5rem 1rem', background: colors.secondary, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}
                >
                    {showWatchlist ? 'Hide' : 'Show'}
                </button>
            </div>

            {showWatchlist && (
                <>
                    <WatchlistSearch colors={colors} watchlist={watchlist} onAdd={handleAddToWatchlist} />

                    {watchlist.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: colors.textLight }}>
                            <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No stocks in watchlist</p>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>Search for stocks above to add them to your watchlist</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {watchlist.map(item => (
                                <WatchlistStockCard
                                    key={item.id}
                                    item={item}
                                    price={watchlistPrices[item.ticker_symbol]}
                                    loading={watchlistLoading}
                                    colors={colors}
                                    onRemove={handleRemoveFromWatchlist}
                                    onRetry={fetchWatchlistPrices}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WatchlistSection;
