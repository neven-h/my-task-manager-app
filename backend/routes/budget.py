"""Budget entries — CRUD for income/outcome cash-flow planning."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache
from .budget_helpers import ensure_budget_table, serialize_entry

logger = logging.getLogger(__name__)
budget_bp = Blueprint('budget', __name__)

_ALLOWED_COLS = {'type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id'}


@budget_bp.route('/api/budget', methods=['GET'])
@token_required
def get_budget_entries(payload):
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM budget_entries WHERE owner = %s ORDER BY entry_date ASC, id ASC",
                (username,),
            )
            return jsonify([serialize_entry(e) for e in cursor.fetchall()])
    except Exception:
        logger.exception('Failed to get budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget', methods=['POST'])
@token_required
def create_budget_entry(payload):
    username = payload.get('username')
    data = request.get_json() or {}
    entry_type  = data.get('type')
    description = (data.get('description') or '').strip()
    amount      = data.get('amount')
    entry_date  = data.get('entry_date')

    if entry_type not in ('income', 'outcome'):
        return jsonify({'error': 'type must be "income" or "outcome"'}), 400
    if not description:
        return jsonify({'error': 'description is required'}), 400
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({'error': 'amount must be a positive number'}), 400
    if not entry_date:
        return jsonify({'error': 'entry_date is required'}), 400

    category = (data.get('category') or '').strip() or None
    notes    = (data.get('notes')    or '').strip() or None
    tab_id   = data.get('tab_id') or None
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "INSERT INTO budget_entries (type,description,amount,entry_date,category,notes,owner,tab_id)"
                " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (entry_type, description, amount, entry_date, category, notes, username, tab_id),
            )
            conn.commit()
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (cursor.lastrowid,))
            entry = serialize_entry(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify(entry), 201
    except Exception:
        logger.exception('Failed to create budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/<int:entry_id>', methods=['PUT'])
@token_required
def update_budget_entry(payload, entry_id):
    username = payload.get('username')
    data = request.get_json() or {}
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403

            fields, params = [], []
            for col in ('type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id'):
                if col not in data or col not in _ALLOWED_COLS:
                    continue
                val = data[col]
                if col == 'amount':
                    val = float(val)
                elif col == 'description':
                    val = (val or '').strip()
                elif col in ('category', 'notes'):
                    val = (val or '').strip() or None
                fields.append(f"{col} = %s")
                params.append(val)

            if not fields:
                return jsonify({'error': 'No fields to update'}), 400

            cursor.execute(f"UPDATE budget_entries SET {', '.join(fields)} WHERE id = %s", [*params, entry_id])
            conn.commit()
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            updated = serialize_entry(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify(updated)
    except Exception:
        logger.exception('Failed to update budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_budget_entry(payload, entry_id):
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT owner FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403
            cursor.execute("DELETE FROM budget_entries WHERE id = %s", (entry_id,))
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'success': True})
    except Exception:
        logger.exception('Failed to delete budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


# Register batch routes onto budget_bp (must come after blueprint definition)
from . import budget_batch  # noqa: E402, F401
