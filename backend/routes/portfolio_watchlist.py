from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required,
    _fetch_stock_info_robust, _yahoo_search_tickers,
)
from mysql.connector import Error
import yfinance as yf

portfolio_watchlist_bp = Blueprint('portfolio_watchlist', __name__)

@portfolio_watchlist_bp.route('/api/portfolio/watchlist', methods=['GET'])
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


@portfolio_watchlist_bp.route('/api/portfolio/watchlist', methods=['POST'])
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
                    current_app.logger.error('portfolio_market watchlist verify error for %s: %s', ticker_symbol, e2, exc_info=True)
                    return jsonify({'error': 'Failed to verify stock ticker'}), 400

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


@portfolio_watchlist_bp.route('/api/portfolio/watchlist/<int:watchlist_id>', methods=['DELETE'])
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
