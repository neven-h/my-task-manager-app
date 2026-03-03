"""
Robust stock info fetching with multiple fallback strategies.
"""
import yfinance as yf
from yfinance.exceptions import YFRateLimitError

from finance_cache import _get_cached_stock_info, _set_cached_stock_info, _stock_cache, _cache_lock


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
