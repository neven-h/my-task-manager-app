"""Batch operations on bank transactions — multi-delete and selected-export."""
import csv
import io
import logging
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, request, jsonify, send_file, current_app
from config import (
    get_db_connection, sanitize_csv_field, token_required,
    decrypt_field, encrypt_field, log_bank_transaction_access,
)
from mysql.connector import Error

logger = logging.getLogger(__name__)
transaction_batch_bp = Blueprint('transaction_batch', __name__)


def _ownership_check(cursor, tab_id, username, user_role):
    if user_role == 'admin':
        return True
    cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
    tab = cursor.fetchone()
    return tab and tab['owner'] == username


@transaction_batch_bp.route('/api/transactions/batch', methods=['DELETE'])
@token_required
def batch_delete(payload):
    """Delete multiple transactions by IDs."""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json or {}
        ids = data.get('ids', [])
        tab_id = data.get('tab_id')

        if not ids or not tab_id:
            return jsonify({'error': 'ids and tab_id are required'}), 400
        if len(ids) > 500:
            return jsonify({'error': 'Maximum 500 transactions per batch'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if not _ownership_check(cursor, tab_id, username, user_role):
                return jsonify({'error': 'Access denied'}), 403

            placeholders = ','.join(['%s'] * len(ids))
            cursor.execute(
                f"DELETE FROM bank_transactions WHERE id IN ({placeholders}) AND tab_id = %s",
                [*ids, tab_id],
            )
            deleted = cursor.rowcount
            connection.commit()

        log_bank_transaction_access(
            username=username, action='BATCH_DELETE',
            transaction_ids=f"IDs: {','.join(map(str, ids[:20]))}{'...' if len(ids) > 20 else ''}"
        )
        return jsonify({'message': f'{deleted} transactions deleted', 'deleted': deleted})

    except Error as e:
        logger.error('batch_delete db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_batch_bp.route('/api/export/transactions/csv/selected', methods=['POST'])
@token_required
def export_selected_csv(payload):
    """Export specific transactions by IDs to CSV."""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json or {}
        ids = data.get('ids', [])
        tab_id = data.get('tab_id')

        if not ids or not tab_id:
            return jsonify({'error': 'ids and tab_id are required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if not _ownership_check(cursor, tab_id, username, user_role):
                return jsonify({'error': 'Access denied'}), 403

            placeholders = ','.join(['%s'] * len(ids))
            q = f"""SELECT transaction_date, description, amount, transaction_type
                    FROM bank_transactions WHERE id IN ({placeholders}) AND tab_id = %s
                    ORDER BY transaction_date DESC"""
            cursor.execute(q, [*ids, tab_id])
            rows = cursor.fetchall()

        if not rows:
            return jsonify({'error': 'No transactions found'}), 404

        def _dec(row):
            row['description'] = decrypt_field(row['description']) or ''
            raw = decrypt_field(row['amount'])
            try:
                row['amount'] = float(raw) if raw else 0.0
            except (ValueError, TypeError):
                row['amount'] = 0.0
            return row

        with ThreadPoolExecutor(max_workers=min(len(rows), 8)) as ex:
            rows = list(ex.map(_dec, rows))

        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=['Date', 'Description', 'Type', 'Amount'])
        w.writeheader()
        for r in rows:
            d = r['transaction_date']
            d = d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d or '')
            w.writerow({
                'Date': sanitize_csv_field(d),
                'Description': sanitize_csv_field(r['description']),
                'Type': sanitize_csv_field('Cash' if r.get('transaction_type') == 'cash' else 'Credit'),
                'Amount': sanitize_csv_field(r['amount']),
            })
        buf.seek(0)

        app = current_app._get_current_object()
        def _audit():
            with app.app_context():
                log_bank_transaction_access(username=username, action='EXPORT_SELECTED_CSV',
                    transaction_ids=f"Count: {len(rows)}")
        threading.Thread(target=_audit, daemon=True).start()

        return send_file(
            io.BytesIO(buf.getvalue().encode('utf-8-sig')),
            mimetype='text/csv; charset=utf-8', as_attachment=True,
            download_name=f'selected_transactions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        )

    except Error as e:
        logger.error('export_selected db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_batch_bp.route('/api/transactions/batch/rename', methods=['PUT'])
@token_required
def batch_rename(payload):
    """Rename all transactions matching a description within a tab."""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json or {}
        tab_id = data.get('tab_id')
        old_description = (data.get('old_description') or '').strip()
        new_description = (data.get('new_description') or '').strip()

        if not tab_id or not old_description or not new_description:
            return jsonify({'error': 'tab_id, old_description, and new_description are required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if not _ownership_check(cursor, tab_id, username, user_role):
                return jsonify({'error': 'Access denied'}), 403

            cursor.execute(
                "SELECT id, description FROM bank_transactions WHERE tab_id = %s", (tab_id,)
            )
            rows = cursor.fetchall()

        if not rows:
            return jsonify({'error': 'No transactions found'}), 404

        def _match(row):
            try:
                desc = decrypt_field(row['description'])
                return row['id'] if desc and desc.strip() == old_description else None
            except Exception:
                return None

        with ThreadPoolExecutor(max_workers=min(len(rows), 8)) as ex:
            matching_ids = [rid for rid in ex.map(_match, rows) if rid is not None]

        if not matching_ids:
            return jsonify({'error': 'No matching transactions found'}), 404

        encrypted_new = encrypt_field(new_description)
        with get_db_connection() as connection:
            cursor = connection.cursor()
            placeholders = ','.join(['%s'] * len(matching_ids))
            cursor.execute(
                f"UPDATE bank_transactions SET description = %s WHERE id IN ({placeholders})",
                [encrypted_new, *matching_ids]
            )
            updated = cursor.rowcount
            connection.commit()

        log_bank_transaction_access(
            username=username, action='BATCH_RENAME',
            transaction_ids=f"Renamed {updated}: '{old_description}' -> '{new_description}'"
        )
        return jsonify({'message': f'{updated} transactions renamed', 'updated': updated})

    except Error as e:
        logger.error('batch_rename db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
