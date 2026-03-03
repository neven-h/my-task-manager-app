import React from 'react';
import { TrendingUp, TrendingDown, Edit2, Trash2, Copy } from 'lucide-react';
import { formatCurrencyWithCode } from '../../utils/formatCurrency';
import PortfolioOverviewTable from './PortfolioOverviewTable';

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

const calculateGrowth = (currentValue, basePrice) => {
    if (!basePrice || basePrice === 0) return null;
    return ((currentValue - basePrice) / basePrice) * 100;
};

const calculateChange = (currentEntry, previousEntry) => {
    if (!previousEntry) return null;
    const valueChange = currentEntry.value_ils - previousEntry.value_ils;
    const percentChange = previousEntry.value_ils !== 0
        ? (valueChange / previousEntry.value_ils) * 100
        : 0;
    return { valueChange, percentChange };
};

const StockEntryList = ({ groupedEntries, getStockSummary, stockPrices, priceLoading, loading, onRefreshPrices, onEdit, onDelete, onDuplicate }) => {
    return (
        <>
            {getStockSummary.length > 0 && (
                <PortfolioOverviewTable
                    getStockSummary={getStockSummary}
                    stockPrices={stockPrices}
                    priceLoading={priceLoading}
                    onRefreshPrices={onRefreshPrices}
                />
            )}

            {loading && Object.keys(groupedEntries).length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', border: `3px solid ${colors.border}`, background: colors.card }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: colors.text }}>⏳ Loading portfolio...</div>
                </div>
            )}

            {!loading && Object.keys(groupedEntries).length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', border: `3px solid ${colors.border}`, background: colors.card, marginTop: '2rem' }}>
                    <TrendingUp size={64} color={colors.textLight} style={{ marginBottom: '1rem' }} />
                    <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem', color: colors.text }}>No Portfolio Entries Yet</h2>
                    <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>Click "Add Entry" to start tracking your stock portfolio values</p>
                </div>
            )}

            {Object.entries(groupedEntries).map(([stockName, stockEntries]) => (
                <div key={stockName} className="stock-group" style={{ border: `2px solid ${colors.border}`, marginBottom: '1.5rem', background: colors.card }}>
                    <div style={{ background: colors.primary, color: '#fff', padding: '1rem 1.25rem', fontWeight: '700', fontSize: '1.1rem', borderBottom: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        <TrendingUp size={20} />
                        {stockName}
                    </div>
                    <div className="entries-table" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8', borderBottom: `2px solid ${colors.border}` }}>
                                    {['📅 Date','📦 Units','🏷️ Base Price','💰 Value','💵 Total Value','📈 Change','📊 Percentage','Actions'].map((h, i) => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: i >= 1 && i <= 5 ? 'right' : 'left', fontWeight: '700', fontSize: '0.9rem', color: colors.text, ...(i === 7 ? { width: '140px' } : {}) }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {stockEntries
                                    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
                                    .map((entry, index) => {
                                        const previousEntry = index < stockEntries.length - 1 ? stockEntries[index + 1] : null;
                                        const change = calculateChange(entry, previousEntry);
                                        const stockSummary = getStockSummary.find(s => s.name === entry.name);
                                        const baseGrowth = stockSummary ? calculateGrowth(entry.value_ils, stockSummary.basePrice) : null;
                                        const currency = entry.currency || 'USD';

                                        return (
                                            <tr key={entry.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: colors.text }}>
                                                    {new Date(entry.entry_date).toLocaleDateString('he-IL')}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: colors.text }}>
                                                    {(entry.units ?? 1).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: colors.textLight, fontStyle: 'italic' }}>
                                                    {entry.base_price != null ? formatCurrencyWithCode(entry.base_price, currency) : '—'}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em', fontSize: '0.95rem', color: colors.text }}>
                                                    {formatCurrencyWithCode(entry.value_ils, currency)}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem', color: colors.primary }}>
                                                    {entry.units != null && entry.value_ils != null
                                                        ? formatCurrencyWithCode(entry.value_ils * entry.units, currency)
                                                        : <span style={{ color: colors.textLight }}>—</span>}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                                                    {change ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                            <span style={{ fontWeight: '700', color: change.valueChange >= 0 ? colors.success : colors.accent, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                {change.valueChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                                {formatCurrencyWithCode(Math.abs(change.valueChange), currency)}
                                                            </span>
                                                            <span style={{ fontSize: '0.8rem', color: change.percentChange >= 0 ? colors.success : colors.accent, fontWeight: '600' }}>
                                                                {change.percentChange >= 0 ? '+' : ''}{change.percentChange.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    ) : baseGrowth !== null ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                            <span style={{ fontWeight: '700', color: baseGrowth >= 0 ? colors.success : colors.accent, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                {baseGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                                {formatCurrencyWithCode(Math.abs(entry.value_ils - (stockSummary?.basePrice || 0)), currency)}
                                                            </span>
                                                            <span style={{ fontSize: '0.8rem', color: baseGrowth >= 0 ? colors.success : colors.accent, fontWeight: '600' }}>
                                                                {baseGrowth >= 0 ? '+' : ''}{baseGrowth.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: colors.textLight }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.9rem', color: colors.text }}>
                                                    {entry.percentage ? (
                                                        <span style={{ padding: '0.3rem 0.6rem', background: colors.secondary, color: colors.text, fontSize: '0.85rem', fontWeight: '700', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                                                            {entry.percentage}%
                                                        </span>
                                                    ) : <span style={{ color: colors.textLight }}>-</span>}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', justifyContent: 'flex-start', alignItems: 'center' }}>
                                                        <button onClick={() => onEdit(entry)} style={{ width: '32px', height: '32px', padding: 0, background: colors.primary, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Edit2 size={14} /></button>
                                                        <button onClick={() => onDuplicate(entry)} title="Duplicate entry" style={{ width: '32px', height: '32px', padding: 0, background: colors.success, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Copy size={14} /></button>
                                                        <button onClick={() => onDelete(entry.id)} style={{ width: '32px', height: '32px', padding: 0, background: colors.accent, color: '#fff', border: `2px solid ${colors.border}`, cursor: 'pointer', fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </>
    );
};

export default StockEntryList;
