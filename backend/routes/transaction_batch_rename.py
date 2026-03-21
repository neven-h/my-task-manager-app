"""Batch rename operations on bank transactions."""
import logging
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, request, jsonify
from config import (
    get_db_connection, token_required, decrypt_field, encrypt_field,
    log_bank_transaction_access,
)
from mysql.connector import Error

logger = logging.getLogger(__name__)
transaction_batch_rename_bp = Blueprint('transaction_batch_rename', __name__)


def _ownership_check(cursor, tab_id, username, user_role):
    if user_role == 'admin':
        return True
    cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
    tab = cursor.fetchone()
    return tab and tab['owner'] == username


@transaction_batch_rename_bp.route('/api/transactions/batch/rename', methods=['PUT'])
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


@transaction_batch_rename_bp.route('/api/transactions/batch/rename-ids', methods=['PUT'])
@token_required
def batch_rename_by_ids(payload):
    """Rename specific transactions (by ID list) to a new description."""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json or {}
        tab_id = data.get('tab_id')
        ids = data.get('ids', [])
        new_description = (data.get('new_description') or '').strip()

        if not tab_id or not ids or not new_description:
            return jsonify({'error': 'tab_id, ids, and new_description are required'}), 400
        if len(ids) > 500:
            return jsonify({'error': 'Maximum 500 transactions per batch'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if not _ownership_check(cursor, tab_id, username, user_role):
                return jsonify({'error': 'Access denied'}), 403

            encrypted_new = encrypt_field(new_description)
            placeholders = ','.join(['%s'] * len(ids))
            cursor.execute(
                f"UPDATE bank_transactions SET description = %s "
                f"WHERE id IN ({placeholders}) AND tab_id = %s",
                [encrypted_new, *ids, tab_id]
            )
            updated = cursor.rowcount
            connection.commit()

        log_bank_transaction_access(
            username=username, action='BATCH_RENAME_IDS',
            transaction_ids=f"Renamed {updated} IDs -> '{new_description}'"
        )
        return jsonify({'message': f'{updated} transactions renamed', 'updated': updated})

    except Error as e:
        logger.error('batch_rename_by_ids db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
