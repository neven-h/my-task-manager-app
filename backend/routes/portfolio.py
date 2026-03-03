from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error
import threading

portfolio_bp = Blueprint('portfolio', __name__)

# Cache schema information to avoid repeated information_schema queries
# Using a lock to ensure thread-safety in multi-threaded environments
_schema_cache = {}
_schema_cache_lock = threading.Lock()

def _check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table, with thread-safe caching"""
    cache_key = f'{table_name}_has_{column_name}'

    # Fast path: check cache without lock first
    if cache_key in _schema_cache:
        return _schema_cache[cache_key]

    # Slow path: acquire lock and check/populate cache
    with _schema_cache_lock:
        # Double-check pattern: another thread might have populated it
        if cache_key not in _schema_cache:
            cursor.execute(
                "SELECT COUNT(*) as count FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                (table_name, column_name)
            )
            _schema_cache[cache_key] = cursor.fetchone()['count'] > 0
        return _schema_cache[cache_key]

# ==========================================
# STOCK PORTFOLIO ENDPOINTS
# ==========================================

@portfolio_bp.route('/api/portfolio', methods=['GET'])
@token_required
def get_portfolio_entries(payload):
    """Get all portfolio entries with optional filtering"""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        name = request.args.get('name')

        # Pagination parameters - only paginate if explicitly requested
        page = request.args.get('page')
        per_page = request.args.get('per_page')
        use_pagination = page is not None or per_page is not None

        if use_pagination:
            page = int(page) if page else 1
            per_page = min(int(per_page) if per_page else 100, 500)  # Max 500 per page
            offset = (page - 1) * per_page

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if ticker_symbol column exists (cached)
            has_ticker_symbol = _check_column_exists(cursor, 'stock_portfolio', 'ticker_symbol')

            # Build WHERE clause for filtering (shared by both SELECT and COUNT queries)
            where_clause = "WHERE 1=1"
            params = []

            # Tab filtering
            if tab_id:
                where_clause += " AND tab_id = %s"
                params.append(tab_id)

            # Role-based filtering
            if user_role == 'limited':
                where_clause += " AND created_by = %s"
                params.append(username)

            # Date range filtering
            if start_date:
                where_clause += " AND entry_date >= %s"
                params.append(start_date)

            if end_date:
                where_clause += " AND entry_date <= %s"
                params.append(end_date)

            # Filter by stock name
            if name:
                where_clause += " AND name LIKE %s"
                params.append(f"%{name}%")

            # Build SELECT query based on available columns
            if has_ticker_symbol:
                query = f"SELECT * FROM stock_portfolio {where_clause}"
            else:
                # Check if units column exists (cached)
                has_units = _check_column_exists(cursor, 'stock_portfolio', 'units')
                units_col = ", units" if has_units else ""
                query = f"SELECT id, name, NULL as ticker_symbol, percentage, value_ils, base_price, entry_date, tab_id, created_by, created_at, updated_at, currency{units_col} FROM stock_portfolio {where_clause}"

            query += " ORDER BY entry_date DESC, id DESC"

            # Only add pagination if explicitly requested
            if use_pagination:
                # Build efficient COUNT query (same WHERE clause, no ORDER BY)
                count_query = f"SELECT COUNT(*) as total FROM stock_portfolio {where_clause}"

                cursor.execute(count_query, params)
                total_count = cursor.fetchone()['total']

                # Add pagination
                query += " LIMIT %s OFFSET %s"
                params.extend([per_page, offset])

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

            # Return paginated format only if pagination was requested
            if use_pagination:
                return jsonify({
                    'entries': entries,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': total_count,
                        'total_pages': (total_count + per_page - 1) // per_page
                    }
                })
            else:
                # Backward compatible: return array for clients not using pagination
                return jsonify(entries)

    except Error as e:
        current_app.logger.error('portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_bp.route('/api/portfolio/names', methods=['GET'])
@token_required
def get_portfolio_stock_names(payload):
    """Get all unique stock names for autocomplete"""
    try:
        username = payload['username']
        user_role = payload['role']
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
        current_app.logger.error('portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
