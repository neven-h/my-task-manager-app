import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, X, TrendingUp, PieChart, Calendar, AlertCircle, CheckCircle, Save, TrendingDown, Upload, RefreshCw, DollarSign, Briefcase, Copy, Users } from 'lucide-react';
import TabBar from './components/TabBar';
import API_BASE from './config';
import { formatCurrencyWithCode } from './utils/formatCurrency';
import CustomAutocomplete from './components/CustomAutocomplete';
import WatchlistSection from './components/portfolio/WatchlistSection';
import YahooPortfolioSection from './components/portfolio/YahooPortfolioSection';

const DRAFT_STORAGE_KEY = 'portfolio_entry_draft';

const StockPortfolio = ({ onBackToTasks }) => {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [stockNames, setStockNames] = useState([]);
  const [isNewStock, setIsNewStock] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // Tab state
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [newTabName, setNewTabName] = useState('');

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

  // Live stock prices state
  const [stockPrices, setStockPrices] = useState({});
  const [priceLoading, setPriceLoading] = useState(false);

  const [summaryDisplayCurrency, setSummaryDisplayCurrency] = useState('ILS');
  const authUser = localStorage.getItem('authUser');
  const authRole = localStorage.getItem('authRole');

  // Color scheme - matching BankTransactions theme
  const colors = {
    primary: '#0000FF',      // Blue (primary actions)
    secondary: '#FFD500',    // Yellow
    accent: '#FF0000',       // Red (for errors/warnings only)
    success: '#00AA00',      // Green
    background: '#fff',      // White
    card: '#ffffff',
    text: '#000',            // Black
    textLight: '#666',
    border: '#000'           // Black
  };

  // ==================== TAB FUNCTIONS ====================

  const fetchTabs = async () => {
    try {
      const response = await fetch(`${API_BASE}/portfolio-tabs?username=${authUser}&role=${authRole}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setTabs(data);
        return data;
      }
      setTabs([]);
      return [];
    } catch (err) {
      console.error('Error fetching tabs:', err);
      setTabs([]);
      return [];
    }
  };

  const handleSwitchTab = async (tabId) => {
    setActiveTabId(tabId);
    localStorage.setItem('activePortfolioTabId', String(tabId));
    await fetchEntries(tabId);
    await fetchSummary(tabId);
    await fetchStockNames(tabId);
  };

  const handleCreateFirstTab = async () => {
    if (!newTabName.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/portfolio-tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTabName.trim(), username: authUser })
      });
      const data = await response.json();
      if (response.ok) {
        setNewTabName('');
        await fetchTabs();
        setActiveTabId(data.id);
        localStorage.setItem('activePortfolioTabId', String(data.id));
        await fetchEntries(data.id);
        await fetchSummary(data.id);
        await fetchStockNames(data.id);
      } else {
        setError(data.error || 'Failed to create tab');
      }
    } catch (err) {
      setError('Failed to create tab - server may be unavailable');
    }
  };

  // ==================== DATA FUNCTIONS ====================

  // Fetch all entries
  const fetchEntries = async (tabId) => {
    try {
      setLoading(true);
      setError(null);
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `&tab_id=${tid}` : '';
      const response = await fetch(
        `${API_BASE}/portfolio?username=${authUser}&role=${authRole}${tabParam}`
      );
      if (!response.ok) throw new Error('Failed to load portfolio entries');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err.message || 'Failed to load portfolio entries');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary
  const fetchSummary = async (tabId) => {
    try {
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `&tab_id=${tid}` : '';
      const response = await fetch(
        `${API_BASE}/portfolio/summary?username=${authUser}&role=${authRole}${tabParam}`
      );
      if (!response.ok) throw new Error('Failed to load summary');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  // Fetch stock names for autocomplete
  const fetchStockNames = async (tabId) => {
    try {
      const tid = tabId !== undefined ? tabId : activeTabId;
      const tabParam = tid ? `&tab_id=${tid}` : '';
      const response = await fetch(
        `${API_BASE}/portfolio/names?username=${authUser}&role=${authRole}${tabParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setStockNames(data);
      }
    } catch (err) {
      console.error('Failed to load stock names:', err);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const fetchedTabs = await fetchTabs();

      if (!fetchedTabs || fetchedTabs.length === 0) {
        setActiveTabId(null);
        return;
      }

      const savedTabId = localStorage.getItem('activePortfolioTabId');
      let tabIdToUse = savedTabId && savedTabId !== 'null' ? parseInt(savedTabId) : null;

      if (!tabIdToUse || !fetchedTabs.find(t => t.id === tabIdToUse)) {
        tabIdToUse = fetchedTabs[0].id;
      }

      setActiveTabId(tabIdToUse);
      localStorage.setItem('activePortfolioTabId', String(tabIdToUse));

      await fetchEntries(tabIdToUse);
      await fetchSummary(tabIdToUse);
      await fetchStockNames(tabIdToUse);
    };

    initializeData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ticker_symbol' ? value.toUpperCase() : value
    }));
  };

  const handleStockNameChange = (value) => {
    // Case-insensitive check to match CustomAutocomplete filtering behavior
    const isExistingStock = stockNames.some(
      stockName => stockName.toLowerCase() === value.toLowerCase()
    );
    setIsNewStock(!isExistingStock && value.trim() !== '');
    setFormData(prev => ({
      ...prev,
      name: value,
      base_price: isExistingStock ? prev.base_price : ''
    }));
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
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        ...formData,
        tab_id: activeTabId
      }));
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
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
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleCloseForm = (forceClose = false) => {
    if (forceClose || !isFormDirty()) {
      // Clear draft if closing without saving
      if (!editingEntry) {
        clearDraft();
      }
      setShowForm(false);
      setError(null);
      setEditingEntry(null);
      setIsNewStock(false);
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
    setSuccess('Entry saved as draft');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDismissDraft = () => {
    clearDraft();
    handleCloseForm(true);
    setShowDraftDialog(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (editingEntry) {
        const id = Number(editingEntry.id);
        if (Number.isNaN(id) || id < 1) {
          setError('Invalid entry: cannot update. Please close and try again.');
          return;
        }
      }

      const valueIls = formData.value_ils !== '' && formData.value_ils != null
        ? parseFloat(formData.value_ils)
        : (editingEntry ? editingEntry.value_ils : 0);
      const percentage = formData.percentage !== '' && formData.percentage != null
        ? parseFloat(formData.percentage)
        : 0;
      const basePrice = formData.base_price !== '' && formData.base_price != null
        ? parseFloat(formData.base_price)
        : null;
      const entryDate = (formData.entry_date && typeof formData.entry_date === 'string')
        ? formData.entry_date.split('T')[0]
        : formData.entry_date;

      const entryId = editingEntry ? Number(editingEntry.id) : null;
      const url = editingEntry
        ? `${API_BASE}/portfolio/${entryId}?username=${encodeURIComponent(authUser || '')}&role=${encodeURIComponent(authRole || '')}`
        : `${API_BASE}/portfolio`;

      const method = editingEntry ? 'PUT' : 'POST';

      // Parse units - allow decimal values, null if empty
      const unitsValue = formData.units;
      let units = null;
      if (unitsValue != null && String(unitsValue).trim() !== '') {
        const normalizedUnits = String(unitsValue).replace(/,/g, '').trim();
        const numValue = parseFloat(normalizedUnits);
        if (!isNaN(numValue) && numValue > 0 && isFinite(numValue)) {
          units = numValue;
        }
      }
      console.log('DEBUG: final units value =', units);

      const payload = {
        name: formData.name,
        ticker_symbol: formData.ticker_symbol || null,
        percentage,
        value_ils: valueIls,
        base_price: basePrice,
        entry_date: entryDate,
        username: authUser,
        tab_id: activeTabId,
        currency: formData.currency || 'USD',
        units: units
      };
      
      console.log('DEBUG: payload being sent =', JSON.stringify(payload, null, 2));

      // If it's a new stock and base_price is not set, use value_ils as base_price
      if (!editingEntry && isNewStock && payload.base_price == null && payload.value_ils) {
        payload.base_price = payload.value_ils;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }

      // Clear draft on successful save
      if (!editingEntry) {
        clearDraft();
      }

      // Close modal and clear form immediately so the window closes right away
      const wasEditing = !!editingEntry;
      handleCloseForm(true); // Force close after successful save
      setFormData({
        name: '',
        ticker_symbol: '',
        percentage: '',
        value_ils: '',
        base_price: '',
        entry_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        units: ''
      });
      setLoading(false); // Stop loading immediately so UI is responsive
      setSuccess(wasEditing ? 'Portfolio entry updated successfully' : 'Portfolio entry added successfully');

      // Refresh data in background (don't block UI)
      fetchEntries(activeTabId);
      fetchSummary(activeTabId);
      fetchStockNames(activeTabId);
      return; // Skip the finally block's setLoading since we already did it
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setError(null);
    setEditingEntry(entry);
    setIsNewStock(false);
    const entryDate = entry.entry_date && typeof entry.entry_date === 'string'
      ? entry.entry_date.split('T')[0]
      : entry.entry_date;
    const editFormData = {
      name: entry.name,
      ticker_symbol: entry.ticker_symbol || '',
      percentage: entry.percentage ?? '',
      value_ils: entry.value_ils ?? '',
      base_price: entry.base_price != null && entry.base_price !== '' ? entry.base_price : '',
      entry_date: entryDate ?? new Date().toISOString().split('T')[0],
      currency: entry.currency || 'USD',
      units: entry.units != null ? String(entry.units) : ''
    };
    setFormData(editFormData);
    setInitialFormData({ ...editFormData }); // Track initial state for edits too
    setShowForm(true);
  };

  const handleDuplicate = (entry) => {
    setError(null);
    setEditingEntry(null); // Not editing — creating a new entry
    setIsNewStock(false);
    setFormData({
      name: entry.name,
      ticker_symbol: entry.ticker_symbol || '',
      percentage: entry.percentage ?? '',
      value_ils: entry.value_ils ?? '',
      base_price: entry.base_price != null && entry.base_price !== '' ? entry.base_price : '',
      entry_date: new Date().toISOString().split('T')[0],
      currency: entry.currency || 'USD',
      units: entry.units != null ? String(entry.units) : ''
    });
    setInitialFormData(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`${API_BASE}/portfolio/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete entry');

      setSuccess('Portfolio entry deleted successfully');
      await fetchEntries(activeTabId);
      await fetchSummary(activeTabId);
      await fetchStockNames(activeTabId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STOCK PRICE FUNCTIONS ====================

  // Fetch live stock prices for all stocks with ticker symbols
  const fetchStockPrices = React.useCallback(async () => {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });

      if (response.ok) {
        const data = await response.json();
        const priceMap = {};
        data.prices.forEach(price => {
          if (price.ticker && !price.error) {
            priceMap[price.ticker] = price;
          }
        });
        setStockPrices(priceMap);
      }
    } catch (err) {
      console.error('Failed to fetch stock prices:', err);
    } finally {
      setPriceLoading(false);
    }
  }, [activeTabId, entries]);

  // Auto-refresh stock prices every 30 seconds
  useEffect(() => {
    if (!activeTabId) return;
    
    fetchStockPrices();
    const interval = setInterval(fetchStockPrices, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [activeTabId, fetchStockPrices]);


  // Watchlist and Yahoo Finance functionality extracted to separate components

  // ==================== GROWTH CALCULATION FUNCTIONS ====================

  // Calculate growth percentage from base price
  const calculateGrowth = (currentValue, basePrice) => {
    if (!basePrice || basePrice === 0) return null;
    return ((currentValue - basePrice) / basePrice) * 100;
  };

  // Calculate change from previous entry
  const calculateChange = (currentEntry, previousEntry) => {
    if (!previousEntry) return null;
    const valueChange = currentEntry.value_ils - previousEntry.value_ils;
    const percentChange = previousEntry.value_ils !== 0 
      ? (valueChange / previousEntry.value_ils) * 100 
      : 0;
    return { valueChange, percentChange };
  };

  // Get stock summary with growth tracking
  const getStockSummary = useMemo(() => {
    const stockMap = {};
    
    entries.forEach(entry => {
      if (!stockMap[entry.name]) {
      stockMap[entry.name] = {
        name: entry.name,
        tickerSymbol: entry.ticker_symbol || null,
        entries: [],
        basePrice: entry.base_price || null,
        latestEntry: null
      };
      }
      stockMap[entry.name].entries.push(entry);
    });

    // Sort entries by date and calculate growth
    Object.keys(stockMap).forEach(stockName => {
      const stock = stockMap[stockName];
      stock.entries.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
      stock.latestEntry = stock.entries[stock.entries.length - 1];
      
      // Find base price (first entry's base_price or first entry's value)
      if (!stock.basePrice && stock.entries.length > 0) {
        stock.basePrice = stock.entries[0].base_price || stock.entries[0].value_ils;
      }
    });

    return Object.values(stockMap);
  }, [entries]);

  // Group entries by stock name
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.name]) {
      acc[entry.name] = [];
    }
    acc[entry.name].push(entry);
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      fontFamily: '"Inter", "Helvetica Neue", Calibri, sans-serif',
      fontSize: '16px',
      color: colors.text
    }}>
      {/* Mobile Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .portfolio-header {
            flex-direction: column !important;
            padding: 1rem !important;
            text-align: center;
          }
          .portfolio-header h1 {
            font-size: 1.3rem !important;
          }
          .portfolio-header-buttons {
            width: 100%;
            justify-content: center !important;
          }
          .portfolio-header-buttons button {
            flex: 1;
            padding: 0.6rem 0.8rem !important;
            font-size: 0.85rem !important;
          }
          .portfolio-main {
            padding: 1rem !important;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.75rem !important;
          }
          .stats-card {
            padding: 1rem !important;
          }
          .stock-group {
            margin-bottom: 1rem !important;
          }
          .entries-table {
            overflow-x: auto;
          }
          .entries-table table {
            font-size: 0.85rem !important;
          }
          .modal-content {
            width: 95% !important;
            max-height: 90vh !important;
            margin: auto;
            padding: 1.5rem !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .portfolio-header h1 {
            font-size: 1.1rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="portfolio-header" style={{
        background: '#fff',
        color: '#000',
        padding: '1.5rem 2rem',
        borderBottom: `4px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBackToTasks}
            style={{
              background: '#fff',
              border: `3px solid ${colors.border}`,
              color: colors.text,
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              fontFamily: '"Inter", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            📈 STOCK PORTFOLIO
          </h1>
        </div>
        <div className="portfolio-header-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setEditingEntry(null);
              setIsNewStock(false);
              
              // Try to load draft, otherwise use empty form
              const draft = loadDraft();
              const emptyForm = getEmptyFormData();
              const initialForm = draft || emptyForm;
              
              setFormData(initialForm);
              setInitialFormData({ ...initialForm }); // Track initial state
              setShowForm(true);
            }}
            style={{
              background: colors.secondary,
              border: `3px solid ${colors.border}`,
              color: colors.text,
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: '"Inter", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <Plus size={20} /> Add Entry
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div style={{
          background: colors.accent,
          color: '#fff',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '1.05rem',
          borderBottom: `3px solid ${colors.border}`
        }}>
          <AlertCircle size={22} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: colors.secondary,
          color: colors.text,
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '1.05rem',
          borderBottom: `3px solid ${colors.border}`
        }}>
          <CheckCircle size={22} />
          {success}
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Portfolio Tabs Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        apiBase={API_BASE}
        tabEndpoint="portfolio-tabs"
        authUser={authUser}
        authRole={authRole}
        colors={colors}
        deleteConfirmMessage={(name) => `Delete "${name}" and all its portfolio entries?`}
        onTabsChanged={(updatedTabs) => setTabs(updatedTabs)}
        onTabCreated={async (newTabId) => {
          setActiveTabId(newTabId);
          localStorage.setItem('activePortfolioTabId', String(newTabId));
          await fetchEntries(newTabId);
          await fetchSummary(newTabId);
          await fetchStockNames(newTabId);
        }}
        onTabDeleted={async (deletedTabId, updatedTabs) => {
          if (activeTabId === deletedTabId) {
            if (updatedTabs.length > 0) {
              handleSwitchTab(updatedTabs[0].id);
            } else {
              setActiveTabId(null);
              localStorage.removeItem('activePortfolioTabId');
              setEntries([]);
              setSummary(null);
            }
          }
        }}
        onTabSwitched={(tabId) => handleSwitchTab(tabId)}
        onError={(msg) => setError(msg)}
      />

      {/* No tabs - prompt to create first tab */}
      {tabs.length === 0 && (
        <div style={{
          maxWidth: '500px',
          margin: '4rem auto',
          textAlign: 'center',
          padding: '3rem 2rem',
          border: `3px solid ${colors.border}`,
          background: colors.card
        }}>
          <Users size={48} style={{ color: colors.primary, marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem' }}>
            Create Your First Portfolio Tab
          </h2>
          <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>
            Each tab has its own separate portfolio. Create a tab to get started.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFirstTab(); }}
              placeholder="Tab name..."
              style={{
                padding: '0.7rem 1rem',
                border: `3px solid ${colors.border}`,
                fontSize: '1rem',
                fontFamily: '"Inter", sans-serif',
                width: '200px'
              }}
            />
            <button
              onClick={handleCreateFirstTab}
              disabled={!newTabName.trim()}
              style={{
                padding: '0.7rem 1.5rem',
                background: newTabName.trim() ? colors.primary : '#ccc',
                color: '#fff',
                border: `3px solid ${colors.border}`,
                cursor: newTabName.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '700',
                fontSize: '1rem',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {activeTabId && (
      <div className="portfolio-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '2rem' }}>
        {/* Summary Stats Cards */}
        {summary && (
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            <div className="stats-card" style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <TrendingUp size={40} color={colors.primary} />
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '800',
                color: colors.primary
              }}>
                {summaryDisplayCurrency === 'ILS'
                  ? formatCurrencyWithCode(summary.total_value_ils ?? 0, 'ILS')
                  : formatCurrencyWithCode(
                      summary.exchange_rates?.USD && summary.total_value_ils
                        ? summary.total_value_ils / summary.exchange_rates.USD
                        : summary.total_value ?? 0,
                      'USD'
                    )
                }
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700' }}>
                  Total value
                </span>
                <button
                  onClick={() => setSummaryDisplayCurrency(prev => prev === 'ILS' ? 'USD' : 'ILS')}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: colors.primary,
                    color: '#fff',
                    border: `2px solid ${colors.border}`,
                    cursor: 'pointer',
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase'
                  }}
                >
                  {summaryDisplayCurrency === 'ILS' ? '₪ ILS' : '$ USD'}
                </button>
              </div>
              {summary.exchange_rates && summary.exchange_rates.USD && (
                <div style={{ color: colors.textLight, fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  USD/ILS: {summary.exchange_rates.USD.toFixed(2)}
                </div>
              )}
            </div>
            <div className="stats-card" style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <PieChart size={40} color={colors.success} />
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '800',
                color: colors.success
              }}>
                {summary.count || 0}
              </div>
              <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                📊 Total Stocks
              </div>
            </div>
          </div>
        )}

      <WatchlistSection colors={colors} authUser={authUser} authRole={authRole} />

      <YahooPortfolioSection colors={colors} authUser={authUser} authRole={authRole} />

        {/* Stock Summary Table with Growth Tracking */}
        {getStockSummary.length > 0 && (
          <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
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
                Portfolio Overview
              </h2>
              <button
                onClick={fetchStockPrices}
                disabled={priceLoading}
                style={{
                  padding: '0.5rem 1rem',
                  background: priceLoading ? colors.textLight : colors.primary,
                  color: '#fff',
                  border: `2px solid ${colors.border}`,
                  cursor: priceLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: priceLoading ? 0.6 : 1
                }}
              >
                {priceLoading ? '⏳ Loading...' : '🔄 Refresh Prices'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                <thead>
                  <tr style={{ background: colors.primary }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Stock</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Live Price</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Tracked Value</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Base Price</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Growth</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>% Change</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>% of Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {getStockSummary
                    .sort((a, b) => (b.latestEntry.value_ils || 0) - (a.latestEntry.value_ils || 0))
                    .map(stock => {
                      const entryCurrency = stock.latestEntry.currency || 'USD';
                      const entryValue = stock.latestEntry.value_ils;
                      const growth = calculateGrowth(entryValue, stock.basePrice);
                      const growthValue = stock.basePrice != null ? entryValue - stock.basePrice : null;
                      const isPositive = growth !== null && growth >= 0;
                      
                      const livePrice = stock.tickerSymbol ? stockPrices[stock.tickerSymbol] : null;
                      const livePriceValue = livePrice?.currentPrice;
                      const liveChange = livePrice?.change;
                      const liveChangePercent = livePrice?.changePercent;
                      const liveCurrency = livePrice?.currency || 'ILS';
                      const isLivePositive = liveChange !== null && liveChange >= 0;
                      
                      return (
                        <tr key={stock.name} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: '700', color: colors.text }}>
                            <div>
                              <div>{stock.name}</div>
                              {stock.tickerSymbol && (
                                <div style={{ fontSize: '0.75rem', color: colors.textLight, fontWeight: '500', marginTop: '0.25rem' }}>
                                  {stock.tickerSymbol}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.95rem'
                          }}>
                            {livePriceValue !== null && livePriceValue !== undefined ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                <div style={{ color: colors.text }}>
                                  {Number(livePriceValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {liveChange !== null && liveChange !== undefined && (
                                  <div style={{
                                    fontSize: '0.8rem',
                                    color: isLivePositive ? colors.success : colors.accent,
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    {isLivePositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {isLivePositive ? '+' : ''}{liveChangePercent?.toFixed(2) || liveChange?.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            ) : stock.tickerSymbol ? (
                              priceLoading ? (
                                <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>Loading...</span>
                              ) : (
                                <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>N/A</span>
                              )
                            ) : (
                              <span style={{ color: colors.textLight, fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                          <td style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.95rem',
                            color: colors.text
                          }}>
                            {formatCurrencyWithCode(entryValue, entryCurrency)}
                          </td>
                          <td style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontSize: '0.9rem',
                            color: colors.textLight
                          }}>
                            {stock.basePrice != null ? formatCurrencyWithCode(stock.basePrice, entryCurrency) : '-'}
                          </td>
                          <td style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.95rem',
                            color: growthValue !== null ? (isPositive ? colors.success : colors.accent) : colors.textLight,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.25rem'
                          }}>
                            {growthValue !== null ? (
                              <>
                                {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {formatCurrencyWithCode(Math.abs(growthValue), entryCurrency)}
                              </>
                            ) : '-'}
                          </td>
                          <td style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'right',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            color: growth !== null ? (isPositive ? colors.success : colors.accent) : colors.textLight
                          }}>
                            {growth !== null ? (
                              <span style={{
                                padding: '0.3rem 0.6rem',
                                background: isPositive ? '#ecfdf5' : '#fff0f0',
                                color: isPositive ? colors.success : colors.accent,
                                border: `2px solid ${isPositive ? colors.success : colors.accent}`,
                                fontFamily: '"Inter", sans-serif'
                              }}>
                                {isPositive ? '+' : ''}{growth.toFixed(2)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: colors.text }}>
                            {stock.latestEntry.percentage ? (
                              <span style={{
                                padding: '0.3rem 0.6rem',
                                background: colors.secondary,
                                color: colors.text,
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                border: `2px solid ${colors.border}`,
                                fontFamily: '"Inter", sans-serif'
                              }}>
                                {stock.latestEntry.percentage}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && Object.keys(groupedEntries).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            border: `3px solid ${colors.border}`,
            background: colors.card
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: colors.text }}>
              ⏳ Loading portfolio...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && Object.keys(groupedEntries).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            border: `3px solid ${colors.border}`,
            background: colors.card,
            marginTop: '2rem'
          }}>
            <TrendingUp size={64} color={colors.textLight} style={{ marginBottom: '1rem' }} />
            <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem', color: colors.text }}>
              No Portfolio Entries Yet
            </h2>
            <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>
              Click "Add Entry" to start tracking your stock portfolio values
            </p>
          </div>
        )}

        {/* Stock Groups */}
        {Object.entries(groupedEntries).map(([stockName, stockEntries]) => (
          <div key={stockName} className="stock-group" style={{
            border: `2px solid ${colors.border}`,
            marginBottom: '1.5rem',
            background: colors.card
          }}>
            <div style={{
              background: colors.primary,
              color: '#fff',
              padding: '1rem 1.25rem',
              fontWeight: '700',
              fontSize: '1.1rem',
              borderBottom: `2px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              <TrendingUp size={20} />
              {stockName}
            </div>

            <div className="entries-table">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f8f8', borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>📅 Date</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>📦 Units</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>🏷️ Base Price</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>💰 Value</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>💵 Total Value</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>📈 Change</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', color: colors.text }}>📊 Percentage</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', fontSize: '0.9rem', color: colors.text, width: '140px' }}>Actions</th>
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
                      
                      return (
                        <tr key={entry.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: colors.text }}>
                          {new Date(entry.entry_date).toLocaleDateString('he-IL')}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.95rem',
                          color: colors.text
                        }}>
                          {(entry.units ?? 1).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.95rem',
                          color: colors.textLight,
                          fontStyle: 'italic'
                        }}>
                          {entry.base_price != null ? formatCurrencyWithCode(entry.base_price, entry.currency || 'USD') : '—'}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '0.05em',
                          fontSize: '0.95rem',
                          color: colors.text
                        }}>
                          {formatCurrencyWithCode(entry.value_ils, entry.currency || 'USD')}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.95rem',
                          color: colors.primary
                        }}>
                          {entry.units != null && entry.value_ils != null
                            ? formatCurrencyWithCode(entry.value_ils * entry.units, entry.currency || 'USD')
                            : <span style={{ color: colors.textLight }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                          {change ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                              <span style={{
                                fontWeight: '700',
                                color: change.valueChange >= 0 ? colors.success : colors.accent,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                {change.valueChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {formatCurrencyWithCode(Math.abs(change.valueChange), entry.currency || 'USD')}
                              </span>
                              <span style={{
                                fontSize: '0.8rem',
                                color: change.percentChange >= 0 ? colors.success : colors.accent,
                                fontWeight: '600'
                              }}>
                                {change.percentChange >= 0 ? '+' : ''}{change.percentChange.toFixed(2)}%
                              </span>
                            </div>
                          ) : baseGrowth !== null ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                              <span style={{
                                fontWeight: '700',
                                color: baseGrowth >= 0 ? colors.success : colors.accent,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                {baseGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {formatCurrencyWithCode(Math.abs(entry.value_ils - (stockSummary?.basePrice || 0)), entry.currency || 'USD')}
                              </span>
                              <span style={{
                                fontSize: '0.8rem',
                                color: baseGrowth >= 0 ? colors.success : colors.accent,
                                fontWeight: '600'
                              }}>
                                {baseGrowth >= 0 ? '+' : ''}{baseGrowth.toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: colors.textLight }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: colors.text }}>
                          {entry.percentage ? (
                            <span style={{
                              padding: '0.3rem 0.6rem',
                              background: colors.secondary,
                              color: colors.text,
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              border: `2px solid ${colors.border}`,
                              fontFamily: '"Inter", sans-serif'
                            }}>
                              {entry.percentage}%
                            </span>
                          ) : (
                            <span style={{ color: colors.textLight }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEdit(entry)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              background: colors.primary,
                              color: '#fff',
                              border: `2px solid ${colors.border}`,
                              cursor: 'pointer',
                              marginRight: '0.4rem',
                              fontFamily: '"Inter", sans-serif',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(entry)}
                            title="Duplicate entry"
                            style={{
                              padding: '0.4rem 0.6rem',
                              background: colors.success || '#28a745',
                              color: '#fff',
                              border: `2px solid ${colors.border}`,
                              cursor: 'pointer',
                              marginRight: '0.4rem',
                              fontFamily: '"Inter", sans-serif',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              background: colors.accent,
                              color: '#fff',
                              border: `2px solid ${colors.border}`,
                              cursor: 'pointer',
                              fontFamily: '"Inter", sans-serif',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setError(null); handleCloseForm(); }}>
          <div style={{
            background: colors.card,
            padding: '2.5rem',
            width: '100%',
            maxWidth: '550px',
            margin: '1rem',
            border: `4px solid ${colors.border}`,
            maxHeight: '90vh',
            overflow: 'auto',
            boxSizing: 'border-box',
            boxShadow: '8px 8px 0px #000',
            outline: 'none'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.6rem', color: colors.text }}>
                {editingEntry ? '✏️ Edit Entry' : '➕ Add Portfolio Entry'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setError(null); setEditingEntry(null); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.text,
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <div style={{
                background: colors.accent,
                color: '#fff',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                border: `2px solid ${colors.border}`
              }}>
                <AlertCircle size={18} />
                {error}
                <button type="button" onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '0.25rem' }}>
                  <X size={18} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <CustomAutocomplete
                  value={formData.name}
                  onChange={handleStockNameChange}
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  🏷️ Ticker Symbol (Optional)
                </label>
                <input
                  type="text"
                  name="ticker_symbol"
                  value={formData.ticker_symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., AAPL, TSLA, BTC-USD"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none',
                    textTransform: 'uppercase'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Enter Yahoo Finance ticker symbol to display live stock prices (e.g., AAPL for Apple, TSLA for Tesla)
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  💵 Base Price {isNewStock && !editingEntry ? '*' : '(Optional)'}
                </label>
                <input
                  type="number"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  required={isNewStock && !editingEntry}
                  step="0.01"
                  min="0"
                  placeholder="Enter initial purchase price"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  This is the initial purchase price for tracking growth (in {formData.currency || 'USD'})
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  💱 Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="ILS">₪ ILS (Israeli Shekel)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                </select>
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Select the currency for this stock entry
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  📦 Number of Units/Shares
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="units"
                  value={formData.units}
                  onChange={handleInputChange}
                  placeholder="e.g. 1, 2.5, 100"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Enter the number of shares/units (optional)
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  💰 Current Value *
                </label>
                <input
                  type="number"
                  name="value_ils"
                  value={formData.value_ils}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Enter the current value in {formData.currency || 'ILS'}
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  📊 Percentage of Portfolio
                </label>
                <input
                  type="number"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Optional (0-100)"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Optional: What percentage of your total portfolio does this represent?
                </small>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: colors.text }}>
                  📅 Date *
                </label>
                <input
                  type="date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: `3px solid ${colors.border}`,
                    fontSize: '1.05rem',
                    fontFamily: '"Inter", sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <small style={{ color: colors.textLight, fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  You can select any date, including past dates
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '1.25rem',
                    background: colors.success,
                    color: '#fff',
                    border: `3px solid ${colors.border}`,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '1.15rem',
                    opacity: loading ? 0.5 : 1,
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {loading ? '⏳ Saving...' : editingEntry ? '✅ Update Entry' : '✅ Add Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCloseForm()}
                  style={{
                    padding: '1.25rem 2rem',
                    background: colors.card,
                    border: `3px solid ${colors.border}`,
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: colors.text,
                    fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draft Confirmation Dialog */}
      {showDraftDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowDraftDialog(false)}>
          <div style={{
            background: colors.card,
            padding: '2.5rem',
            width: '100%',
            maxWidth: '450px',
            margin: '1rem',
            border: `4px solid ${colors.border}`,
            boxShadow: '8px 8px 0px #000',
            outline: 'none'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle size={32} color={colors.accent} style={{ marginRight: '1rem' }} />
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem', color: colors.text }}>
                Unsaved Changes
              </h2>
            </div>
            <p style={{
              margin: '0 0 2rem 0',
              fontSize: '1.05rem',
              lineHeight: '1.6',
              color: colors.textLight
            }}>
              You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleDismissDraft}
                style={{
                  padding: '1rem 2rem',
                  background: colors.card,
                  border: `3px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: colors.text,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveDraft}
                style={{
                  padding: '1rem 2rem',
                  background: colors.secondary,
                  border: `3px solid ${colors.border}`,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '1rem',
                  color: colors.text,
                  fontFamily: '"Inter", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
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

export default StockPortfolio;
