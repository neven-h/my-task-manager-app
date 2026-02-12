import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, RefreshCw, TrendingUp, TrendingDown, X, AlertCircle, Briefcase } from 'lucide-react';
import API_BASE from '../../config';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';

const YahooPortfolioSection = ({ colors, authUser, authRole, defaultExpanded = false }) => {
    const [showYahooPortfolio, setShowYahooPortfolio] = useState(defaultExpanded);
    const [yahooHoldings, setYahooHoldings] = useState([]);
    const [yahooSummary, setYahooSummary] = useState(null);
    const [yahooLoading, setYahooLoading] = useState(false);
    const [showYahooImportForm, setShowYahooImportForm] = useState(false);
    const [yahooImportTickers, setYahooImportTickers] = useState('');
    const [yahooImporting, setYahooImporting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const yahooFileInputRef = useRef(null);

  // ==================== YAHOO FINANCE PORTFOLIO FUNCTIONS ====================

  const fetchYahooHoldings = useCallback(async () => {
    if (!authUser) return;
    try {
      setYahooLoading(true);
      const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings?username=${authUser}`);
      if (response.ok) {
        const data = await response.json();
        setYahooHoldings(data.holdings || []);
        setYahooSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch Yahoo holdings:', err);
    } finally {
      setYahooLoading(false);
    }
  }, [authUser]);

  const handleYahooCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setYahooImporting(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('username', authUser);

      const response = await fetch(`${API_BASE}/portfolio/yahoo-import`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Successfully imported ${data.count} holdings from Yahoo Finance`);
        await fetchYahooHoldings();
        setShowYahooImportForm(false);
      } else {
        setError(data.error || 'Failed to import portfolio');
      }
    } catch (err) {
      setError('Failed to import Yahoo Finance portfolio');
    } finally {
      setYahooImporting(false);
      if (yahooFileInputRef.current) {
        yahooFileInputRef.current.value = '';
      }
    }
  };

  const handleYahooTickerImport = async () => {
    if (!yahooImportTickers.trim()) return;

    try {
      setYahooImporting(true);
      setError(null);
      const tickers = yahooImportTickers
        .split(/[,\n\s]+/)
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);

      if (tickers.length === 0) {
        setError('Please enter at least one ticker symbol');
        return;
      }

      const response = await fetch(`${API_BASE}/portfolio/yahoo-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUser, tickers })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Successfully imported ${data.count} holdings`);
        setYahooImportTickers('');
        await fetchYahooHoldings();
        setShowYahooImportForm(false);
      } else {
        setError(data.error || 'Failed to import tickers');
      }
    } catch (err) {
      setError('Failed to import tickers');
    } finally {
      setYahooImporting(false);
    }
  };

  const handleDeleteYahooHolding = async (holdingId) => {
    try {
      const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings/${holdingId}?username=${authUser}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Holding removed');
        await fetchYahooHoldings();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove holding');
      }
    } catch (err) {
      setError('Failed to remove holding');
    }
  };

  const handleClearYahooPortfolio = async () => {
    if (!window.confirm('Are you sure you want to clear all imported Yahoo Finance holdings?')) return;
    try {
      const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings/clear?username=${authUser}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSuccess('Yahoo Finance portfolio cleared');
        setYahooHoldings([]);
        setYahooSummary(null);
      }
    } catch (err) {
      setError('Failed to clear portfolio');
    }
  };

  // Fetch Yahoo holdings on mount
  useEffect(() => {
    if (authUser) {
      fetchYahooHoldings();
    }
  }, [authUser, fetchYahooHoldings]);

  // Auto-refresh Yahoo holdings every 60 seconds
  useEffect(() => {
    if (yahooHoldings.length > 0) {
      const interval = setInterval(fetchYahooHoldings, 60000);
      return () => clearInterval(interval);
    }
  }, [yahooHoldings.length, fetchYahooHoldings]);



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
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
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
              <Briefcase size={28} color={colors.primary} />
              My Yahoo Finance Portfolio
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowYahooImportForm(!showYahooImportForm)}
                style={{
                  padding: '0.5rem 1rem',
                  background: colors.primary,
                  color: '#fff',
                  border: `2px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Upload size={16} />
                Import
              </button>
              {yahooHoldings.length > 0 && (
                <button
                  onClick={fetchYahooHoldings}
                  disabled={yahooLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: yahooLoading ? colors.textLight : colors.success,
                    color: '#fff',
                    border: `2px solid ${colors.border}`,
                    cursor: yahooLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={16} className={yahooLoading ? 'spinning' : ''} />
                  Refresh
                </button>
              )}
              <button
                onClick={() => setShowYahooPortfolio(!showYahooPortfolio)}
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
                {showYahooPortfolio ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showYahooPortfolio && (
            <>
              {/* Import Form */}
              {showYahooImportForm && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: '#f8f8f8',
                  border: `2px solid ${colors.border}`
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
                    Import Your Yahoo Finance Portfolio
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: colors.textLight, margin: '0 0 1rem 0' }}>
                    Upload a CSV exported from Yahoo Finance, or enter ticker symbols manually.
                  </p>

                  {/* CSV Upload */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      marginBottom: '0.5rem'
                    }}>
                      Option 1: Upload Yahoo Finance CSV
                    </label>
                    <p style={{ fontSize: '0.8rem', color: colors.textLight, margin: '0 0 0.5rem 0' }}>
                      Go to Yahoo Finance &rarr; My Portfolio &rarr; Export to CSV, then upload the file here.
                    </p>
                    <input
                      ref={yahooFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleYahooCSVImport}
                      disabled={yahooImporting}
                      style={{
                        padding: '0.5rem',
                        border: `2px solid ${colors.border}`,
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Divider */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    margin: '1.25rem 0',
                    color: colors.textLight
                  }}>
                    <div style={{ flex: 1, height: '1px', background: colors.border }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: colors.border }} />
                  </div>

                  {/* Manual Ticker Entry */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      marginBottom: '0.5rem'
                    }}>
                      Option 2: Enter Ticker Symbols
                    </label>
                    <p style={{ fontSize: '0.8rem', color: colors.textLight, margin: '0 0 0.5rem 0' }}>
                      Enter ticker symbols separated by commas, spaces, or new lines (e.g., AAPL, MSFT, GOOGL).
                    </p>
                    <textarea
                      value={yahooImportTickers}
                      onChange={(e) => setYahooImportTickers(e.target.value)}
                      placeholder="AAPL, MSFT, GOOGL, TSLA, AMZN..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${colors.border}`,
                        fontSize: '0.95rem',
                        fontFamily: '"Inter", monospace',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <button
                        onClick={handleYahooTickerImport}
                        disabled={yahooImporting || !yahooImportTickers.trim()}
                        style={{
                          padding: '0.6rem 1.5rem',
                          background: (yahooImporting || !yahooImportTickers.trim()) ? colors.textLight : colors.primary,
                          color: '#fff',
                          border: `2px solid ${colors.border}`,
                          cursor: (yahooImporting || !yahooImportTickers.trim()) ? 'not-allowed' : 'pointer',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          textTransform: 'uppercase'
                        }}
                      >
                        {yahooImporting ? 'Importing...' : 'Import Tickers'}
                      </button>
                      <button
                        onClick={() => setShowYahooImportForm(false)}
                        style={{
                          padding: '0.6rem 1.5rem',
                          background: colors.card,
                          border: `2px solid ${colors.border}`,
                          cursor: 'pointer',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          textTransform: 'uppercase'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Portfolio Summary */}
              {yahooSummary && yahooHoldings.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    padding: '1rem',
                    background: '#f0f7ff',
                    border: `2px solid ${colors.primary}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textLight, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Total Value
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: colors.text }}>
                      {formatCurrencyWithCode(yahooSummary.totalValue || 0, 'USD')}
                    </div>
                    {yahooHoldings.some(h => h.currency !== 'USD') && (
                      <div style={{ fontSize: '0.7rem', color: colors.textLight, marginTop: '0.25rem' }}>
                        (USD Summary)
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: '#f0f7ff',
                    border: `2px solid ${colors.primary}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textLight, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Total Cost
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: colors.text }}>
                      {formatCurrencyWithCode(yahooSummary.totalCost || 0, 'USD')}
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: yahooSummary.totalGainLoss >= 0 ? '#f0fff0' : '#fff0f0',
                    border: `2px solid ${yahooSummary.totalGainLoss >= 0 ? colors.success : colors.accent}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textLight, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Total Gain/Loss
                    </div>
                    <div style={{
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      color: yahooSummary.totalGainLoss >= 0 ? colors.success : colors.accent
                    }}>
                      {yahooSummary.totalGainLoss >= 0 ? '+' : ''}{formatCurrencyWithCode(Math.abs(yahooSummary.totalGainLoss || 0), 'USD')}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: yahooSummary.totalGainLossPct >= 0 ? colors.success : colors.accent,
                      marginTop: '0.25rem'
                    }}>
                      ({yahooSummary.totalGainLossPct >= 0 ? '+' : ''}{yahooSummary.totalGainLossPct?.toFixed(2)}%)
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: '#f8f8f8',
                    border: `2px solid ${colors.border}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textLight, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Holdings
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: colors.text }}>
                      {yahooSummary.holdingsCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Holdings Table */}
              {yahooHoldings.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  color: colors.textLight
                }}>
                  <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No Yahoo Finance holdings imported</p>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                    Import your portfolio from Yahoo Finance using CSV export or enter ticker symbols manually.
                  </p>
                  <button
                    onClick={() => setShowYahooImportForm(true)}
                    style={{
                      padding: '0.75rem 2rem',
                      background: colors.primary,
                      color: '#fff',
                      border: `2px solid ${colors.border}`,
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Upload size={18} />
                    Import Portfolio
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                      <thead>
                        <tr style={{ background: colors.primary }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Symbol</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Name</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Qty</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Avg Cost</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Price</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Change</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Value</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>Gain/Loss</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {yahooHoldings
                          .sort((a, b) => (b.positionValue || 0) - (a.positionValue || 0))
                          .map(holding => {
                            const isPositive = holding.gainLoss != null && holding.gainLoss >= 0;
                            const isPriceUp = holding.change != null && holding.change >= 0;
                            return (
                              <tr key={holding.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, fontSize: '0.9rem', color: colors.primary }}>
                                  {holding.ticker}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: colors.text, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {holding.name}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600 }}>
                                  {holding.quantity > 0 ? holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '-'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                                  {holding.avgCostBasis > 0 ? formatCurrencyWithCode(holding.avgCostBasis, holding.currency || 'USD') : '-'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                                  {holding.currentPrice != null
                                    ? formatCurrencyWithCode(Number(holding.currentPrice), holding.currency || 'USD')
                                    : holding.error ? 'N/A' : '...'}
                                </td>
                                <td style={{
                                  padding: '0.6rem 0.75rem',
                                  textAlign: 'right',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: isPriceUp ? colors.success : colors.accent
                                }}>
                                  {holding.changePercent != null
                                    ? `${isPriceUp ? '+' : ''}${holding.changePercent.toFixed(2)}%`
                                    : '-'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                                  {holding.positionValue != null && holding.positionValue > 0
                                    ? formatCurrencyWithCode(holding.positionValue, holding.currency || 'USD')
                                    : '-'}
                                </td>
                                <td style={{
                                  padding: '0.6rem 0.75rem',
                                  textAlign: 'right',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: isPositive ? colors.success : colors.accent
                                }}>
                                  {holding.gainLoss != null && holding.positionCost > 0 ? (
                                    <div>
                                      <div>{isPositive ? '+' : ''}{formatCurrencyWithCode(Math.abs(holding.gainLoss), holding.currency || 'USD')}</div>
                                      <div style={{ fontSize: '0.75rem' }}>
                                        ({isPositive ? '+' : ''}{holding.gainLossPct?.toFixed(2)}%)
                                      </div>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleDeleteYahooHolding(holding.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      color: colors.accent,
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Remove holding"
                                  >
                                    <X size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {yahooHoldings.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleClearYahooPortfolio}
                        style={{
                          padding: '0.5rem 1rem',
                          background: colors.card,
                          border: `2px solid ${colors.accent}`,
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          color: colors.accent,
                          textTransform: 'uppercase'
                        }}
                      >
                        Clear All Holdings
                      </button>
                    </div>
                  )}
                </>
              )}

              {yahooLoading && yahooHoldings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.textLight }}>
                  Loading Yahoo Finance portfolio...
                </div>
              )}
            </>
          )}
        </div>

    );
};

export default YahooPortfolioSection;
