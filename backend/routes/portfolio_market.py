from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required, DEBUG,
    _fetch_stock_info_robust, _yahoo_search_tickers,
    _get_exchange_rate,
)
from decimal import Decimal
from mysql.connector import Error
from datetime import datetime
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
        return jsonify({'error': error_msg}), 400
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
            return jsonify({
                'error': 'Yahoo Finance API rate limit exceeded. Please try again in a few minutes.',
                'rateLimited': True
            }), 429
        current_app.logger.error('portfolio_market stock price error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch stock price'}), 500


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
                    'error': 'Rate limit exceeded' if is_rate_limit else error_msg,
                    'rateLimited': is_rate_limit
                })
            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str
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
                    'error': 'Rate limit exceeded' if is_rate_limit else str(e),
                    'rateLimited': is_rate_limit
                })

        return jsonify({
            'prices': results,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        current_app.logger.error('portfolio_market stock prices error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to fetch stock prices'}), 500


@portfolio_market_bp.route('/api/portfolio/search-stocks', methods=['GET'])
def search_stocks():
    """Search for stocks by ticker symbol or name using Yahoo Finance"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        if len(query) < 1:
            return jsonify({'error': 'Search query must be at least 1 character'}), 400

        # Use Yahoo Finance search API for comprehensive results
        search_results = _yahoo_search_tickers(query)

        if search_results:
            return jsonify({'results': search_results})

        # Fallback: try direct ticker lookup if search API failed
        try:
            info = _fetch_stock_info_robust(query.upper())
            if info and info.get('symbol'):
                return jsonify({
                    'results': [{
                        'ticker': info.get('symbol', query.upper()),
                        'name': info.get('longName', query.upper()),
                        'exchange': info.get('exchange', ''),
                        'currency': info.get('currency', 'USD'),
                        'quoteType': 'EQUITY',
                    }]
                })
        except Exception:
            pass

        return jsonify({
            'results': [],
            'message': 'No stocks found. Try entering a valid ticker symbol (e.g., AAPL, TSLA, MSFT)'
        })

    except Exception as e:
        current_app.logger.error('portfolio_market search error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to search stocks'}), 500


@portfolio_market_bp.route('/api/portfolio/watchlist', methods=['GET'])
@token_required
def get_watchlist(payload):
    """Get user's watchlist"""
    try:
        username = payload['username']
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            query = "SELECT * FROM watched_stocks WHERE username = %s ORDER BY added_at DESC"
            cursor.execute(query, (username,))
            watchlist = cursor.fetchall()
            
            # Serialize dates
            for item in watchlist:
                if item.get('added_at'):
                    item['added_at'] = item['added_at'].isoformat()
            
            return jsonify(watchlist)
            
    except Error as e:
        current_app.logger.error('portfolio_market db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_market_bp.route('/api/portfolio/watchlist', methods=['POST'])
@token_required
def add_to_watchlist(payload):
    """Add a stock to user's watchlist"""
    try:
        username = payload['username']
        data = request.json
        ticker_symbol = data.get('ticker_symbol', '').strip().upper()
        stock_name = data.get('stock_name', '')

        if not ticker_symbol:
            return jsonify({'error': 'Ticker symbol is required'}), 400

        # Verify stock exists - try robust fetch first, fall back to search API
        try:
            info = _fetch_stock_info_robust(ticker_symbol)
            if not stock_name:
                stock_name = info.get('longName', ticker_symbol)
        except Exception:
            # Robust fetch failed - try Yahoo search API as fallback validation
            search_results = _yahoo_search_tickers(ticker_symbol)
            found = next((r for r in search_results if r['ticker'].upper() == ticker_symbol), None)
            if found:
                if not stock_name:
                    stock_name = found.get('name', ticker_symbol)
            else:
                # Last resort: try yfinance .info directly for just symbol validation
                try:
                    raw_info = yf.Ticker(ticker_symbol).info
                    if not raw_info or (isinstance(raw_info, dict) and len(raw_info) <= 1):
                        return jsonify({'error': f'Invalid ticker symbol: {ticker_symbol}'}), 400
                    if not stock_name:
                        stock_name = raw_info.get('longName') or raw_info.get('shortName', ticker_symbol)
                except Exception as e2:
                    return jsonify({'error': f'Failed to verify stock: {str(e2)}'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if already in watchlist
            check_query = "SELECT id FROM watched_stocks WHERE username = %s AND ticker_symbol = %s"
            cursor.execute(check_query, (username, ticker_symbol))
            existing = cursor.fetchone()

            if existing:
                return jsonify({'error': 'Stock already in watchlist'}), 400

            # Add to watchlist
            insert_query = """
                INSERT INTO watched_stocks (username, ticker_symbol, stock_name)
                VALUES (%s, %s, %s)
            """
            cursor.execute(insert_query, (username, ticker_symbol, stock_name))
            connection.commit()

            return jsonify({
                'id': cursor.lastrowid,
                'message': 'Stock added to watchlist successfully'
            }, 201)

    except Error as e:
        current_app.logger.error('portfolio_market db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_market_bp.route('/api/portfolio/watchlist/<int:watchlist_id>', methods=['DELETE'])
@token_required
def remove_from_watchlist(payload, watchlist_id):
    """Remove a stock from user's watchlist"""
    try:
        username = payload['username']
        user_role = payload['role']
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify ownership
            check_query = "SELECT username FROM watched_stocks WHERE id = %s"
            cursor.execute(check_query, (watchlist_id,))
            item = cursor.fetchone()
            
            if not item:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            # Authorization check: non-admin users can only remove their own items
            if user_role != 'admin' and item['username'] != username:
                return jsonify({'error': 'Access denied'}), 403
            
            # Delete the item
            cursor.execute("DELETE FROM watched_stocks WHERE id = %s", (watchlist_id,))
            connection.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            return jsonify({'message': 'Stock removed from watchlist successfully'})
            
    except Error as e:
        current_app.logger.error('portfolio_market db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_market_bp.route('/api/portfolio/watchlist/prices', methods=['GET'])
@token_required
def get_watchlist_prices(payload):
    """Get live prices for all stocks in user's watchlist"""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get watchlist
            query = "SELECT ticker_symbol FROM watched_stocks WHERE username = %s"
            cursor.execute(query, (username,))
            watchlist = cursor.fetchall()

            tickers = [item['ticker_symbol'] for item in watchlist]

            if not tickers:
                return jsonify({'prices': []})

            # Fetch prices for all tickers using robust method
            results = []
            for ticker in tickers:
                try:
                    info = _fetch_stock_info_robust(ticker)
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
                except Exception as e:
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
                        'error': str(e)
                    })

            return jsonify({
                'prices': results,
                'timestamp': datetime.now().isoformat()
            })

    except Error as e:
        current_app.logger.error('portfolio_market db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


