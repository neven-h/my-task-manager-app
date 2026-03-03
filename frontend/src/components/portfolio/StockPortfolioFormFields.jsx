import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import CustomAutocomplete from '../CustomAutocomplete';

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

const inputStyle = {
    width: '100%',
    padding: '1rem',
    border: `3px solid ${colors.border}`,
    fontSize: '1.05rem',
    fontFamily: '"Inter", sans-serif',
    boxSizing: 'border-box',
    outline: 'none'
};

const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '700',
    fontSize: '1.05rem',
    color: colors.text
};

const smallStyle = {
    color: colors.textLight,
    fontSize: '0.85rem',
    marginTop: '0.25rem',
    display: 'block'
};

const StockPortfolioFormFields = ({
    formData, stockNames, isNewStock, editingEntry,
    fetchingHistoricalPrice, historicalPriceInfo,
    error, loading,
    onInputChange, onStockNameChange, onFetchHistoricalPrice, onCloseForm, onClearError
}) => {
    return (
        <>
            {error && (
                <div style={{ background: colors.accent, color: '#fff', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', border: `2px solid ${colors.border}` }}>
                    <AlertCircle size={18} />
                    {error}
                    <button type="button" onClick={onClearError} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '0.25rem' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
                <CustomAutocomplete
                    value={formData.name}
                    onChange={(value) => onStockNameChange(value, stockNames)}
                    options={stockNames}
                    placeholder="e.g., Apple, Bitcoin, Real Estate"
                    label="📈 Stock/Asset Name"
                    required={true}
                />
                {isNewStock && (
                    <small style={{ color: colors.secondary, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>
                        ✨ New stock - base price will be set automatically
                    </small>
                )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>🏷️ Ticker Symbol (Optional)</label>
                <input type="text" name="ticker_symbol" value={formData.ticker_symbol} onChange={onInputChange} placeholder="e.g., AAPL, TSLA, BTC-USD" style={{ ...inputStyle, textTransform: 'uppercase' }} />
                <small style={smallStyle}>Enter Yahoo Finance ticker symbol to display live stock prices (e.g., AAPL for Apple, TSLA for Tesla)</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>💵 Base Price {isNewStock && !editingEntry ? '*' : '(Optional)'}</label>
                <input type="number" name="base_price" value={formData.base_price} onChange={onInputChange} required={isNewStock && !editingEntry} step="0.01" min="0" placeholder="Enter initial purchase price" style={inputStyle} />
                <small style={smallStyle}>This is the initial purchase price for tracking growth (in {formData.currency || 'USD'})</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>💱 Currency *</label>
                <select name="currency" value={formData.currency} onChange={onInputChange} required style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="ILS">₪ ILS (Israeli Shekel)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                </select>
                <small style={smallStyle}>Select the currency for this stock entry</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>📦 Number of Units/Shares</label>
                <input type="number" step="any" min="0" name="units" value={formData.units} onChange={onInputChange} placeholder="e.g. 1, 2.5, 100" autoComplete="off" style={inputStyle} />
                <small style={smallStyle}>Enter the number of shares/units (optional)</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>💰 Current Value *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <input type="number" name="value_ils" value={formData.value_ils} onChange={onInputChange} required step="0.01" min="0" placeholder="0.00" style={{ ...inputStyle, flex: 1 }} />
                    {formData.ticker_symbol?.trim() && formData.entry_date && (
                        <button type="button" onClick={onFetchHistoricalPrice} disabled={fetchingHistoricalPrice} title={`Fetch closing price for ${formData.ticker_symbol} on ${formData.entry_date} from Yahoo Finance`}
                            style={{ padding: '0 1rem', border: `3px solid ${colors.border}`, background: fetchingHistoricalPrice ? '#e9ecef' : '#FFD500', color: '#000', fontWeight: '700', fontSize: '0.85rem', fontFamily: '"Inter", sans-serif', cursor: fetchingHistoricalPrice ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {fetchingHistoricalPrice ? '⏳' : '📈 Fetch from Yahoo'}
                        </button>
                    )}
                </div>
                {historicalPriceInfo && (
                    <small style={{ color: '#1565c0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>
                        ✅ Price fetched for {historicalPriceInfo.actualDate} ({historicalPriceInfo.currency})
                        {historicalPriceInfo.actualDate !== formData.entry_date && (
                            <> — nearest trading day to {formData.entry_date}</>
                        )}
                    </small>
                )}
                <small style={smallStyle}>Enter manually or fetch the closing price from Yahoo Finance for the selected date</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>📊 Percentage of Portfolio</label>
                <input type="number" name="percentage" value={formData.percentage} onChange={onInputChange} step="0.01" min="0" max="100" placeholder="Optional (0-100)" style={inputStyle} />
                <small style={smallStyle}>Optional: What percentage of your total portfolio does this represent?</small>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>📅 Date *</label>
                <input type="date" name="entry_date" value={formData.entry_date} onChange={onInputChange} required style={inputStyle} />
                <small style={smallStyle}>You can select any date, including past dates</small>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '1.25rem', background: colors.success, color: '#fff', border: `3px solid ${colors.border}`, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '1.15rem', opacity: loading ? 0.5 : 1, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {loading ? '⏳ Saving...' : editingEntry ? '✅ Update Entry' : '✅ Add Entry'}
                </button>
                <button type="button" onClick={() => onCloseForm()} style={{ padding: '1.25rem 2rem', background: colors.card, border: `3px solid ${colors.border}`, cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', color: colors.text, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cancel
                </button>
            </div>
        </>
    );
};

export default StockPortfolioFormFields;
