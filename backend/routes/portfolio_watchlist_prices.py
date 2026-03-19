from flask import Blueprint, jsonify, current_app
from config import get_db_connection, token_required, _fetch_stock_info_robust
from concurrent.futures import ThreadPoolExecutor, as_completed
from mysql.connector import Error
from datetime import datetime

portfolio_watchlist_prices_bp = Blueprint('portfolio_watchlist_prices', __name__)


@portfolio_watchlist_prices_bp.route('/api/portfolio/watchlist/prices', methods=['GET'])
@token_required
def get_watchlist_prices(payload):
    """Get live prices for all stocks in user's watchlist"""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT ticker_symbol FROM watched_stocks WHERE username = %s"
            cursor.execute(query, (username,))
            watchlist = cursor.fetchall()

            tickers = [item['ticker_symbol'] for item in watchlist]

            if not tickers:
                return jsonify({'prices': []})

            def _fetch_price(ticker):
                try:
                    info = _fetch_stock_info_robust(ticker)
                    return {
                        'ticker': ticker,
                        'name': info.get('longName', ticker),
                        'currentPrice': info.get('currentPrice'),
                        'previousClose': info.get('previousClose'),
                        'change': info.get('change'),
                        'changePercent': info.get('changePercent'),
                        'currency': info.get('currency', 'USD'),
                        'marketState': info.get('marketState', 'UNKNOWN'),
                        'exchange': info.get('exchange', ''),
                        'error': None,
                    }
                except Exception as e:
                    current_app.logger.error('portfolio_market watchlist price error for %s: %s', ticker, e)
                    error_str = str(e).lower()
                    is_rl = '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str
                    return {
                        'ticker': ticker, 'name': ticker,
                        'currentPrice': None, 'previousClose': None,
                        'change': None, 'changePercent': None,
                        'currency': None, 'marketState': None, 'exchange': None,
                        'error': 'Rate limit exceeded' if is_rl else 'Failed to fetch price',
                    }

            results_map = {}
            with ThreadPoolExecutor(max_workers=min(len(tickers), 10)) as executor:
                future_to_ticker = {executor.submit(_fetch_price, t): t for t in tickers}
                for future in as_completed(future_to_ticker):
                    r = future.result()
                    results_map[r['ticker']] = r
            results = [results_map[t] for t in tickers if t in results_map]

            return jsonify({
                'prices': results,
                'timestamp': datetime.now().isoformat()
            })

    except Error as e:
        current_app.logger.error('portfolio_market db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
