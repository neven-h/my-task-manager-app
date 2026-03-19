"""Trash management - soft delete with 30-day retention for budget tabs, transaction tabs, and tasks."""
import json
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from routes.trash_restore import _restore_budget_tab, _restore_transaction_tab, _restore_task

logger = logging.getLogger(__name__)
trash_bp = Blueprint('trash', __name__)

_CREATE_TRASH_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS trash (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        owner           VARCHAR(255) NOT NULL,
        item_type       VARCHAR(50) NOT NULL,
        item_id         INT NOT NULL,
        item_name       VARCHAR(255),
        item_data       LONGTEXT,
        deleted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at      TIMESTAMP NOT NULL,
        INDEX idx_trash_owner (owner),
        INDEX idx_trash_type (item_type),
        INDEX idx_trash_expires (expires_at)
    )
"""

RETENTION_DAYS = 30


def _ensure_trash_table(conn):
    """Create trash table if it doesn't exist and purge expired items.

    Does NOT commit — callers are responsible for committing the transaction.
    """
    cursor = conn.cursor()
    cursor.execute(_CREATE_TRASH_TABLE_SQL)
    cursor.execute("DELETE FROM trash WHERE expires_at < NOW()")
    cursor.close()


def move_to_trash(conn, owner: str, item_type: str, item_id: int, item_name: str, item_data: dict):
    """Move an item to trash with 30-day retention.

    Does NOT commit — callers must commit after their DELETE statements
    so the trash-insert and source-delete are atomic.
    """
    _ensure_trash_table(conn)
    cursor = conn.cursor()
    expires_at = datetime.now() + timedelta(days=RETENTION_DAYS)
    cursor.execute(
        "INSERT INTO trash (owner, item_type, item_id, item_name, item_data, expires_at) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (owner, item_type, item_id, item_name, json.dumps(item_data, default=str), expires_at)
    )
    cursor.close()


# ── GET trash items ───────────────────────────────────────────────────────────

@trash_bp.route('/api/trash', methods=['GET'])
@token_required
def get_trash_items(payload):
    """Get all items in trash for the current user."""
    try:
        username = payload['username']
        item_type = request.args.get('type')  # Optional filter: budget_tab, transaction_tab, task

        with get_db_connection() as conn:
            _ensure_trash_table(conn)
            conn.commit()
            cursor = conn.cursor(dictionary=True)

            query = "SELECT id, item_type, item_id, item_name, deleted_at, expires_at FROM trash WHERE owner = %s"
            params = [username]

            if item_type:
                query += " AND item_type = %s"
                params.append(item_type)

            query += " ORDER BY deleted_at DESC"
            cursor.execute(query, params)
            items = cursor.fetchall()

            for item in items:
                if item.get('deleted_at'):
                    item['deleted_at'] = item['deleted_at'].isoformat()
                if item.get('expires_at'):
                    item['expires_at'] = item['expires_at'].isoformat()
                # Calculate days remaining
                expires = datetime.fromisoformat(item['expires_at']) if isinstance(item['expires_at'], str) else item['expires_at']
                item['days_remaining'] = max(0, (expires - datetime.now()).days)

        return jsonify(items)
    except Exception:
        logger.exception('Failed to get trash items')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── RESTORE item from trash ───────────────────────────────────────────────────

@trash_bp.route('/api/trash/<int:trash_id>/restore', methods=['POST'])
@token_required
def restore_from_trash(payload, trash_id):
    """Restore an item from trash."""
    try:
        username = payload['username']

        with get_db_connection() as conn:
            _ensure_trash_table(conn)
            cursor = conn.cursor(dictionary=True)

            # Get the trash item
            cursor.execute(
                "SELECT * FROM trash WHERE id = %s AND owner = %s",
                (trash_id, username)
            )
            trash_item = cursor.fetchone()

            if not trash_item:
                return jsonify({'error': 'Item not found in trash'}), 404

            item_type = trash_item['item_type']
            item_data = json.loads(trash_item['item_data']) if trash_item['item_data'] else {}

            restored_id = None

            if item_type == 'budget_tab':
                restored_id = _restore_budget_tab(conn, username, item_data)
            elif item_type == 'transaction_tab':
                restored_id = _restore_transaction_tab(conn, username, item_data)
            elif item_type == 'task':
                restored_id = _restore_task(conn, username, item_data)
            else:
                return jsonify({'error': f'Unknown item type: {item_type}'}), 400

            # Remove from trash
            cursor.execute("DELETE FROM trash WHERE id = %s", (trash_id,))
            conn.commit()

            return jsonify({
                'success': True,
                'message': f'{item_type} restored successfully',
                'restored_id': restored_id
            })

    except Exception:
        logger.exception('Failed to restore from trash')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── PERMANENTLY DELETE from trash ─────────────────────────────────────────────

@trash_bp.route('/api/trash/<int:trash_id>', methods=['DELETE'])
@token_required
def permanently_delete_from_trash(payload, trash_id):
    """Permanently delete an item from trash."""
    try:
        username = payload['username']

        with get_db_connection() as conn:
            _ensure_trash_table(conn)
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM trash WHERE id = %s AND owner = %s",
                (trash_id, username)
            )
            conn.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Item not found in trash'}), 404

        return jsonify({'success': True, 'message': 'Item permanently deleted'})
    except Exception:
        logger.exception('Failed to permanently delete from trash')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── EMPTY trash ───────────────────────────────────────────────────────────────

@trash_bp.route('/api/trash/empty', methods=['DELETE'])
@token_required
def empty_trash(payload):
    """Permanently delete all items in trash for the current user."""
    try:
        username = payload['username']

        with get_db_connection() as conn:
            _ensure_trash_table(conn)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM trash WHERE owner = %s", (username,))
            deleted_count = cursor.rowcount
            conn.commit()

        return jsonify({'success': True, 'deleted_count': deleted_count})
    except Exception:
        logger.exception('Failed to empty trash')
        return jsonify({'error': 'An internal error occurred'}), 500
