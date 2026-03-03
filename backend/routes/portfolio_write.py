from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

portfolio_write_bp = Blueprint('portfolio_write', __name__)


@portfolio_write_bp.route('/api/portfolio', methods=['POST'])
@token_required
def create_portfolio_entry(payload):
    """Create a new portfolio entry"""
    try:
        username = payload['username']
        data = request.json
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
        current_app.logger.error('portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_write_bp.route('/api/portfolio/<int:entry_id>', methods=['PUT'])
@token_required
def update_portfolio_entry(payload, entry_id):
    """Update an existing portfolio entry"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: non-admin users can only modify their own entries
            if user_role != 'admin' and entry['created_by'] != username:
                return jsonify({'error': 'Access denied'}), 403

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
        current_app.logger.error('portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
