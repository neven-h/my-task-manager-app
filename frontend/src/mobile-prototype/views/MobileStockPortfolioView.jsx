import React, {useState, useEffect} from 'react';
import { AlertCircle, ArrowLeft, Plus, TrendingDown, TrendingUp, X } from 'lucide-react';
import CustomAutocomplete from '../../components/CustomAutocomplete';
import YahooPortfolioSection from '../../components/portfolio/YahooPortfolioSection';
import API_BASE from '../../config';
import { formatCurrency, formatCurrencyWithCode } from '../../utils/formatCurrency';
import { getAuthHeaders } from '../../api.js';

const THEME = {
    bg: '#fff', primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    text: '#000', muted: '#666', success: '#00AA00', border: '#000'
};
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

// Mobile Stock Portfolio View Component
const PORTFOLIO_DRAFT_STORAGE_KEY = 'mobile_portfolio_entry_draft';

const MobileStockPortfolioView = ({authUser, authRole, onBack}) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [stockNames, setStockNames] = useState([]);
    const [stockPrices, setStockPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [summaryDisplayCurrency, setSummaryDisplayCurrency] = useState('ILS');
    const [formData, setFormData] = useState({
        name: '',
        ticker_symbol: '',
        percentage: '',
        value_ils: '',
        base_price: '',
        entry_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        units: ''
    });

    // Prevent body scroll when form is open
    useEffect(() => {
        if (showForm) {
            const originalOverflow = window.getComputedStyle(document.body).overflow;
            const originalPosition = window.getComputedStyle(document.body).position;
            const originalWidth = window.getComputedStyle(document.body).width;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                document.body.style.width = originalWidth;
            };
        }
    }, [showForm]);

    useEffect(() => {
        fetchTabs();
    }, [authUser, authRole]);

    useEffect(() => {
        if (activeTabId !== null) {
            fetchEntries();
            fetchSummary();
            fetchStockNames();
        }
    }, [activeTabId]);

    useEffect(() => {
        if (activeTabId !== null && entries.length > 0) {
            fetchStockPrices();
            const interval = setInterval(fetchStockPrices, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [activeTabId, entries]);

    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio-tabs`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (Array.isArray(data)) {
                const normalized = data.map(t => ({ ...t, id: Number(t.id) }));
                setTabs(normalized);
                if (normalized.length > 0) {
                    setActiveTabId(prev => (prev !== null ? prev : normalized[0].id));
                } else {
                    // Create default tab so new entries always have a tab
                    const createRes = await fetch(`${API_BASE}/portfolio-tabs`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ name: 'Default' })
                    });
                    if (createRes.ok) {
                        const newTab = await createRes.json();
                        const id = Number(newTab.id ?? newTab.tab_id);
                        if (id) {
                            setTabs([{ id, name: 'Default' }]);
                            setActiveTabId(id);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching tabs:', err);
        }
    };

    const handleCreateTab = async () => {
        const name = window.prompt('New tab name:', '');
        if (!name || !name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/portfolio-tabs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: name.trim() })
            });
            if (!res.ok) return;
            const newTab = await res.json();
            const id = Number(newTab.id ?? newTab.tab_id);
            if (id) {
                setTabs(prev => [...prev, { id, name: newTab.name || name.trim() }]);
                setActiveTabId(id);
                setEntries([]);
                setSummary(null);
            }
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    const fetchEntries = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch(`${API_BASE}/portfolio?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const raw = Array.isArray(data) ? data : [];
            const normalized = raw.map(entry => ({ ...entry, name: entry.name ?? '' }));
            setEntries(normalized);
        } catch (err) {
            console.error('Error fetching entries:', err);
            setEntries([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/summary?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            const isValid = response.ok && data && !data.error && (typeof data.total_value_ils === 'number' || Array.isArray(data.entries));
            setSummary(isValid ? data : null);
        } catch (err) {
            console.error('Error fetching summary:', err);
            setSummary(null);
        }
    };

    const fetchStockNames = async () => {
        try {
            const response = await fetch(`${API_BASE}/portfolio/names?tab_id=${activeTabId}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (!response.ok || !data || data.error) {
                setStockNames([]);
                return;
            }
            const names = Array.isArray(data) ? data.map(s => typeof s === 'string' ? s : (s && s.name) ?? '') : [];
            setStockNames(names);
        } catch (err) {
            console.error('Error fetching stock names:', err);
            setStockNames([]);
        }
    };

    const fetchStockPrices = async () => {
        if (!activeTabId || entries.length === 0) return;
        
        try {
            setPriceLoading(true);
            // Get unique ticker symbols from entries
            const tickers = [...new Set(entries
                .map(entry => entry.ticker_symbol)
                .filter(ticker => ticker && ticker.trim() !== ''))];
            
            if (tickers.length === 0) {
                setPriceLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE}/portfolio/stock-prices`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({tickers})
            });

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
                setStockPrices(priceMap);
            }
        } catch (err) {
            console.error('Failed to fetch stock prices:', err);
        } finally {
            setPriceLoading(false);
        }
    };

    // Draft management functions
    const getEmptyFormData = () => ({
        name: '',
        ticker_symbol: '',
        percentage: '',
        value_ils: '',
        base_price: '',
        entry_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        units: ''
    });

    const isFormDirty = () => {
        if (!showForm || editingEntry) return false; // Don't check for edits, only new entries
        if (!initialFormData) return false;
        
        // Check if any field has changed from initial state
        return (
            formData.name !== initialFormData.name ||
            formData.ticker_symbol !== initialFormData.ticker_symbol ||
            formData.percentage !== initialFormData.percentage ||
            formData.value_ils !== initialFormData.value_ils ||
            formData.base_price !== initialFormData.base_price ||
            formData.entry_date !== initialFormData.entry_date ||
            formData.currency !== initialFormData.currency ||
            formData.units !== initialFormData.units
        );
    };

    const hasFormData = () => {
        // Check if form has any meaningful data
        return !!(
            formData.name?.trim() ||
            formData.ticker_symbol?.trim() ||
            formData.percentage ||
            formData.value_ils ||
            formData.base_price ||
            formData.currency !== 'USD' ||
            formData.units !== ''
        );
    };

    const saveDraft = () => {
        if (!editingEntry && hasFormData()) {
            localStorage.setItem(PORTFOLIO_DRAFT_STORAGE_KEY, JSON.stringify({
                ...formData,
                tab_id: activeTabId
            }));
        }
    };

    const loadDraft = () => {
        try {
            const draft = localStorage.getItem(PORTFOLIO_DRAFT_STORAGE_KEY);
            if (draft) {
                const draftData = JSON.parse(draft);
                // Only load if it's for the current tab or no tab was saved
                if (!draftData.tab_id || draftData.tab_id === activeTabId) {
                    return draftData;
                }
            }
        } catch (e) {
            console.error('Error loading draft:', e);
        }
        return null;
    };

    const clearDraft = () => {
        localStorage.removeItem(PORTFOLIO_DRAFT_STORAGE_KEY);
    };

    const handleCloseForm = (forceClose = false) => {
        if (forceClose || !isFormDirty()) {
            // Clear draft if closing without saving
            if (!editingEntry) {
                clearDraft();
            }
            setShowForm(false);
            setEditingEntry(null);
            setInitialFormData(null);
            setFormData(getEmptyFormData());
        } else {
            // Show draft dialog
            setShowDraftDialog(true);
        }
    };

    const handleSaveDraft = () => {
        saveDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const handleDismissDraft = () => {
        clearDraft();
        handleCloseForm(true);
        setShowDraftDialog(false);
    };

    const handleSaveEntry = async () => {
        try {
            setLoading(true);
            const url = editingEntry
                ? `${API_BASE}/portfolio/${editingEntry.id}`
                : `${API_BASE}/portfolio`;
            const method = editingEntry ? 'PUT' : 'POST';

            // Parse units - allow decimal values, null if empty
            const unitsValue = formData.units;
            let units = null;
            if (unitsValue != null && String(unitsValue).trim() !== '') {
                const numValue = parseFloat(String(unitsValue).trim());
                if (!isNaN(numValue) && numValue > 0 && isFinite(numValue)) {
                    units = numValue;
                }
            }

            const body = {
                ...formData,
                tab_id: Number(activeTabId),
                percentage: parseFloat(formData.percentage) || 0,
                value_ils: parseFloat(formData.value_ils) || 0,
                base_price: (formData.base_price !== '' && formData.base_price != null) ? parseFloat(formData.base_price) : null,
                currency: formData.currency || 'USD',
                units: units  // Always a positive integer
            };

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                // Clear draft on successful save
                if (!editingEntry) {
                    clearDraft();
                }
                handleCloseForm(true); // Force close immediately
                setLoading(false); // Stop loading so UI is responsive
                // Refresh data in background without showing loading again
                fetchEntries(true);
                fetchSummary();
                return; // Skip finally's setLoading
            }
        } catch (err) {
            console.error('Failed to save entry:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await fetch(`${API_BASE}/portfolio/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchEntries();
            await fetchSummary();
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    // Group entries by stock name (safe key so reduce never uses undefined)
    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.name ?? '';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {});

    // Helper: current price per unit (live or from stored value), total value, and growth (guarded against division by zero and non-finite value_ils)
    const getEntryValues = (entry, livePrice) => {
        const units = entry.units != null && entry.units !== '' && Number(entry.units) > 0 ? Number(entry.units) : 1;
        const currency = entry.currency || 'ILS';
        const valueNum = Number(entry.value_ils);
        const safeValue = Number.isFinite(valueNum) ? valueNum : 0;
        const currentPricePerUnit = livePrice?.currentPrice ?? (safeValue / units);
        const totalValue = units * (Number.isFinite(currentPricePerUnit) ? currentPricePerUnit : safeValue);
        const basePrice = entry.base_price != null && entry.base_price !== '' ? parseFloat(entry.base_price) : null;
        const growthAmount = basePrice != null && basePrice !== 0
            ? currentPricePerUnit - basePrice
            : null;
        const growthPercent = basePrice != null && basePrice !== 0
            ? ((currentPricePerUnit - basePrice) / basePrice) * 100
            : null;
        return { units, currency, currentPricePerUnit, totalValue, growthAmount, growthPercent };
    };

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        STOCK PORTFOLIO
                    </h1>
                </div>

                {/* Tabs */}
                {tabs.length > 0 ? (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        minHeight: '44px',
                        alignItems: 'center',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(Number(tab.id))}
                                style={{
                                    padding: '8px 16px',
                                    border: '3px solid #000',
                                    background: Number(activeTabId) === Number(tab.id) ? THEME.primary : '#fff',
                                    color: Number(activeTabId) === Number(tab.id) ? '#fff' : '#000',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                {tab.name}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={handleCreateTab}
                            style={{
                                padding: '8px 16px',
                                border: '3px solid #000',
                                background: THEME.secondary,
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            + Tab
                        </button>
                    </div>
                ) : (
                    <div style={{minHeight: '44px', display: 'flex', alignItems: 'center'}}>
                        <p style={{fontSize: '0.9rem', color: THEME.muted, margin: 0}}>Loading tabs...</p>
                    </div>
                )}
            </div>

            {/* Summary */}
            {summary && (
                <div style={{padding: '16px', borderBottom: '3px solid #000', background: '#f8f8f8'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                        <span style={{fontSize: '1.5rem', fontWeight: 900}}>
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
                                background: THEME.primary,
                                color: '#fff',
                                border: '2px solid #000',
                                cursor: 'pointer',
                                fontFamily: FONT_STACK,
                                textTransform: 'uppercase'
                            }}
                        >
                            {summaryDisplayCurrency === 'ILS' ? '₪ ILS' : '$ USD'}
                        </button>
                    </div>
                    {summary.exchange_rates && summary.exchange_rates.USD && (
                        <div style={{fontSize: '0.8rem', color: THEME.muted, marginBottom: '4px'}}>
                            USD/ILS: {summary.exchange_rates.USD.toFixed(2)}
                        </div>
                    )}
                    <div style={{fontSize: '0.85rem', color: THEME.muted}}>
                        {summary.entries?.length ?? summary.count ?? 0} stocks
                    </div>
                </div>
            )}

            {/* Yahoo Finance widget */}
            <div style={{ padding: '0 16px 16px' }}>
                <YahooPortfolioSection
                    colors={{ ...THEME, textLight: THEME.muted }}
                    authUser={authUser}
                    authRole={authRole}
                    defaultExpanded={true}
                />
            </div>

            {/* Entries List */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : Object.keys(groupedEntries).length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                        No portfolio entries found
                    </div>
                ) : (
                    Object.entries(groupedEntries).map(([stockName, stockEntries]) => {
                        const tickerSymbol = stockEntries[0]?.ticker_symbol;
                        const livePrice = tickerSymbol ? stockPrices[tickerSymbol] : null;
                        
                        return (
                            <div
                                key={stockName}
                                style={{
                                    border: '3px solid #000',
                                    padding: '16px',
                                    marginBottom: '16px',
                                    background: '#fff'
                                }}
                            >
                                <div style={{fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px'}}>
                                    {stockName}
                                    {tickerSymbol && (
                                        <span style={{fontSize: '0.8rem', color: THEME.muted, marginLeft: '8px'}}>
                                            ({tickerSymbol})
                                        </span>
                                    )}
                                </div>
                                
                                {/* Live Price Display */}
                                {livePrice && livePrice.currentPrice && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#f8f8f8',
                                        border: '2px solid #000',
                                        marginBottom: '12px',
                                        fontSize: '0.85rem'
                                    }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontWeight: 700, fontSize: '0.9rem'}}>
                                                    Live Price: {formatCurrency(livePrice.currentPrice)} {livePrice.currency || 'USD'}
                                                </div>
                                                {livePrice.change !== null && livePrice.change !== undefined && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: livePrice.change >= 0 ? THEME.success : THEME.accent,
                                                        fontWeight: 700,
                                                        marginTop: '2px'
                                                    }}>
                                                        {livePrice.change >= 0 ? '↑' : '↓'} {Math.abs(livePrice.change).toFixed(2)} 
                                                        {livePrice.changePercent !== null && livePrice.changePercent !== undefined && 
                                                            ` (${livePrice.changePercent >= 0 ? '+' : ''}${livePrice.changePercent.toFixed(2)}%)`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            {priceLoading && (
                                                <div style={{fontSize: '0.7rem', color: THEME.muted}}>Updating...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            {stockEntries.map(entry => {
                                const { units, currency, totalValue, growthAmount, growthPercent } = getEntryValues(entry, livePrice);
                                return (
                                <div
                                    key={entry.id}
                                    style={{
                                        border: '2px solid #000',
                                        padding: '12px',
                                        marginBottom: '8px',
                                        background: '#f8f8f8'
                                    }}
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                        <div style={{fontSize: '0.85rem', color: THEME.muted}}>
                                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div style={{fontSize: '1.1rem', fontWeight: 900}}>
                                            {formatCurrencyWithCode(entry.value_ils, currency)}
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: THEME.muted}}>
                                        <span>Quantity: {(units).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
                                        <span>{entry.percentage}%</span>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px'}}>
                                        <span>Total value: {formatCurrencyWithCode(totalValue, currency)}</span>
                                    </div>
                                    {entry.base_price != null && entry.base_price !== '' && (
                                        <div style={{fontSize: '0.8rem', marginBottom: '4px'}}>
                                            Base: {formatCurrencyWithCode(parseFloat(entry.base_price), currency)}
                                        </div>
                                    )}
                                    {(growthAmount != null && growthPercent != null) ? (
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: growthAmount >= 0 ? THEME.success : THEME.accent,
                                            marginBottom: '8px'
                                        }}>
                                            {growthAmount >= 0 ? <TrendingUp size={14} style={{verticalAlign: 'middle', marginRight: '4px'}} /> : <TrendingDown size={14} style={{verticalAlign: 'middle', marginRight: '4px'}} />}
                                            {formatCurrencyWithCode(Math.abs(growthAmount), currency)} ({growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%)
                                        </div>
                                    ) : (
                                        <div style={{fontSize: '0.8rem', color: THEME.muted, marginBottom: '8px'}}>Growth: —</div>
                                    )}
                                    <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                                        <button
                                            onClick={() => {
                                                setEditingEntry(entry);
                                                const editFormData = {
                                                    name: entry.name,
                                                    ticker_symbol: entry.ticker_symbol || '',
                                                    percentage: entry.percentage?.toString() || '',
                                                    value_ils: entry.value_ils?.toString() || '',
                                                    base_price: entry.base_price != null && entry.base_price !== '' ? String(entry.base_price) : '',
                                                    entry_date: entry.entry_date.split('T')[0],
                                                    currency: entry.currency || 'USD',
                                                    units: entry.units != null && entry.units !== '' ? String(entry.units) : ''
                                                };
                                                setFormData(editFormData);
                                                setInitialFormData({ ...editFormData }); // Track initial state for edits too
                                                setShowForm(true);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                border: '2px solid #000',
                                                background: THEME.primary,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            style={{
                                                padding: '6px',
                                                border: '2px solid #000',
                                                background: THEME.accent,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        );
                    })
                )}
            </div>

            {/* Add Entry Button */}
            <button
                onClick={() => {
                    setEditingEntry(null);
                    
                    // Try to load draft, otherwise use empty form
                    const draft = loadDraft();
                    const emptyForm = getEmptyFormData();
                    const initialForm = draft || emptyForm;
                    
                    setFormData(initialForm);
                    setInitialFormData({ ...initialForm }); // Track initial state
                    setShowForm(true);
                }}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} color="#fff" strokeWidth={3}/>
            </button>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end',
                        touchAction: 'none',
                        overscrollBehavior: 'contain'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCloseForm();
                        }
                    }}
                    onTouchMove={(e) => {
                        // Prevent background scroll when touching overlay
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                        }
                    }}
                >
                    <div 
                        style={{
                            width: '100%',
                            maxHeight: '90vh',
                            background: '#fff',
                            borderRadius: '16px 16px 0 0',
                            padding: '20px',
                            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain',
                            touchAction: 'pan-y',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '20px',
                            flexShrink: 0,
                            position: 'sticky',
                            top: 0,
                            background: '#fff',
                            zIndex: 1,
                            paddingBottom: '8px'
                        }}>
                            <h2 style={{fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                                {editingEntry ? 'Edit Entry' : 'New Entry'}
                            </h2>
                            <button onClick={() => handleCloseForm()} style={{background: 'none', border: 'none', padding: '8px', flexShrink: 0}}>
                                <X size={28}/>
                            </button>
                        </div>

                        <div style={{
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            flex: 1,
                            minHeight: 0
                        }}>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Stock Name
                                </label>
                                <CustomAutocomplete
                                    value={formData.name}
                                    onChange={(value) => setFormData({...formData, name: value})}
                                    options={stockNames}
                                    placeholder="Stock name..."
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Ticker Symbol
                                </label>
                                <input
                                    type="text"
                                    value={formData.ticker_symbol}
                                    onChange={(e) => setFormData({...formData, ticker_symbol: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Currency
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                >
                                    <option value="USD">USD</option>
                                    <option value="ILS">ILS (Israeli Shekel)</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Quantity (units)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formData.units}
                                    onChange={(e) => setFormData({...formData, units: e.target.value})}
                                    placeholder="e.g. 1, 2.5, 100"
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Value
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.value_ils}
                                    onChange={(e) => setFormData({...formData, value_ils: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Percentage
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.percentage}
                                        onChange={(e) => setFormData({...formData, percentage: e.target.value})}
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        Base Price (optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.base_price}
                                        onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                                        placeholder="Optional"
                                        style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.entry_date}
                                    onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                                    style={{width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem'}}
                                />
                            </div>
                            <div style={{
                                display: 'flex', 
                                gap: '12px', 
                                marginTop: '8px',
                                flexShrink: 0,
                                paddingTop: '8px',
                                paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
                            }}>
                                <button
                                    onClick={() => handleCloseForm()}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEntry}
                                    disabled={loading || !formData.name || !formData.value_ils}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        border: '3px solid #000',
                                        background: THEME.primary,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        opacity: (loading || !formData.name || !formData.value_ils) ? 0.5 : 1,
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Draft Confirmation Dialog */}
            {showDraftDialog && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}
                    onClick={() => setShowDraftDialog(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '400px',
                            border: '3px solid #000',
                            boxShadow: '4px 4px 0px #000'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <AlertCircle size={28} color={THEME.accent} style={{ marginRight: '12px' }} />
                            <h2 style={{
                                margin: 0,
                                fontWeight: 800,
                                fontSize: '1.3rem',
                                color: '#000'
                            }}>
                                Unsaved Changes
                            </h2>
                        </div>
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            color: THEME.muted
                        }}>
                            You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexDirection: 'column'
                        }}>
                            <button
                                onClick={handleDismissDraft}
                                style={{
                                    padding: '14px',
                                    background: '#fff',
                                    border: '3px solid #000',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    color: '#000',
                                    touchAction: 'manipulation'
                                }}
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                style={{
                                    padding: '14px',
                                    background: THEME.secondary,
                                    border: '3px solid #000',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    color: '#000',
                                    touchAction: 'manipulation'
                                }}
                            >
                                Save as Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileStockPortfolioView;
