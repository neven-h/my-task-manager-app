from flask import Blueprint, request, jsonify
from config import (
    get_db_connection, handle_error, token_required, DEBUG,
    _fetch_stock_info_robust, _yahoo_search_tickers,
    _get_exchange_rate,
)
from decimal import Decimal
from mysql.connector import Error
from datetime import datetime, date
import yfinance as yf
from yfinance.exceptions import YFRateLimitError
import chardet
import csv
import io
import json

portfolio_bp = Blueprint('portfolio', __name__)

# ==========================================
# STOCK PORTFOLIO ENDPOINTS
# ==========================================

@portfolio_bp.route('/api/portfolio', methods=['GET'])
def get_portfolio_entries():
    """Get all portfolio entries with optional filtering"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        name = request.args.get('name')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if ticker_symbol column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
            has_ticker_symbol = cursor.fetchone()['count'] > 0
            
            if has_ticker_symbol:
                query = "SELECT * FROM stock_portfolio WHERE 1=1"
            else:
                # Check if units column exists
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
                has_units = cursor.fetchone()['count'] > 0
                units_col = ", units" if has_units else ""
                query = f"SELECT id, name, NULL as ticker_symbol, percentage, value_ils, base_price, entry_date, tab_id, created_by, created_at, updated_at, currency{units_col} FROM stock_portfolio WHERE 1=1"
            params = []

            # Tab filtering
            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            # Role-based filtering
            if user_role == 'limited':
                query += " AND created_by = %s"
                params.append(username)

            # Date range filtering
            if start_date:
                query += " AND entry_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND entry_date <= %s"
                params.append(end_date)

            # Filter by stock name
            if name:
                query += " AND name LIKE %s"
                params.append(f"%{name}%")

            query += " ORDER BY entry_date DESC, id DESC"

            cursor.execute(query, params)
            entries = cursor.fetchall()

            # Serialize dates and decimals
            for entry in entries:
                if entry.get('entry_date'):
                    entry['entry_date'] = entry['entry_date'].isoformat()
                if entry.get('created_at'):
                    entry['created_at'] = entry['created_at'].isoformat()
                if entry.get('updated_at'):
                    entry['updated_at'] = entry['updated_at'].isoformat()
                if entry.get('percentage') is not None:
                    entry['percentage'] = float(entry['percentage'])
                if entry.get('value_ils') is not None:
                    entry['value_ils'] = float(entry['value_ils'])
                if entry.get('base_price') is not None:
                    entry['base_price'] = float(entry['base_price'])
                if entry.get('units') is not None:
                    entry['units'] = float(entry['units'])

            return jsonify(entries)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio', methods=['POST'])
def create_portfolio_entry():
    """Create a new portfolio entry"""
    try:
        data = request.json
        username = data.get('username')
        tab_id = data.get('tab_id')
        stock_name = data.get('name')
        base_price = data.get('base_price')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if this is the first entry for this stock in this tab
            # If so, base_price should be set
            if base_price is None:
                check_query = """
                    SELECT COUNT(*) as count FROM stock_portfolio 
                    WHERE name = %s AND tab_id = %s
                """
                cursor.execute(check_query, (stock_name, tab_id))
                result = cursor.fetchone()
                is_first_entry = result['count'] == 0
            else:
                is_first_entry = False

            # Check which columns exist before building INSERT query
            cursor.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio'")
            existing_columns = {row['COLUMN_NAME'] for row in cursor.fetchall()}
            
            # Build INSERT query dynamically based on available columns
            columns = ['name', 'percentage', 'value_ils', 'base_price', 'entry_date', 'tab_id', 'created_by']
            values_list = [
                stock_name,
                data.get('percentage'),
                data.get('value_ils'),
                base_price if base_price else (data.get('value_ils') if is_first_entry else None),
                data.get('entry_date'),
                tab_id,
                username
            ]
            
            if 'ticker_symbol' in existing_columns:
                columns.append('ticker_symbol')
                values_list.append(data.get('ticker_symbol'))
            
            if 'currency' in existing_columns:
                columns.append('currency')
                values_list.append(data.get('currency', 'USD'))
            
            if 'units' in existing_columns:
                columns.append('units')
                units_val = data.get('units')
                parsed_units = None
                if units_val is not None and units_val != '':
                    try:
                        normalized_units = str(units_val).replace(',', '').strip()
                        parsed = float(normalized_units)
                        if parsed > 0:
                            parsed_units = parsed
                    except (TypeError, ValueError):
                        pass
                values_list.append(parsed_units)
                print(f"DEBUG: CREATE - units_val={units_val}, parsed_units={parsed_units}")
            
            query = f"""
                INSERT INTO stock_portfolio
                ({', '.join(columns)})
                VALUES ({', '.join(['%s'] * len(columns))})
            """
            
            values = tuple(values_list)

            cursor.execute(query, values)
            connection.commit()

            entry_id = cursor.lastrowid
            return jsonify({
                'id': entry_id,
                'message': 'Portfolio entry created successfully'
            }, 201)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/<int:entry_id>', methods=['PUT'])
def update_portfolio_entry(entry_id):
    """Update an existing portfolio entry"""
    try:
        data = request.json
        username = request.args.get('username') or data.get('username')
        user_role = request.args.get('role') or data.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: limited users can only modify their own entries
            if user_role == 'limited' and entry['created_by'] != username:
                return jsonify({'error': 'Unauthorized: You can only modify your own portfolio entries'}), 403

            # Check which columns exist before building UPDATE query
            cursor.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio'")
            existing_columns = {row['COLUMN_NAME'] for row in cursor.fetchall()}
            
            # Build UPDATE query dynamically based on available columns
            base_price_val = data.get('base_price')
            if base_price_val == '' or (isinstance(base_price_val, str) and base_price_val.strip() == ''):
                base_price_val = None
            elif base_price_val is not None and base_price_val != '':
                try:
                    base_price_val = float(base_price_val)
                except (TypeError, ValueError):
                    base_price_val = None
            entry_date_val = data.get('entry_date')
            if isinstance(entry_date_val, str) and 'T' in entry_date_val:
                entry_date_val = entry_date_val.split('T')[0] if entry_date_val else None
            def _to_float(v, default=0):
                if v is None or v == '': return default
                try: return float(v)
                except (TypeError, ValueError): return default
            set_clauses = ['name = %s', 'percentage = %s', 'value_ils = %s', 'base_price = %s', 'entry_date = %s']
            values_list = [
                data.get('name'),
                _to_float(data.get('percentage')),
                _to_float(data.get('value_ils')),
                base_price_val,
                entry_date_val
            ]
            
            if 'ticker_symbol' in existing_columns:
                set_clauses.append('ticker_symbol = %s')
                values_list.append(data.get('ticker_symbol'))
            
            if 'currency' in existing_columns:
                set_clauses.append('currency = %s')
                values_list.append(data.get('currency', 'USD'))
            
            if 'units' in existing_columns:
                units_val = data.get('units')
                parsed_units = None
                if units_val is not None and units_val != '':
                    try:
                        normalized_units = str(units_val).replace(',', '').strip()
                        parsed = float(normalized_units)
                        if parsed > 0:
                            parsed_units = parsed
                    except (TypeError, ValueError):
                        pass
                set_clauses.append('units = %s')
                values_list.append(parsed_units)
                print(f"DEBUG: UPDATE - units_val={units_val}, parsed_units={parsed_units}")
            
            values_list.append(entry_id)  # For WHERE clause
            
            update_query = f"""
                UPDATE stock_portfolio
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """
            
            values = tuple(values_list)
            
            cursor.execute(update_query, values)
            connection.commit()

            # Entry was already found by SELECT; 0 rowcount can occur if values unchanged
            return jsonify({'message': 'Portfolio entry updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/<int:entry_id>', methods=['DELETE'])
def delete_portfolio_entry(entry_id):
    """Delete a portfolio entry"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: limited users can only delete their own entries
            if user_role == 'limited' and entry['created_by'] != username:
                return jsonify({'error': 'Unauthorized: You can only delete your own portfolio entries'}), 403

            # Delete the entry
            cursor.execute("DELETE FROM stock_portfolio WHERE id = %s", (entry_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            return jsonify({'message': 'Portfolio entry deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/names', methods=['GET'])
def get_portfolio_stock_names():
    """Get all unique stock names for autocomplete"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT DISTINCT name FROM stock_portfolio WHERE 1=1"
            params = []

            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            if user_role == 'limited':
                query += " AND created_by = %s"
                params.append(username)

            query += " ORDER BY name ASC"

            cursor.execute(query, params)
            stocks = cursor.fetchall()

            return jsonify([stock['name'] for stock in stocks])

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/summary', methods=['GET'])
def get_portfolio_summary():
    """Get portfolio summary with total value and latest entries"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get latest entry for each stock
            # Build query parameters - need separate params for subquery and outer query
            subquery_params = []
            outer_params = []
            subquery_where = "1=1"

            # Build subquery WHERE clause and params
            if tab_id:
                subquery_where += " AND tab_id = %s"
                subquery_params.append(tab_id)

            if user_role == 'limited':
                subquery_where += " AND created_by = %s"
                subquery_params.append(username)

            # Build outer query WHERE clause and params (same filters)
            outer_where = ""
            if tab_id:
                outer_where += " AND sp1.tab_id = %s"
                outer_params.append(tab_id)

            if user_role == 'limited':
                outer_where += " AND sp1.created_by = %s"
                outer_params.append(username)

            # Check if ticker_symbol column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
            has_ticker_symbol = cursor.fetchone()['count'] > 0
            
            # Combine all params: subquery params first, then outer query params
            all_params = subquery_params + outer_params
            
            # Check if currency column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'currency'")
            has_currency = cursor.fetchone()['count'] > 0
            currency_col = ", sp1.currency" if has_currency else ""

            if has_ticker_symbol:
                query = f"""
                    SELECT sp1.name, sp1.ticker_symbol, sp1.percentage, sp1.value_ils, sp1.base_price, sp1.entry_date, sp1.created_by{currency_col}
                    FROM stock_portfolio sp1
                    INNER JOIN (
                        SELECT name, tab_id, MAX(entry_date) as max_date
                        FROM stock_portfolio
                        WHERE {subquery_where}
                        GROUP BY name, tab_id
                    ) latest ON sp1.name = latest.name 
                        AND sp1.tab_id = latest.tab_id 
                        AND sp1.entry_date = latest.max_date
                    WHERE 1=1 {outer_where}
                    ORDER BY sp1.value_ils DESC
                """
            else:
                query = f"""
                    SELECT sp1.name, NULL as ticker_symbol, sp1.percentage, sp1.value_ils, sp1.base_price, sp1.entry_date, sp1.created_by{currency_col}
                    FROM stock_portfolio sp1
                    INNER JOIN (
                        SELECT name, tab_id, MAX(entry_date) as max_date
                        FROM stock_portfolio
                        WHERE {subquery_where}
                        GROUP BY name, tab_id
                    ) latest ON sp1.name = latest.name 
                        AND sp1.tab_id = latest.tab_id 
                        AND sp1.entry_date = latest.max_date
                    WHERE 1=1 {outer_where}
                    ORDER BY sp1.value_ils DESC
                """

            cursor.execute(query, all_params)
            latest_entries = cursor.fetchall()

            # Fetch exchange rates for non-ILS currencies
            # Collect unique currencies that need conversion
            currencies_needed = set()
            for entry in latest_entries:
                currency = entry.get('currency', 'ILS')
                if currency and currency.upper() != 'ILS':
                    currencies_needed.add(currency.upper())

            # Fetch exchange rates (cached, only fetches once per currency)
            exchange_rates = {'ILS': 1.0}
            for curr in currencies_needed:
                rate = _get_exchange_rate(curr, 'ILS')
                if rate is not None:
                    exchange_rates[curr] = rate
                else:
                    print(f"Warning: Could not fetch exchange rate for {curr}/ILS")

            # Serialize and calculate total value in ILS
            total_value_ils = 0.0
            total_value_raw = 0.0
            for entry in latest_entries:
                if entry.get('entry_date'):
                    entry['entry_date'] = entry['entry_date'].isoformat()
                
                # Safely convert percentage
                if entry.get('percentage') is not None:
                    try:
                        entry['percentage'] = float(entry['percentage'])
                    except (TypeError, ValueError):
                        entry['percentage'] = 0.0
                else:
                    entry['percentage'] = 0.0
                
                # Safely convert value_ils
                if entry.get('value_ils') is not None:
                    try:
                        value = float(entry['value_ils'])
                        entry['value_ils'] = value
                    except (TypeError, ValueError):
                        value = 0.0
                        entry['value_ils'] = 0.0
                else:
                    value = 0.0
                    entry['value_ils'] = 0.0

                # Convert to ILS for the total
                currency = (entry.get('currency') or 'ILS').upper()
                rate = exchange_rates.get(currency)
                if rate is not None:
                    value_in_ils = value * rate
                else:
                    # No rate available - use raw value as fallback
                    value_in_ils = value

                entry['value_ils_converted'] = round(value_in_ils, 2)
                total_value_ils += value_in_ils
                total_value_raw += value
                
                # Safely convert base_price
                if entry.get('base_price') is not None:
                    try:
                        entry['base_price'] = float(entry['base_price'])
                    except (TypeError, ValueError):
                        entry['base_price'] = None
                else:
                    entry['base_price'] = None

            return jsonify({
                'total_value': total_value_raw,
                'total_value_ils': round(total_value_ils, 2),
                'exchange_rates': exchange_rates,
                'entries': latest_entries,
                'count': len(latest_entries)
            })

    except Error as e:
        print(f"Database error in get_portfolio_summary: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"Unexpected error in get_portfolio_summary: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to load summary: {str(e)}'}), 500


@portfolio_bp.route('/api/portfolio/stock-price', methods=['GET'])
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
        return jsonify({'error': f'Failed to fetch stock price: {str(e)}'}), 500


@portfolio_bp.route('/api/portfolio/stock-prices', methods=['POST'])
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
        return jsonify({'error': f'Failed to fetch stock prices: {str(e)}'}), 500


@portfolio_bp.route('/api/portfolio/search-stocks', methods=['GET'])
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
        return jsonify({'error': f'Failed to search stocks: {str(e)}'}), 500


@portfolio_bp.route('/api/portfolio/watchlist', methods=['GET'])
def get_watchlist():
    """Get user's watchlist"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
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
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/watchlist', methods=['POST'])
def add_to_watchlist():
    """Add a stock to user's watchlist"""
    try:
        data = request.json
        username = data.get('username')
        ticker_symbol = data.get('ticker_symbol', '').strip().upper()
        stock_name = data.get('stock_name', '')

        if not username:
            return jsonify({'error': 'Username is required'}), 400
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
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/watchlist/<int:watchlist_id>', methods=['DELETE'])
def remove_from_watchlist(watchlist_id):
    """Remove a stock from user's watchlist"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify ownership
            check_query = "SELECT username FROM watched_stocks WHERE id = %s"
            cursor.execute(check_query, (watchlist_id,))
            item = cursor.fetchone()
            
            if not item:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            # Authorization check: limited users can only remove their own items
            if user_role == 'limited' and item['username'] != username:
                return jsonify({'error': 'Unauthorized: You can only remove your own watchlist items'}), 403
            
            # Delete the item
            cursor.execute("DELETE FROM watched_stocks WHERE id = %s", (watchlist_id,))
            connection.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            return jsonify({'message': 'Stock removed from watchlist successfully'})
            
    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/watchlist/prices', methods=['GET'])
def get_watchlist_prices():
    """Get live prices for all stocks in user's watchlist"""
    try:
        username = request.args.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

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
        return jsonify({'error': str(e)}), 500


# ==================== YAHOO FINANCE PORTFOLIO IMPORT ====================

@portfolio_bp.route('/api/portfolio/yahoo-import', methods=['POST'])
def import_yahoo_portfolio():
    """Import portfolio from Yahoo Finance CSV export.
    Accepts a CSV file with columns: Symbol, Current Price, Date, Time, Change, Open, High, Low, Volume, Trade Date
    OR the Holdings format: Symbol, Quantity, Price Paid, etc.
    Also accepts JSON body with manual ticker list.
    """
    try:
        username = request.form.get('username') or (request.json or {}).get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        imported = []
        errors = []

        # Handle CSV file upload
        if 'file' in request.files:
            file = request.files['file']
            if not file.filename:
                return jsonify({'error': 'No file selected'}), 400

            if not file.filename.lower().endswith('.csv'):
                return jsonify({'error': 'Only CSV files are supported'}), 400

            try:
                raw_data = file.read()
                detected = chardet.detect(raw_data)
                encoding = detected.get('encoding', 'utf-8')
                content = raw_data.decode(encoding)

                reader = csv.DictReader(io.StringIO(content))
                rows = list(reader)

                if not rows:
                    return jsonify({'error': 'CSV file is empty'}), 400

                headers_lower = [h.lower().strip() for h in (rows[0].keys() if rows else [])]

                for row in rows:
                    # Normalize keys to lowercase
                    row_lower = {k.lower().strip(): v.strip() if v else '' for k, v in row.items()}

                    ticker = row_lower.get('symbol', '').upper().strip()
                    if not ticker or ticker in ('', 'SYMBOL', '-'):
                        continue

                    quantity = 0
                    for qty_key in ['quantity', 'shares', 'qty', 'units', 'amount']:
                        if qty_key in row_lower and row_lower[qty_key]:
                            try:
                                quantity = float(row_lower[qty_key].replace(',', ''))
                                break
                            except ValueError:
                                pass

                    cost_basis = 0
                    for cost_key in ['price paid', 'cost basis', 'avg cost', 'purchase price', 'cost', 'price']:
                        if cost_key in row_lower and row_lower[cost_key]:
                            try:
                                cost_basis = float(row_lower[cost_key].replace(',', '').replace('$', ''))
                                break
                            except ValueError:
                                pass

                    currency = row_lower.get('currency', 'USD').upper() or 'USD'

                    # Validate ticker
                    stock_name = ticker
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                        if not currency or currency == 'USD':
                            currency = info.get('currency', 'USD')
                    except Exception:
                        pass

                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': quantity,
                        'cost_basis': cost_basis,
                        'currency': currency,
                    })

            except Exception as e:
                return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

        # Handle JSON body with manual ticker list
        elif request.is_json:
            data = request.json
            tickers = data.get('tickers', [])
            holdings = data.get('holdings', [])

            if holdings:
                for h in holdings:
                    ticker = h.get('ticker', '').strip().upper()
                    if not ticker:
                        continue
                    stock_name = h.get('name', ticker)
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                    except Exception:
                        pass
                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': float(h.get('quantity', 0)),
                        'cost_basis': float(h.get('cost_basis', 0)),
                        'currency': h.get('currency', 'USD'),
                    })
            elif tickers:
                for ticker in tickers:
                    ticker = ticker.strip().upper()
                    if not ticker:
                        continue
                    stock_name = ticker
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                    except Exception:
                        pass
                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': 0,
                        'cost_basis': 0,
                        'currency': 'USD',
                    })
        else:
            return jsonify({'error': 'CSV file or JSON data is required'}), 400

        if not imported:
            return jsonify({'error': 'No valid stocks found in the import data'}), 400

        # Save to database
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS yahoo_portfolio
                (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    ticker_symbol VARCHAR(20) NOT NULL,
                    stock_name VARCHAR(255),
                    quantity DECIMAL(14,4) DEFAULT 0,
                    avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'USD',
                    notes TEXT,
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                    INDEX idx_username (username)
                )
            """)

            saved_count = 0
            for item in imported:
                try:
                    cursor.execute("""
                        INSERT INTO yahoo_portfolio (username, ticker_symbol, stock_name, quantity, avg_cost_basis, currency)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            stock_name = VALUES(stock_name),
                            quantity = VALUES(quantity),
                            avg_cost_basis = VALUES(avg_cost_basis),
                            currency = VALUES(currency),
                            updated_at = CURRENT_TIMESTAMP
                    """, (username, item['ticker'], item['name'], item['quantity'], item['cost_basis'], item['currency']))
                    saved_count += 1
                except Exception as e:
                    errors.append(f"{item['ticker']}: {str(e)}")

            connection.commit()

        return jsonify({
            'message': f'Successfully imported {saved_count} holdings',
            'imported': imported,
            'errors': errors,
            'count': saved_count
        }, 201)

    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


@portfolio_bp.route('/api/portfolio/yahoo-holdings', methods=['GET'])
def get_yahoo_holdings():
    """Get user's imported Yahoo Finance portfolio holdings with live prices."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS yahoo_portfolio
                (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    ticker_symbol VARCHAR(20) NOT NULL,
                    stock_name VARCHAR(255),
                    quantity DECIMAL(14,4) DEFAULT 0,
                    avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'USD',
                    notes TEXT,
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                    INDEX idx_username (username)
                )
            """)

            cursor.execute("SELECT * FROM yahoo_portfolio WHERE username = %s ORDER BY ticker_symbol ASC", (username,))
            holdings = cursor.fetchall()

            # Serialize decimals and dates
            for h in holdings:
                for k in ('quantity', 'avg_cost_basis'):
                    if h.get(k) is not None:
                        h[k] = float(h[k])
                for k in ('imported_at', 'updated_at'):
                    if h.get(k):
                        h[k] = h[k].isoformat()

            # Fetch live prices for all holdings
            enriched = []
            total_portfolio_value = 0
            total_cost_basis = 0
            total_gain_loss = 0

            for h in holdings:
                ticker = h['ticker_symbol']
                entry = {
                    'id': h['id'],
                    'ticker': ticker,
                    'name': h['stock_name'],
                    'quantity': h['quantity'],
                    'avgCostBasis': h['avg_cost_basis'],
                    'currency': h['currency'],
                    'notes': h.get('notes'),
                    'importedAt': h.get('imported_at'),
                    'updatedAt': h.get('updated_at'),
                }
                try:
                    info = _fetch_stock_info_robust(ticker)
                    current_price = info.get('currentPrice', 0) or 0
                    entry['currentPrice'] = current_price
                    entry['previousClose'] = info.get('previousClose')
                    entry['change'] = info.get('change')
                    entry['changePercent'] = info.get('changePercent')
                    entry['marketState'] = info.get('marketState', 'UNKNOWN')
                    entry['exchange'] = info.get('exchange', '')

                    # Calculate position value and gain/loss
                    qty = h['quantity'] or 0
                    cost = h['avg_cost_basis'] or 0
                    position_value = current_price * qty
                    position_cost = cost * qty
                    gain_loss = position_value - position_cost if cost > 0 and qty > 0 else 0
                    gain_loss_pct = ((current_price - cost) / cost * 100) if cost > 0 else 0

                    entry['positionValue'] = round(position_value, 2)
                    entry['positionCost'] = round(position_cost, 2)
                    entry['gainLoss'] = round(gain_loss, 2)
                    entry['gainLossPct'] = round(gain_loss_pct, 2)

                    total_portfolio_value += position_value
                    total_cost_basis += position_cost
                    total_gain_loss += gain_loss
                except ValueError as e:
                    error_msg = str(e)
                    is_rate_limit = 'rate limit' in error_msg.lower() or 'rate limited' in error_msg.lower()
                    entry['currentPrice'] = None
                    entry['error'] = 'Rate limit exceeded' if is_rate_limit else error_msg
                    entry['rateLimited'] = is_rate_limit
                except Exception as e:
                    error_str = str(e).lower()
                    is_rate_limit = '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str
                    entry['currentPrice'] = None
                    entry['error'] = 'Rate limit exceeded' if is_rate_limit else str(e)
                    entry['rateLimited'] = is_rate_limit

                enriched.append(entry)

            return jsonify({
                'holdings': enriched,
                'summary': {
                    'totalValue': round(total_portfolio_value, 2),
                    'totalCost': round(total_cost_basis, 2),
                    'totalGainLoss': round(total_gain_loss, 2),
                    'totalGainLossPct': round((total_gain_loss / total_cost_basis * 100) if total_cost_basis > 0 else 0, 2),
                    'holdingsCount': len(enriched),
                },
                'timestamp': datetime.now().isoformat()
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['PUT'])
def update_yahoo_holding(holding_id):
    """Update a Yahoo Finance portfolio holding (quantity, cost basis, notes)."""
    try:
        data = request.json
        username = data.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Verify ownership
            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            existing = cursor.fetchone()
            if not existing:
                return jsonify({'error': 'Holding not found'}), 404

            updates = []
            params = []
            if 'quantity' in data:
                updates.append('quantity = %s')
                params.append(float(data['quantity']))
            if 'avg_cost_basis' in data:
                updates.append('avg_cost_basis = %s')
                params.append(float(data['avg_cost_basis']))
            if 'notes' in data:
                updates.append('notes = %s')
                params.append(data['notes'])

            if not updates:
                return jsonify({'error': 'No fields to update'}), 400

            params.append(holding_id)
            cursor.execute(f"UPDATE yahoo_portfolio SET {', '.join(updates)} WHERE id = %s", params)
            connection.commit()

            return jsonify({'message': 'Holding updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['DELETE'])
def delete_yahoo_holding(holding_id):
    """Remove a holding from Yahoo Finance portfolio."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            if not cursor.fetchone():
                return jsonify({'error': 'Holding not found'}), 404

            cursor.execute("DELETE FROM yahoo_portfolio WHERE id = %s", (holding_id,))
            connection.commit()

            return jsonify({'message': 'Holding removed successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio/yahoo-holdings/clear', methods=['DELETE'])
def clear_yahoo_holdings():
    """Clear all Yahoo Finance portfolio holdings for a user."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("DELETE FROM yahoo_portfolio WHERE username = %s", (username,))
            connection.commit()
            deleted = cursor.rowcount

            return jsonify({'message': f'Cleared {deleted} holdings', 'deleted': deleted})

    except Error as e:
        return jsonify({'error': str(e)}), 500



# ==================== PORTFOLIO TABS ENDPOINTS ====================

@portfolio_bp.route('/api/portfolio-tabs', methods=['GET'])
def get_portfolio_tabs():
    """Get all portfolio tabs for the current user"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM portfolio_tabs WHERE 1=1"
            params = []

            if user_role == 'limited':
                query += " AND owner = %s"
                params.append(username)

            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            tabs = cursor.fetchall()

            for tab in tabs:
                if tab.get('created_at'):
                    tab['created_at'] = tab['created_at'].isoformat()

            return jsonify(tabs)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio-tabs', methods=['POST'])
def create_portfolio_tab():
    """Create a new portfolio tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        owner = data.get('username')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO portfolio_tabs (name, owner) VALUES (%s, %s)",
                (name, owner)
            )
            connection.commit()

            tab_id = cursor.lastrowid
            return jsonify({
                'id': tab_id,
                'name': name,
                'owner': owner,
                'message': 'Tab created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio-tabs/<int:tab_id>', methods=['PUT'])
def update_portfolio_tab(tab_id):
    """Rename a portfolio tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        username = request.args.get('username')
        user_role = request.args.get('role')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: limited users can only modify their own tabs
            if user_role == 'limited' and tab['owner'] != username:
                return jsonify({'error': 'Unauthorized: You can only modify your own portfolio tabs'}), 403

            # Update the tab
            cursor.execute(
                "UPDATE portfolio_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@portfolio_bp.route('/api/portfolio-tabs/<int:tab_id>', methods=['DELETE'])
def delete_portfolio_tab(tab_id):
    """Delete a portfolio tab and its associated entries"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: limited users can only delete their own tabs
            if user_role == 'limited' and tab['owner'] != username:
                return jsonify({'error': 'Unauthorized: You can only delete your own portfolio tabs'}), 403

            # Delete associated portfolio entries first (CASCADE should handle this, but being explicit)
            cursor.execute(
                "DELETE FROM stock_portfolio WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_entries = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM portfolio_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_entries} portfolio entries'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


