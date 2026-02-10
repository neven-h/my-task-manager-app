import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, X } from 'lucide-react';
import API_BASE from '../../config';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const WatchlistSection = ({ colors, authUser, authRole }) => {
    const [showWatchlist, setShowWatchlist] = useState(true);
    const [watchlist, setWatchlist] = useState([]);
    const [watchlistPrices, setWatchlistPrices] = useState({});
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

  // ==================== WATCHLIST FUNCTIONS ====================

  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${API_BASE}/portfolio/watchlist?username=${authUser}&role=${authRole}`);
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
      const response = await fetch(`${API_BASE}/portfolio/watchlist/prices?username=${authUser}`);
      if (response.ok) {
        const data = await response.json();
        const priceMap = {};
        if (data.prices) {
          data.prices.forEach(price => {
            if (price.ticker && !price.error) {
              priceMap[price.ticker] = price;
            }
          });
        }
        setWatchlistPrices(priceMap);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist prices:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchWatchlist();
    }
  }, [authUser]);

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchWatchlistPrices();
      const interval = setInterval(fetchWatchlistPrices, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [watchlist]);

  const handleSearchStocks = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`${API_BASE}/portfolio/search-stocks?q=${encodeURIComponent(searchQuery)}`);
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

  // Debounced search on input change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          setSearching(true);
          const response = await fetch(`${API_BASE}/portfolio/search-stocks?q=${encodeURIComponent(searchQuery)}`);
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
      }, 500); // Wait 500ms after user stops typing
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleAddToWatchlist = async (ticker, name) => {
    try {
      const response = await fetch(`${API_BASE}/portfolio/watchlist`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: authUser,
          ticker_symbol: ticker,
          stock_name: name
        })
      });

      if (response.ok) {
        await fetchWatchlist();
        setSearchQuery('');
        setSearchResults([]);
        setSuccess('Stock added to watchlist');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add stock to watchlist');
      }
    } catch (err) {
      setError('Failed to add stock to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (watchlistId) => {
    try {
      const response = await fetch(`${API_BASE}/portfolio/watchlist/${watchlistId}?username=${authUser}&role=${authRole}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchWatchlist();
        setSuccess('Stock removed from watchlist');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove stock from watchlist');
      }
    } catch (err) {
      setError('Failed to remove stock from watchlist');
    }
  };



    useEffect(() => { fetchWatchlist(); }, []);
    useEffect(() => {
        if (watchlist.length > 0) {
            fetchWatchlistPrices();
            const interval = setInterval(fetchWatchlistPrices, 60000);
            return () => clearInterval(interval);
        }
    }, [watchlist]);

    return (
        <div style={{
          background: colors.card,
          border: `3px solid ${colors.border}`,
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '800',
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <TrendingUp size={28} color={colors.primary} />
              Yahoo Finance Watchlist
            </h2>
            <button
              onClick={() => setShowWatchlist(!showWatchlist)}
              style={{
                padding: '0.5rem 1rem',
                background: colors.secondary,
                color: colors.text,
                border: `2px solid ${colors.border}`,
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.85rem',
                textTransform: 'uppercase'
              }}
            >
              {showWatchlist ? 'Hide' : 'Show'}
            </button>
          </div>

          {showWatchlist && (
            <>
              {/* Search Section */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: '#f8f8f8',
                border: `2px solid ${colors.border}`
              }}>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchStocks();
                    }}
                    placeholder="Search by ticker symbol (e.g., AAPL, TSLA, MSFT)..."
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: `3px solid ${colors.border}`,
                      fontSize: '1rem',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  />
                  <button
                    onClick={handleSearchStocks}
                    disabled={searching || !searchQuery.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: (searching || !searchQuery.trim()) ? colors.textLight : colors.primary,
                      color: '#fff',
                      border: `3px solid ${colors.border}`,
                      cursor: (searching || !searchQuery.trim()) ? 'not-allowed' : 'pointer',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    border: `2px solid ${colors.border}`,
                    background: '#fff'
                  }}>
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: idx < searchResults.length - 1 ? `1px solid ${colors.border}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{fontWeight: 700, fontSize: '1rem'}}>
                            {result.name}
                          </div>
                          <div style={{fontSize: '0.85rem', color: colors.textLight}}>
                            {result.ticker} • {result.exchange} • {result.currency}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToWatchlist(result.ticker, result.name)}
                          disabled={watchlist.some(w => w.ticker_symbol === result.ticker)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: watchlist.some(w => w.ticker_symbol === result.ticker) ? colors.textLight : colors.success,
                            color: '#fff',
                            border: `2px solid ${colors.border}`,
                            cursor: watchlist.some(w => w.ticker_symbol === result.ticker) ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            opacity: watchlist.some(w => w.ticker_symbol === result.ticker) ? 0.5 : 1
                          }}
                        >
                          {watchlist.some(w => w.ticker_symbol === result.ticker) ? 'Added' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Watchlist Display */}
              {watchlist.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  color: colors.textLight
                }}>
                  <TrendingUp size={48} style={{marginBottom: '1rem', opacity: 0.3}} />
                  <p style={{fontSize: '1.1rem', margin: '0 0 0.5rem 0'}}>No stocks in watchlist</p>
                  <p style={{fontSize: '0.9rem', margin: 0}}>Search for stocks above to add them to your watchlist</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem'
                }}>
                  {watchlist.map(item => {
                    const price = watchlistPrices[item.ticker_symbol];
                    const hasPrice = price && price.currentPrice !== null && price.currentPrice !== undefined;
                    const isPositive = price && price.change !== null && price.change >= 0;
                    
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: `3px solid ${colors.border}`,
                          padding: '1rem',
                          background: '#fff',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{flex: 1}}>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              marginBottom: '0.25rem'
                            }}>
                              {item.stock_name || item.ticker_symbol}
                            </div>
                            <div style={{
                              fontSize: '0.85rem',
                              color: colors.textLight,
                              fontWeight: 600
                            }}>
                              {item.ticker_symbol}
                              {price && price.exchange && ` • ${price.exchange}`}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromWatchlist(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              color: colors.accent,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Remove from watchlist"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {watchlistLoading ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '1rem',
                            color: colors.textLight,
                            fontSize: '0.9rem'
                          }}>
                            Loading price...
                          </div>
                        ) : hasPrice ? (
                          <div>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: 900,
                              marginBottom: '0.5rem',
                              color: colors.text
                            }}>
                              {Number(price.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {price.change !== null && price.change !== undefined && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: isPositive ? colors.success : colors.accent
                              }}>
                                {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {isPositive ? '+' : ''}{price.changePercent?.toFixed(2) || price.change?.toFixed(2)}%
                                {price.change !== null && (
                                  <span style={{fontSize: '0.8rem', opacity: 0.8}}>
                                    ({isPositive ? '+' : ''}{price.change.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            )}
                            {price.marketState && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: colors.textLight,
                                marginTop: '0.5rem',
                                textTransform: 'uppercase',
                                fontWeight: 600
                              }}>
                                {price.marketState === 'REGULAR' ? '● Market Open' : 
                                 price.marketState === 'CLOSED' ? '○ Market Closed' : 
                                 price.marketState}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '0.75rem',
                            color: colors.textLight,
                            fontSize: '0.85rem'
                          }}>
                            <div>Price unavailable</div>
                            <button
                              onClick={fetchWatchlistPrices}
                              style={{
                                marginTop: '0.5rem',
                                padding: '0.3rem 0.8rem',
                                background: colors.primary,
                                color: '#fff',
                                border: `1px solid ${colors.border}`,
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase'
                              }}
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

    );
};

export default WatchlistSection;
