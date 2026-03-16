"""Budget entries — predicted incomes and outcomes for freelancer cash-flow planning."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache

logger = logging.getLogger(__name__)

budget_bp = Blueprint('budget', __name__)

_CREATE_BUDGET_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS budget_entries (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        type        ENUM('income','outcome') NOT NULL,
        description VARCHAR(500) NOT NULL,
        amount      DECIMAL(12,2) NOT NULL,
        entry_date  DATE NOT NULL,
        category    VARCHAR(100),
        notes       TEXT,
        owner       VARCHAR(255),
        tab_id      INT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_budget_owner  (owner),
        INDEX idx_budget_date   (entry_date),
        INDEX idx_budget_tab    (tab_id)
    )
"""


def _ensure_table(conn):
    """Guarantee budget_entries exists with all required columns."""
    from mysql.connector import Error as MySQLError
    cur = conn.cursor()
    cur.execute(_CREATE_BUDGET_TABLE_SQL)
    try:
        cur.execute("ALTER TABLE budget_entries ADD COLUMN tab_id INT")
        cur.execute("ALTER TABLE budget_entries ADD INDEX idx_budget_tab (tab_id)")
    except MySQLError as e:
        if 'Duplicate column' not in str(e) and 'Duplicate key' not in str(e):
            logger.warning('budget_entries tab_id migration note: %s', e)
    cur.close()


def _serialize(e):
    """Convert Decimal/date fields for JSON serialisation."""
    e['amount'] = float(e['amount'])
    for f in ('entry_date', 'created_at', 'updated_at'):
        if e.get(f):
            e[f] = str(e[f])
    return e


@budget_bp.route('/api/budget', methods=['GET'])
@token_required
def get_budget_entries(payload):
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM budget_entries WHERE owner = %s ORDER BY entry_date ASC, id ASC",
                (username,),
            )
            entries = [_serialize(e) for e in cursor.fetchall()]
        return jsonify(entries)
    except Exception as exc:
        logger.exception('Failed to get budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget', methods=['POST'])
@token_required
def create_budget_entry(payload):
    username = payload.get('username')
    data = request.get_json() or {}

    entry_type = data.get('type')
    description = (data.get('description') or '').strip()
    amount = data.get('amount')
    entry_date = data.get('entry_date')

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
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """INSERT INTO budget_entries (type, description, amount, entry_date, category, notes, owner, tab_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (entry_type, description, amount, entry_date, category, notes, username, tab_id)
            )
            conn.commit()
            new_id = cursor.lastrowid
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (new_id,))
            entry = _serialize(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify(entry), 201
    except Exception as exc:
        logger.exception('Failed to create budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/<int:entry_id>', methods=['PUT'])
@token_required
def update_budget_entry(payload, entry_id):
    username = payload.get('username')
    data = request.get_json() or {}

    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403

            fields, params = [], []
            allowed_cols = {'type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id'}
            for col in ('type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id'):
                if col in data and col in allowed_cols:
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

            params.append(entry_id)
            cursor.execute(
                f"UPDATE budget_entries SET {', '.join(fields)} WHERE id = %s",
                params
            )
            conn.commit()

            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            updated = _serialize(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify(updated)
    except Exception as exc:
        logger.exception('Failed to update budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/batch', methods=['DELETE'])
@token_required
def batch_delete_budget_entries(payload):
    username = payload.get('username')
    data = request.get_json() or {}
    ids = data.get('ids', [])
    if not ids or not isinstance(ids, list) or len(ids) > 5000:
        return jsonify({'error': 'ids must be a list (max 5000)'}), 400
    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
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
    except Exception as exc:
        logger.exception('Failed to batch delete budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_budget_entry(payload, entry_id):
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403
            cursor.execute("DELETE FROM budget_entries WHERE id = %s", (entry_id,))
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'success': True})
    except Exception as exc:
        logger.exception('Failed to delete budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500
