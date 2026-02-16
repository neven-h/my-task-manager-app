"""
Yahoo Finance helpers: stock info, exchange rates, ticker search.
All results are cached in memory to reduce API calls and handle rate limiting.
"""
import time
import json
import threading
import urllib.request
import urllib.parse

import yfinance as yf
from yfinance.exceptions import YFRateLimitError


# ==================== STOCK INFO CACHE ====================

_stock_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cached_stock_info(ticker_symbol):
    """Return cached stock info if still fresh, otherwise None."""
    with _cache_lock:
        cached = _stock_cache.get(ticker_symbol)
        if cached and (time.time() - cached['timestamp']) < CACHE_TTL_SECONDS:
            return cached['data']
    return None


def _set_cached_stock_info(ticker_symbol, data):
    """Store stock info in the in-memory cache."""
    with _cache_lock:
        _stock_cache[ticker_symbol] = {'data': data, 'timestamp': time.time()}


# ==================== EXCHANGE RATE CACHE ====================

_exchange_rate_cache = {}
EXCHANGE_RATE_CACHE_TTL = 600  # 10 minutes
_exchange_rate_fetching = set()


def _fetch_exchange_rate_background(from_currency, to_currency):
    """Background thread: fetch and cache an exchange rate. Never blocks requests."""
    cache_key = f"{from_currency}{to_currency}"
    ticker = f"{from_currency}{to_currency}=X"

    try:
        try:
            fi = yf.Ticker(ticker).fast_info
            rate = getattr(fi, 'last_price', None) or getattr(fi, 'previous_close', None)
            if rate and float(rate) > 0:
                with _cache_lock:
                    _exchange_rate_cache[cache_key] = {'rate': float(rate), 'timestamp': time.time()}
                print(f"Exchange rate cached: {cache_key} = {float(rate)}")
                return
        except YFRateLimitError as e:
            print(f"Exchange rate fast_info rate limited for {ticker}: {e}")
        except Exception as e:
            print(f"Exchange rate fast_info failed for {ticker}: {e}")

        try:
            hist = yf.Ticker(ticker).history(period='5d')
            if hist is not None and not hist.empty:
                rate = float(hist.iloc[-1]['Close'])
                if rate > 0:
                    with _cache_lock:
                        _exchange_rate_cache[cache_key] = {'rate': rate, 'timestamp': time.time()}
                    print(f"Exchange rate cached (history): {cache_key} = {rate}")
                    return
        except YFRateLimitError as e:
            print(f"Exchange rate history rate limited for {ticker}: {e}")
        except Exception as e:
            print(f"Exchange rate history failed for {ticker}: {e}")
    finally:
        with _cache_lock:
            _exchange_rate_fetching.discard(cache_key)


def _get_exchange_rate(from_currency, to_currency='ILS'):
    """
    Return exchange rate. Returns cached value instantly if available.
    First call fetches synchronously; subsequent stale cache triggers a background refresh.
    """
    if from_currency == to_currency:
        return 1.0

    cache_key = f"{from_currency}{to_currency}"

    with _cache_lock:
        cached = _exchange_rate_cache.get(cache_key)
        if cached:
            is_fresh = (time.time() - cached['timestamp']) < EXCHANGE_RATE_CACHE_TTL
            if not is_fresh and cache_key not in _exchange_rate_fetching:
                _exchange_rate_fetching.add(cache_key)
                t = threading.Thread(
                    target=_fetch_exchange_rate_background,
                    args=(from_currency, to_currency),
                    daemon=True
                )
                t.start()
            return cached['rate']

    # No cache at all — fetch synchronously
    _fetch_exchange_rate_background(from_currency, to_currency)
    with _cache_lock:
        cached = _exchange_rate_cache.get(cache_key)
        if cached:
            return cached['rate']

    return None  # Only if fetch truly failed


# ==================== STOCK INFO FETCH ====================

