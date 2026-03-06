import React, { useState, useEffect, useCallback } from 'react';
import { Upload, RefreshCw, Briefcase } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import YahooImportForm from './YahooImportForm';
import YahooPortfolioSummary from './YahooPortfolioSummary';
import YahooHoldingsTable from './YahooHoldingsTable';

const YahooPortfolioSection = ({ colors, authUser, defaultExpanded = false }) => {
    const [showYahooPortfolio, setShowYahooPortfolio] = useState(defaultExpanded);
    const [yahooHoldings, setYahooHoldings] = useState([]);
    const [yahooSummary, setYahooSummary] = useState(null);
    const [yahooLoading, setYahooLoading] = useState(false);
    const [showImportForm, setShowImportForm] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchYahooHoldings = useCallback(async () => {
        if (!authUser) return;
        try {
            setYahooLoading(true);
            const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings`, { headers: getAuthHeaders() });
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

    useEffect(() => { if (authUser) fetchYahooHoldings(); }, [authUser, fetchYahooHoldings]);

    useEffect(() => {
        if (yahooHoldings.length > 0) {
            const interval = setInterval(fetchYahooHoldings, 60000);
            return () => clearInterval(interval);
        }
    }, [yahooHoldings.length, fetchYahooHoldings]);

    const handleImported = async (msg) => {
        setSuccess(msg);
        setShowImportForm(false);
        await fetchYahooHoldings();
    };

    const handleDelete = async (holdingId) => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings/${holdingId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (response.ok) { setSuccess('Holding removed'); await fetchYahooHoldings(); }
            else { const data = await response.json(); setError(data.error || 'Failed to remove holding'); }
        } catch { setError('Failed to remove holding'); }
    };

    const handleClear = async () => {
        if (!window.confirm('Are you sure you want to clear all imported Yahoo Finance holdings?')) return;
        try {
            const response = await fetch(`${API_BASE}/portfolio/yahoo-holdings/clear`, { method: 'DELETE', headers: getAuthHeaders() });
            if (response.ok) { setSuccess('Yahoo Finance portfolio cleared'); setYahooHoldings([]); setYahooSummary(null); }
        } catch { setError('Failed to clear portfolio'); }
    };

    return (
        <div style={{ background: colors.card, border: `3px solid ${colors.border}`, padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={28} color={colors.primary} />
                    Yahoo Finance Portfolio
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowImportForm(!showImportForm)} style={{ padding: '0.5rem 1rem', background: colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Upload size={16} /> Import
                    </button>
                    {yahooHoldings.length > 0 && (
                        <button onClick={fetchYahooHoldings} disabled={yahooLoading} style={{ padding: '0.5rem 1rem', background: yahooLoading ? colors.textLight : colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: yahooLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                    )}
                    <button onClick={() => setShowYahooPortfolio(!showYahooPortfolio)} style={{ padding: '0.5rem 1rem', background: colors.secondary, color: colors.text, border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        {showYahooPortfolio ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {(error || success) && (
                <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: error ? '#fff0f0' : '#f0fff0', border: `2px solid ${error ? colors.accent : colors.success}`, color: error ? colors.accent : colors.success, fontWeight: 600, fontSize: '0.9rem' }}>
                    {error || success}
                </div>
            )}

            {showYahooPortfolio && (
                <>
                    {showImportForm && (
                        <YahooImportForm colors={colors} onImported={handleImported} onCancel={() => setShowImportForm(false)} />
                    )}

                    {yahooSummary && yahooHoldings.length > 0 && (
                        <YahooPortfolioSummary colors={colors} summary={yahooSummary} holdings={yahooHoldings} />
                    )}

                    {yahooHoldings.length === 0 ? (
                        yahooLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: colors.textLight }}>Loading Yahoo Finance portfolio...</div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: colors.textLight }}>
                                <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No Yahoo Finance holdings imported</p>
                                <p style={{ fontSize: '0.9rem', margin: '0 0 1rem 0' }}>Import your portfolio from Yahoo Finance using CSV export or enter ticker symbols manually.</p>
                                <button onClick={() => setShowImportForm(true)} style={{ padding: '0.75rem 2rem', background: colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Upload size={18} /> Import Portfolio
                                </button>
                            </div>
                        )
                    ) : (
                        <YahooHoldingsTable colors={colors} holdings={yahooHoldings} onDelete={handleDelete} onClear={handleClear} />
                    )}
                </>
            )}
        </div>
    );
};

export default YahooPortfolioSection;
