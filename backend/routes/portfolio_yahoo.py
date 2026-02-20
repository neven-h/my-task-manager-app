from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required, DEBUG,
    _fetch_stock_info_robust,
    _get_exchange_rate,
)
from decimal import Decimal
from mysql.connector import Error
from datetime import datetime
import yfinance as yf
from yfinance.exceptions import YFRateLimitError
import chardet
import csv
import io
import json

portfolio_yahoo_bp = Blueprint('portfolio_yahoo', __name__)

# ==================== YAHOO FINANCE PORTFOLIO IMPORT ====================

@portfolio_yahoo_bp.route('/api/portfolio/yahoo-import', methods=['POST'])
@token_required
def import_yahoo_portfolio(payload):
    """Import portfolio from Yahoo Finance CSV export.
    Accepts a CSV file with columns: Symbol, Current Price, Date, Time, Change, Open, High, Low, Volume, Trade Date
    OR the Holdings format: Symbol, Quantity, Price Paid, etc.
    Also accepts JSON body with manual ticker list.
    """
    try:
        username = payload['username']

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
                current_app.logger.error('yahoo_portfolio CSV parse error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to parse CSV file'}), 400

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
                    current_app.logger.error('yahoo_portfolio save error for %s: %s', item['ticker'], e, exc_info=True)
                    errors.append(f"{item['ticker']}: failed to save")

            connection.commit()

        return jsonify({
            'message': f'Successfully imported {saved_count} holdings',
            'imported': imported,
            'errors': errors,
            'count': saved_count
        }, 201)

    except Exception as e:
        current_app.logger.error('yahoo_portfolio import error: %s', e, exc_info=True)
        return jsonify({'error': 'Import failed'}), 500


@portfolio_yahoo_bp.route('/api/portfolio/yahoo-holdings', methods=['GET'])
@token_required
def get_yahoo_holdings(payload):
    """Get user's imported Yahoo Finance portfolio holdings with live prices."""
    try:
        username = payload['username']

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
                    # Use currency from Yahoo when missing in DB
                    entry['currency'] = (info.get('currency') or h.get('currency') or 'USD')

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
                    current_app.logger.error('yahoo_portfolio price error for %s: %s', ticker, e, exc_info=True)
                    entry['currentPrice'] = None
                    entry['error'] = 'Rate limit exceeded' if is_rate_limit else 'Failed to fetch price'
                    entry['rateLimited'] = is_rate_limit
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


