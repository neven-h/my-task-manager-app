import { useState, useEffect } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const useMobileStockPrices = (activeTabId, entries) => {
    const [stockPrices, setStockPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);

    useEffect(() => {
        if (activeTabId !== null && entries.length > 0) {
            fetchStockPrices();
            const interval = setInterval(fetchStockPrices, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTabId, entries]);

    const fetchStockPrices = async () => {
        if (!activeTabId || entries.length === 0) return;
        try {
            setPriceLoading(true);
            const tickers = [...new Set(
                entries
                    .map(entry => entry.ticker_symbol)
                    .filter(ticker => ticker && ticker.trim() !== '')
            )];
            if (tickers.length === 0) { setPriceLoading(false); return; }

            const response = await fetch(`${API_BASE}/portfolio/stock-prices`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ tickers })
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

    return { stockPrices, priceLoading };
};

export default useMobileStockPrices;
