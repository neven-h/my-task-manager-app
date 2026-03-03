import React, { useState, useRef } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const YahooImportForm = ({ colors, onImported, onCancel }) => {
    const [tickers, setTickers] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleCSVImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setImporting(true);
            setError(null);
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE}/portfolio/yahoo-import`, { method: 'POST', headers: getAuthHeaders(false), body: formData });
            const data = await response.json();
            if (response.ok) {
                onImported(`Successfully imported ${data.count} holdings from Yahoo Finance`);
            } else {
                setError(data.error || 'Failed to import portfolio');
            }
        } catch {
            setError('Failed to import Yahoo Finance portfolio');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleTickerImport = async () => {
        if (!tickers.trim()) return;
        const tickerList = tickers.split(/[,\n\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
        if (tickerList.length === 0) { setError('Please enter at least one ticker symbol'); return; }
        try {
            setImporting(true);
            setError(null);
            const response = await fetch(`${API_BASE}/portfolio/yahoo-import`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ tickers: tickerList }) });
            const data = await response.json();
            if (response.ok) {
                setTickers('');
                onImported(`Successfully imported ${data.count} holdings`);
            } else {
                setError(data.error || 'Failed to import tickers');
            }
        } catch {
            setError('Failed to import tickers');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#f8f8f8', border: `2px solid ${colors.border}` }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Import Your Yahoo Finance Portfolio</h3>
            {error && <div style={{ color: colors.accent, marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}
            <p style={{ fontSize: '0.9rem', color: colors.textLight, margin: '0 0 1rem 0' }}>
                Upload a CSV exported from Yahoo Finance, or enter ticker symbols manually.
            </p>

            {/* CSV Upload */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Option 1: Upload Yahoo Finance CSV</label>
                <p style={{ fontSize: '0.8rem', color: colors.textLight, margin: '0 0 0.5rem 0' }}>
                    Go to Yahoo Finance → My Portfolio → Export to CSV, then upload the file here.
                </p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} disabled={importing}
                    style={{ padding: '0.5rem', border: `2px solid ${colors.border}`, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0', color: colors.textLight }}>
                <div style={{ flex: 1, height: '1px', background: colors.border }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: colors.border }} />
            </div>

            {/* Manual Ticker Entry */}
            <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Option 2: Enter Ticker Symbols</label>
                <p style={{ fontSize: '0.8rem', color: colors.textLight, margin: '0 0 0.5rem 0' }}>
                    Enter ticker symbols separated by commas, spaces, or new lines (e.g., AAPL, MSFT, GOOGL).
                </p>
                <textarea value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="AAPL, MSFT, GOOGL, TSLA, AMZN..." rows={3}
                    style={{ width: '100%', padding: '0.75rem', border: `2px solid ${colors.border}`, fontSize: '0.95rem', fontFamily: '"Inter", monospace', boxSizing: 'border-box', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button onClick={handleTickerImport} disabled={importing || !tickers.trim()}
                        style={{ padding: '0.6rem 1.5rem', background: (importing || !tickers.trim()) ? colors.textLight : colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: (importing || !tickers.trim()) ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                        {importing ? 'Importing...' : 'Import Tickers'}
                    </button>
                    <button onClick={onCancel}
                        style={{ padding: '0.6rem 1.5rem', background: colors.card, border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default YahooImportForm;
