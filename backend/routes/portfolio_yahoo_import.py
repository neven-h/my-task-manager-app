from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, _fetch_stock_info_robust
from mysql.connector import Error
import chardet
import csv
import io

portfolio_yahoo_import_bp = Blueprint('portfolio_yahoo_import', __name__)


@portfolio_yahoo_import_bp.route('/api/portfolio/yahoo-import', methods=['POST'])
@token_required
def import_yahoo_portfolio(payload):
    """Import portfolio from Yahoo Finance CSV export.
    Accepts CSV with columns: Symbol, Current Price, Date, Time, Change, etc.
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

                for row in rows:
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
