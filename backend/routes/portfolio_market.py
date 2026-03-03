from flask import Blueprint, request, jsonify, current_app
from config import (
    _fetch_stock_info_robust, _yahoo_search_tickers,
)
from datetime import datetime, timedelta
import yfinance as yf
from yfinance.exceptions import YFRateLimitError

portfolio_market_bp = Blueprint('portfolio_market', __name__)

@portfolio_market_bp.route('/api/portfolio/stock-price', methods=['GET'])
def get_stock_price():
    """Get live stock price from Yahoo Finance"""
    try:
        ticker_symbol = request.args.get('ticker')
        if not ticker_symbol:
            return jsonify({'error': 'Ticker symbol is required'}), 400

        ticker_symbol = ticker_symbol.strip().upper()
        info = _fetch_stock_info_robust(ticker_symbol)

        return jsonify({
            'ticker': ticker_symbol,
            'name': info.get('longName', ticker_symbol),
            'currentPrice': info.get('currentPrice'),
            'previousClose': info.get('previousClose'),
            'change': info.get('change'),
            'changePercent': info.get('changePercent'),
            'currency': info.get('currency', 'USD'),
            'marketState': info.get('marketState', 'UNKNOWN'),
            'exchange': info.get('exchange', ''),
            'timestamp': datetime.now().isoformat()
        })

    except YFRateLimitError:
        return jsonify({
            'error': 'Yahoo Finance API rate limit exceeded. Please try again in a few minutes.',
            'rateLimited': True
        }), 429
    except ValueError as e:
        error_msg = str(e)
        # Check if it's a rate limit error
        if 'rate limit' in error_msg.lower() or 'rate limited' in error_msg.lower():
            return jsonify({
                'error': 'Yahoo Finance API rate limit exceeded. Please try again in a few minutes.',
                'rateLimited': True
            }), 429
        current_app.logger.error('portfolio_market stock price ValueError: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch stock price'}), 400
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
            return jsonify({
                'error': 'Yahoo Finance API rate limit exceeded. Please try again in a few minutes.',
                'rateLimited': True
            }), 429
        current_app.logger.error('portfolio_market stock price error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch stock price'}), 500


@portfolio_market_bp.route('/api/portfolio/historical-price', methods=['GET'])
def get_historical_price():
    """Get the closing price of a stock on a specific date (or nearest trading day).
    Query params: ticker, date (YYYY-MM-DD)
    """
    try:
        ticker_symbol = request.args.get('ticker', '').strip().upper()
        date_str = request.args.get('date', '').strip()

        if not ticker_symbol:
            return jsonify({'error': 'Ticker symbol is required'}), 400
        if not date_str:
            return jsonify({'error': 'Date is required'}), 400

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format, expected YYYY-MM-DD'}), 400

        # Fetch a window of ±7 days around the target to handle weekends/holidays
        start = target_date - timedelta(days=7)
        end = target_date + timedelta(days=2)  # yfinance end is exclusive

        stock = yf.Ticker(ticker_symbol)
        hist = stock.history(start=start.isoformat(), end=end.isoformat())

        if hist is None or hist.empty:
            return jsonify({'error': f'No price data found for {ticker_symbol} around {date_str}'}), 404

        # Find the row closest to (and not after) the target date
        hist.index = hist.index.tz_localize(None) if hist.index.tz is not None else hist.index
        hist_before = hist[hist.index.date <= target_date]

        if hist_before.empty:
            # All rows are after the target — use the earliest available
            row = hist.iloc[0]
            actual_date = hist.index[0].date()
        else:
            row = hist_before.iloc[-1]
            actual_date = hist_before.index[-1].date()

        close_price = float(row['Close'])

        # Try to get currency from .fast_info
        currency = 'USD'
        try:
            fi = stock.fast_info
            currency = getattr(fi, 'currency', None) or 'USD'
        except Exception:
            pass

        return jsonify({
            'ticker': ticker_symbol,
            'requestedDate': date_str,
            'actualDate': actual_date.isoformat(),
            'price': round(close_price, 4),
            'currency': currency,
        })

    except YFRateLimitError:
        return jsonify({
            'error': 'Yahoo Finance rate limit exceeded. Please try again in a few minutes.',
            'rateLimited': True
        }), 429
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
            return jsonify({
                'error': 'Yahoo Finance rate limit exceeded. Please try again in a few minutes.',
                'rateLimited': True
            }), 429
        current_app.logger.error('portfolio_market historical price error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch historical price'}), 500


@portfolio_market_bp.route('/api/portfolio/stock-prices', methods=['POST'])
def get_multiple_stock_prices():
    """Get live stock prices for multiple tickers from Yahoo Finance"""
    try:
        data = request.json
        tickers = data.get('tickers', [])

        if not tickers or not isinstance(tickers, list):
            return jsonify({'error': 'Tickers array is required'}), 400

        if len(tickers) > 50:
            return jsonify({'error': 'Maximum 50 tickers allowed per request'}), 400

        results = []
        for ticker in tickers:
            try:
                info = _fetch_stock_info_robust(ticker.strip().upper())
                results.append({
                    'ticker': ticker,
                    'name': info.get('longName', ticker),
                    'currentPrice': info.get('currentPrice'),
                    'previousClose': info.get('previousClose'),
                    'change': info.get('change'),
                    'changePercent': info.get('changePercent'),
                    'currency': info.get('currency', 'USD'),
                    'marketState': info.get('marketState', 'UNKNOWN'),
                    'exchange': info.get('exchange', ''),
                    'error': None
                })
            except ValueError as e:
                error_msg = str(e)
                is_rate_limit = 'rate limit' in error_msg.lower() or 'rate limited' in error_msg.lower()
                current_app.logger.error('portfolio_market batch price ValueError for %s: %s', ticker, e, exc_info=True)
                results.append({
                    'ticker': ticker,
                    'name': ticker,
                    'currentPrice': None,
                    'previousClose': None,
                    'change': None,
                    'changePercent': None,
                    'currency': None,
                    'marketState': None,
                    'exchange': None,
                    'error': 'Rate limit exceeded' if is_rate_limit else 'Failed to fetch price',
                    'rateLimited': is_rate_limit
                })
            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str
                current_app.logger.error('portfolio_market batch price error for %s: %s', ticker, e, exc_info=True)
                results.append({
                    'ticker': ticker,
                    'name': ticker,
                    'currentPrice': None,
                    'previousClose': None,
                    'change': None,
                    'changePercent': None,
                    'currency': None,
                    'marketState': None,
                    'exchange': None,
                    'error': 'Rate limit exceeded' if is_rate_limit else 'Failed to fetch price',
                    'rateLimited': is_rate_limit
                })

        return jsonify({
            'prices': results,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        current_app.logger.error('portfolio_market stock prices error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch stock prices'}), 500
