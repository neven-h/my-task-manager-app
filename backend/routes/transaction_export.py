"""Export bank transactions to CSV."""
import logging
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, request, jsonify, send_file, current_app
from config import (
    get_db_connection, sanitize_csv_field, token_required,
    decrypt_field, log_bank_transaction_access,
)
from mysql.connector import Error

import csv
import io

logger = logging.getLogger(__name__)

transaction_export_bp = Blueprint('transaction_export', __name__)


@transaction_export_bp.route('/api/export/transactions/csv', methods=['GET'])
@token_required
def export_transactions_csv(payload):
    """Export bank transactions to CSV (scoped by tab and optionally by month)."""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')
        month = request.args.get('month')  # optional 'YYYY-MM'

        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                SELECT id, transaction_date, description, amount, amount_plain,
                       transaction_type, month_year
                FROM bank_transactions
                WHERE tab_id = %s
            """
            params = [tab_id]

            if month:
                query += " AND month_year = %s"
                params.append(month)

            # Scope by user (shared role has cross-user read access)
            if user_role != 'shared':
                query += " AND uploaded_by = %s"
                params.append(username)

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            rows = cursor.fetchall()

        if not rows:
            return jsonify({'error': 'No transactions found for the given filters'}), 404

        # Decrypt description and amount in parallel
        def _decrypt_row(row):
            row['description'] = decrypt_field(row['description']) or ''
            try:
                row['amount'] = float(row['amount_plain']) if row.get('amount_plain') is not None else float(decrypt_field(row['amount']) or 0)
            except (ValueError, TypeError):
                row['amount'] = 0.0
            return row

        workers = min(len(rows), 8)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            rows = list(ex.map(_decrypt_row, rows))

        # Build CSV
        output = io.StringIO()
        fieldnames = ['Date', 'Description', 'Type', 'Amount']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for row in rows:
            trans_date = row['transaction_date']
            if hasattr(trans_date, 'strftime'):
                trans_date = trans_date.strftime('%Y-%m-%d')
            else:
                trans_date = str(trans_date) if trans_date else ''

            writer.writerow({
                'Date': sanitize_csv_field(trans_date),
                'Description': sanitize_csv_field(row['description']),
                'Type': sanitize_csv_field(
                    'Cash' if row.get('transaction_type') == 'cash' else 'Credit'
                ),
                'Amount': sanitize_csv_field(row['amount']),
            })

        output.seek(0)

        # Audit log in background
        month_label = month or 'all'
        app = current_app._get_current_object()

        def _audit():
            with app.app_context():
                log_bank_transaction_access(
                    username=username,
                    action='EXPORT_CSV',
                    month_year=month_label,
                    transaction_ids=f"Count: {len(rows)}",
                )

        threading.Thread(target=_audit, daemon=True).start()

        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            mimetype='text/csv; charset=utf-8',
            as_attachment=True,
            download_name=f'transactions_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        )

    except Error as e:
        logger.error('transaction_export db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
    except Exception as e:
        logger.error('transaction_export error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to export transactions'}), 500
