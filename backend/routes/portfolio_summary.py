from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, _get_exchange_rate
from mysql.connector import Error

portfolio_summary_bp = Blueprint('portfolio_summary', __name__)


@portfolio_summary_bp.route('/api/portfolio/summary', methods=['GET'])
@token_required
def get_portfolio_summary(payload):
    """Get portfolio summary with total value and latest entries"""
    try:
        username = payload['username']
        user_role = payload['role']
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
        current_app.logger.error('portfolio db error in summary: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
    except Exception as e:
        current_app.logger.error('portfolio unexpected error in summary: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to load summary'}), 500
