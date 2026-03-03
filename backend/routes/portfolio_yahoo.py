from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, _fetch_stock_info_robust
from mysql.connector import Error
from datetime import datetime

portfolio_yahoo_bp = Blueprint('portfolio_yahoo', __name__)

_CREATE_TABLE_SQL = """
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
"""


@portfolio_yahoo_bp.route('/api/portfolio/yahoo-holdings', methods=['GET'])
@token_required
def get_yahoo_holdings(payload):
    """Get user's imported Yahoo Finance portfolio holdings with live prices."""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(_CREATE_TABLE_SQL)
            cursor.execute("SELECT * FROM yahoo_portfolio WHERE username = %s ORDER BY ticker_symbol ASC", (username,))
            holdings = cursor.fetchall()

            for h in holdings:
                for k in ('quantity', 'avg_cost_basis'):
                    if h.get(k) is not None:
                        h[k] = float(h[k])
                for k in ('imported_at', 'updated_at'):
                    if h.get(k):
                        h[k] = h[k].isoformat()

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
                    entry['currency'] = (info.get('currency') or h.get('currency') or 'USD')

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
                except Exception as e:
                    error_str = str(e).lower()
                    is_rate_limit = '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str
                    current_app.logger.error('yahoo_portfolio price error for %s: %s', ticker, e, exc_info=True)
                    entry['currentPrice'] = None
                    entry['error'] = 'Rate limit exceeded' if is_rate_limit else 'Failed to fetch price'
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
        current_app.logger.error('yahoo_portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_yahoo_bp.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['PUT'])
@token_required
def update_yahoo_holding(payload, holding_id):
    """Update a Yahoo Finance portfolio holding (quantity, cost basis, notes)."""
    try:
        username = payload['username']
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            if not cursor.fetchone():
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
        current_app.logger.error('yahoo_portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_yahoo_bp.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['DELETE'])
@token_required
def delete_yahoo_holding(payload, holding_id):
    """Remove a holding from Yahoo Finance portfolio."""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            if not cursor.fetchone():
                return jsonify({'error': 'Holding not found'}), 404

            cursor.execute("DELETE FROM yahoo_portfolio WHERE id = %s", (holding_id,))
            connection.commit()

            return jsonify({'message': 'Holding removed successfully'})

    except Error as e:
        current_app.logger.error('yahoo_portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_yahoo_bp.route('/api/portfolio/yahoo-holdings/clear', methods=['DELETE'])
@token_required
def clear_yahoo_holdings(payload):
    """Clear all Yahoo Finance portfolio holdings for a user."""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("DELETE FROM yahoo_portfolio WHERE username = %s", (username,))
            connection.commit()
            deleted = cursor.rowcount

            return jsonify({'message': f'Cleared {deleted} holdings', 'deleted': deleted})

    except Error as e:
        current_app.logger.error('yahoo_portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
