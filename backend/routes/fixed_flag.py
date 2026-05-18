"""Toggle the is_fixed flag on budget entries and bank transactions.

Marks a row as a fixed monthly obligation (e.g. הוראת קבע or recurring
transfer). The flag is purely user-managed; the monthly summary endpoint
uses it to split expenses into fixed vs. variable buckets.
"""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache
from .budget_helpers import ensure_budget_table

logger = logging.getLogger(__name__)
fixed_flag_bp = Blueprint('fixed_flag', __name__)


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'yes', 'on')
    return False


@fixed_flag_bp.route('/api/budget/entries/<int:entry_id>/fixed', methods=['PATCH'])
@token_required
def toggle_budget_entry_fixed(payload, entry_id):
    username = payload.get('username')
    data = request.get_json(silent=True) or {}
    if 'is_fixed' not in data:
        return jsonify({'error': 'is_fixed is required'}), 400
    is_fixed = _coerce_bool(data['is_fixed'])
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM budget_entries WHERE id = %s", (entry_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Entry not found'}), 404
            if row.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403
            cur.execute(
                "UPDATE budget_entries SET is_fixed = %s WHERE id = %s",
                (is_fixed, entry_id),
            )
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'id': entry_id, 'is_fixed': is_fixed})
    except Exception:
        logger.exception('Failed to toggle budget entry is_fixed')
        return jsonify({'error': 'An internal error occurred'}), 500


@fixed_flag_bp.route('/api/transactions/<int:transaction_id>/fixed', methods=['PATCH'])
@token_required
def toggle_transaction_fixed(payload, transaction_id):
    username = payload.get('username')
    user_role = payload.get('role')
    data = request.get_json(silent=True) or {}
    if 'is_fixed' not in data:
        return jsonify({'error': 'is_fixed is required'}), 400
    is_fixed = _coerce_bool(data['is_fixed'])
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            if user_role != 'admin':
                cur.execute(
                    "SELECT bt.id FROM bank_transactions bt "
                    "JOIN transaction_tabs tt ON bt.tab_id = tt.id "
                    "WHERE bt.id = %s AND tt.owner = %s",
                    (transaction_id, username),
                )
                if not cur.fetchone():
                    return jsonify({'error': 'Transaction not found or access denied'}), 404
            else:
                cur.execute("SELECT id FROM bank_transactions WHERE id = %s", (transaction_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Transaction not found'}), 404
            cur.execute(
                "UPDATE bank_transactions SET is_fixed = %s WHERE id = %s",
                (is_fixed, transaction_id),
            )
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'id': transaction_id, 'is_fixed': is_fixed})
    except Exception:
        logger.exception('Failed to toggle bank transaction is_fixed')
        return jsonify({'error': 'An internal error occurred'}), 500