def _fetch_stock_info_robust(ticker_symbol):
    """
    Fetch stock info with multiple fallback strategies.
    Returns a dict with price data or raises an exception.
    Falls back to stale cache when rate-limited.
    """
    cached = _get_cached_stock_info(ticker_symbol)
    if cached:
        return cached

    stock = yf.Ticker(ticker_symbol)
    info = {}
    rate_limited = False

    # Strategy 1: .info
    try:
        raw_info = stock.info
        if raw_info and isinstance(raw_info, dict) and len(raw_info) > 1:
            info = raw_info
    except YFRateLimitError as e:
        rate_limited = True
        print(f"Rate limited by Yahoo Finance for {ticker_symbol}: {e}")
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance for {ticker_symbol}: {e}")
        elif 'expecting value' in error_str or 'json' in error_str:
            rate_limited = True
            print(f"Yahoo Finance API error (likely rate limit) for {ticker_symbol}: {e}")

    def _extract_price(d):
        for key in ('currentPrice', 'regularMarketPrice', 'previousClose',
                    'regularMarketOpen', 'navPrice', 'ask', 'bid',
                    'regularMarketPreviousClose', 'open', 'dayHigh', 'dayLow'):
            val = d.get(key)
            if val is not None and val != 0:
                return val
        return None

    # Strategy 2: fast_info
    if _extract_price(info) is None:
        try:
            fi = stock.fast_info
            if fi:
                last_price = getattr(fi, 'last_price', None)
                prev_close = getattr(fi, 'previous_close', None)
                market_price = getattr(fi, 'regular_market_price', None) or getattr(fi, 'regularMarketPrice', None)
                price = last_price or market_price or prev_close
                if price:
                    info['currentPrice'] = price
                    info['previousClose'] = prev_close or info.get('previousClose')
                    info['regularMarketPrice'] = price
                info['currency'] = getattr(fi, 'currency', None) or info.get('currency', 'USD')
                info['exchange'] = getattr(fi, 'exchange', None) or info.get('exchange', '')
                info['marketState'] = info.get('marketState', 'UNKNOWN')
                if not info.get('symbol'):
                    info['symbol'] = ticker_symbol
        except YFRateLimitError as e:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance (fast_info) for {ticker_symbol}: {e}")
        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
                rate_limited = True
                print(f"Rate limited by Yahoo Finance (fast_info) for {ticker_symbol}: {e}")

    # Strategy 3: history
    if _extract_price(info) is None:
        try:
            hist = stock.history(period='5d')
            if hist is not None and not hist.empty:
                last_row = hist.iloc[-1]
                info['currentPrice'] = float(last_row['Close'])
                info['previousClose'] = float(hist.iloc[-2]['Close']) if len(hist) > 1 else None
                if not info.get('symbol'):
                    info['symbol'] = ticker_symbol
                info['marketState'] = info.get('marketState', 'CLOSED')
                info['currency'] = info.get('currency', 'USD')
                info['exchange'] = info.get('exchange', '')
        except YFRateLimitError as e:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance (history) for {ticker_symbol}: {e}")
        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
                rate_limited = True
                print(f"Rate limited by Yahoo Finance (history) for {ticker_symbol}: {e}")

    current_price = _extract_price(info)

    # Rate limited with no fresh data: return stale cache
    if rate_limited and (not info or current_price is None):
        with _cache_lock:
            stale_cached = _stock_cache.get(ticker_symbol)
            if stale_cached:
                print(f"Rate limited - returning stale cached data for {ticker_symbol}")
                return stale_cached['data']

    if not info or current_price is None:
        raise ValueError(f'Unable to fetch data for ticker: {ticker_symbol} (Rate limited: {rate_limited})')

    if not info.get('currentPrice'):
        info['currentPrice'] = current_price

    previous_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
    change = info.get('regularMarketChange')
    if change is None and current_price and previous_close:
        change = current_price - previous_close
    change_percent = info.get('regularMarketChangePercent')
    if change_percent is None and change is not None and previous_close and previous_close != 0:
        change_percent = (change / previous_close) * 100

    result = {
        'symbol': info.get('symbol', ticker_symbol),
        'longName': info.get('longName') or info.get('shortName', ticker_symbol),
        'shortName': info.get('shortName', ticker_symbol),
        'currentPrice': current_price,
        'previousClose': previous_close,
        'change': change,
        'changePercent': change_percent,
        'currency': info.get('currency', 'USD'),
        'marketState': info.get('marketState', 'UNKNOWN'),
        'exchange': info.get('exchange', ''),
    }

    _set_cached_stock_info(ticker_symbol, result)
    return result


# ==================== TICKER SEARCH ====================

def _yahoo_search_tickers(query):
    """
    Search for tickers using Yahoo Finance's autocomplete API.
    Returns a list of matching results. Handles rate limiting gracefully.
    """
    results = []
    try:
        url = (
            f"https://query2.finance.yahoo.com/v1/finance/search"
            f"?q={urllib.parse.quote(query)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false"
        )
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 429:
                print(f"Yahoo Finance search API rate limited for query: {query}")
                return results
            data = json.loads(resp.read().decode())
            for q in data.get('quotes', []):
                if q.get('quoteType') in ('EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY'):
                    results.append({
                        'ticker': q.get('symbol', ''),
                        'name': q.get('longname') or q.get('shortname', q.get('symbol', '')),
                        'exchange': q.get('exchange', ''),
                        'currency': q.get('currency', 'USD'),
                        'quoteType': q.get('quoteType', ''),
                    })
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"Yahoo Finance search API rate limited (HTTP 429) for query: {query}")
        else:
            print(f"Yahoo search API HTTP error: {e}")
    except json.JSONDecodeError as e:
        print(f"Yahoo search API JSON decode error (likely rate limit) for query: {query}: {e}")
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str:
            print(f"Yahoo Finance search API rate limited for query: {query}")
        else:
            print(f"Yahoo search API error: {e}")
    return results
