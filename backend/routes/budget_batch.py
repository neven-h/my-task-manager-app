"""Batch operations on budget entries — bulk update and bulk delete."""
import logging
from flask import request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache
from .budget import budget_bp
from .budget_helpers import ensure_budget_table

logger = logging.getLogger(__name__)


@budget_bp.route('/api/budget/batch', methods=['PUT'])
@token_required
def batch_update_budget_entries(payload):
    """Bulk-update description and/or category for a list of entry IDs."""
    username = payload.get('username')
    data = request.get_json() or {}
    ids = data.get('ids', [])
    fields = data.get('fields', {})
    if not ids or not isinstance(ids, list) or len(ids) > 5000:
        return jsonify({'error': 'ids must be a list (max 5000)'}), 400
    # Column names come from this hardcoded tuple — never from user input.
    _ALLOWED_COLS = ('description', 'category')
    col_values = [(col, fields[col]) for col in _ALLOWED_COLS if col in fields]
    if not col_values:
        return jsonify({'error': 'No valid fields to update'}), 400
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor()
            set_clause   = ', '.join(f"{col} = %s" for col, _ in col_values)
            placeholders = ','.join(['%s'] * len(ids))
            cursor.execute(
                f"UPDATE budget_entries SET {set_clause} WHERE id IN ({placeholders}) AND owner = %s",
                [*(v for _, v in col_values), *ids, username],
            )
            updated = cursor.rowcount
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'updated': updated})
    except Exception:
        logger.exception('Failed to batch update budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/batch', methods=['DELETE'])
@token_required
def batch_delete_budget_entries(payload):
    """Delete multiple budget entries by ID list."""
    username = payload.get('username')
    data = request.get_json() or {}
    ids = data.get('ids', [])
    if not ids or not isinstance(ids, list) or len(ids) > 5000:
        return jsonify({'error': 'ids must be a list (max 5000)'}), 400
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor()
            placeholders = ','.join(['%s'] * len(ids))
            cursor.execute(
                f"DELETE FROM budget_entries WHERE id IN ({placeholders}) AND owner = %s",
                (*ids, username),
            )
            deleted = cursor.rowcount
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'deleted': deleted})
    except Exception:
        logger.exception('Failed to batch delete budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500
