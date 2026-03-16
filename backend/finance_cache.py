"""
In-memory caches for stock info and exchange rates.
Shared lock prevents race conditions across both caches.
"""
import time
import threading
import urllib.request
import json as _json

import yfinance as yf
from yfinance.exceptions import YFRateLimitError

# Last-resort fallback rates (updated periodically by hand if needed)
_FALLBACK_RATES = {
    'USDILS': 3.60,
    'EURILS': 3.95,
    'GBPILS': 4.55,
}


# ==================== SHARED LOCK ====================

_cache_lock = threading.Lock()


# ==================== STOCK INFO CACHE ====================

_stock_cache = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


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

        # ── Fallback: free exchangerate API ──
        try:
            url = f"https://open.er-api.com/v6/latest/{from_currency}"
            req = urllib.request.Request(url, headers={'User-Agent': 'TaskManager/1.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = _json.loads(resp.read())
                rate = data.get('rates', {}).get(to_currency)
                if rate and float(rate) > 0:
                    with _cache_lock:
                        _exchange_rate_cache[cache_key] = {'rate': float(rate), 'timestamp': time.time()}
                    print(f"Exchange rate cached (er-api): {cache_key} = {float(rate)}")
                    return
        except Exception as e:
            print(f"Exchange rate er-api fallback failed for {cache_key}: {e}")

        # ── Last resort: hardcoded fallback ──
        fallback = _FALLBACK_RATES.get(cache_key)
        if fallback:
            with _cache_lock:
                if cache_key not in _exchange_rate_cache:
                    _exchange_rate_cache[cache_key] = {'rate': fallback, 'timestamp': time.time() - EXCHANGE_RATE_CACHE_TTL + 60}
                    print(f"Exchange rate using hardcoded fallback: {cache_key} = {fallback}")
    finally:
        with _cache_lock:
            _exchange_rate_fetching.discard(cache_key)


def _get_exchange_rate(from_currency, to_currency='ILS'):
    """
    Return exchange rate. Returns cached value instantly if available.
    First call fetches synchronously; subsequent stale cache triggers background refresh.
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
