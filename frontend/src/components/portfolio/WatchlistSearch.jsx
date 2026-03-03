import React, { useState, useRef, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const WatchlistSearch = ({ colors, watchlist, onAdd }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef(null);

    const fetchResults = async (query) => {
        try {
            setSearching(true);
            const response = await fetch(`${API_BASE}/portfolio/search-stocks?q=${encodeURIComponent(query)}`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.results || []);
            }
        } catch (err) {
            console.error('Failed to search stocks:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (searchQuery.trim().length >= 2) {
            searchTimeoutRef.current = setTimeout(() => fetchResults(searchQuery), 500);
        } else {
            setSearchResults([]);
        }
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery]);

    const handleAdd = (ticker, name) => {
        onAdd(ticker, name);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f8f8', border: `2px solid ${colors.border}` }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) fetchResults(searchQuery); }}
                    placeholder="Search by ticker symbol (e.g., AAPL, TSLA, MSFT)..."
                    style={{ flex: 1, padding: '0.75rem 1rem', border: `3px solid ${colors.border}`, fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}
                />
                <button
                    onClick={() => searchQuery.trim() && fetchResults(searchQuery)}
                    disabled={searching || !searchQuery.trim()}
                    style={{ padding: '0.75rem 1.5rem', background: (searching || !searchQuery.trim()) ? colors.textLight : colors.primary, color: '#fff', border: `3px solid ${colors.border}`, cursor: (searching || !searchQuery.trim()) ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                >
                    {searching ? 'Searching...' : 'Search'}
                </button>
            </div>

            {searchResults.length > 0 && (
                <div style={{ marginTop: '1rem', border: `2px solid ${colors.border}`, background: '#fff' }}>
                    {searchResults.map((result, idx) => {
                        const alreadyAdded = watchlist.some(w => w.ticker_symbol === result.ticker);
                        return (
                            <div key={idx} style={{ padding: '0.75rem 1rem', borderBottom: idx < searchResults.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{result.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: colors.textLight }}>{result.ticker} • {result.exchange} • {result.currency}</div>
                                </div>
                                <button
                                    onClick={() => handleAdd(result.ticker, result.name)}
                                    disabled={alreadyAdded}
                                    style={{ padding: '0.5rem 1rem', background: alreadyAdded ? colors.textLight : colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: alreadyAdded ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', opacity: alreadyAdded ? 0.5 : 1 }}
                                >
                                    {alreadyAdded ? 'Added' : 'Add'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WatchlistSearch;
