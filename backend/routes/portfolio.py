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

            # Check if units column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
            has_units = cursor.fetchone()['count'] > 0
            units_col = ", sp1.units" if has_units else ""

            if has_ticker_symbol:
                query = f"""
                    SELECT sp1.name, sp1.ticker_symbol, sp1.percentage, sp1.value_ils, sp1.base_price, sp1.entry_date, sp1.created_by{currency_col}{units_col}
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
                    SELECT sp1.name, NULL as ticker_symbol, sp1.percentage, sp1.value_ils, sp1.base_price, sp1.entry_date, sp1.created_by{currency_col}{units_col}
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

                # Safely convert units (default 1 if missing)
                units = 1.0
                if entry.get('units') is not None:
                    try:
                        units = float(entry['units'])
                        if units <= 0:
                            units = 1.0
                    except (TypeError, ValueError):
                        units = 1.0
                entry['units'] = units

                # Convert to ILS for the total (value per unit * units * exchange rate)
                currency = (entry.get('currency') or 'ILS').upper()
                rate = exchange_rates.get(currency)
                if rate is not None:
                    value_in_ils = value * units * rate
                else:
                    # No rate available - use raw value as fallback
                    value_in_ils = value * units

                entry['value_ils_converted'] = round(value_in_ils, 2)
                total_value_ils += value_in_ils
                total_value_raw += value * units
                
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


