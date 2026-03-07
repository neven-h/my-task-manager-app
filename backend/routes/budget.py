"""Budget entries — predicted incomes and outcomes for freelancer cash-flow planning."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required

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
    """Guarantee budget_entries exists with all required columns.

    Called at the top of every handler so the table is always present even
    if init_db() failed silently on startup (e.g. transient DB connection
    error during Railway deploy).  Also adds tab_id if the table predates
    the budget-tabs feature.
    """
    from mysql.connector import Error as MySQLError
    cursor = conn.cursor()
    cursor.execute(_CREATE_BUDGET_TABLE_SQL)
    # Migration: add tab_id if the table was created before this column existed
    try:
        cursor.execute("ALTER TABLE budget_entries ADD COLUMN tab_id INT")
        cursor.execute("ALTER TABLE budget_entries ADD INDEX idx_budget_tab (tab_id)")
    except MySQLError as e:
        if 'Duplicate column' not in str(e) and 'Duplicate key' not in str(e):
            logger.warning('budget_entries tab_id migration note: %s', e)
    cursor.close()


def _owner_filter(user_role, username):
    """Return (where_clause, params) for owner-scoped queries."""
    if user_role == 'admin':
        return '', []
    return ' AND owner = %s', [username]


# ── GET all entries ───────────────────────────────────────────────────────────

@budget_bp.route('/api/budget', methods=['GET'])
@token_required
def get_budget_entries(payload):
    username = payload.get('username')
    user_role = payload.get('role', 'limited')

    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            where, params = _owner_filter(user_role, username)
            sql = "SELECT * FROM budget_entries WHERE 1=1"
            if where:
                sql += where
            sql += " ORDER BY entry_date ASC, id ASC"
            cursor.execute(sql, params)
            entries = cursor.fetchall()
            # Convert Decimal → float and date → str for JSON serialisation
            for e in entries:
                e['amount'] = float(e['amount'])
                if e.get('entry_date'):
                    e['entry_date'] = str(e['entry_date'])
                if e.get('created_at'):
                    e['created_at'] = str(e['created_at'])
                if e.get('updated_at'):
                    e['updated_at'] = str(e['updated_at'])
        return jsonify(entries)
    except Exception as exc:
        logger.exception('Failed to get budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── POST create entry ─────────────────────────────────────────────────────────

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
            entry = cursor.fetchone()
            entry['amount'] = float(entry['amount'])
            entry['entry_date'] = str(entry['entry_date'])
            entry['created_at'] = str(entry['created_at'])
            entry['updated_at'] = str(entry['updated_at'])
        return jsonify(entry), 201
    except Exception as exc:
        logger.exception('Failed to create budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── PUT update entry ──────────────────────────────────────────────────────────

@budget_bp.route('/api/budget/<int:entry_id>', methods=['PUT'])
@token_required
def update_budget_entry(payload, entry_id):
    username = payload.get('username')
    user_role = payload.get('role', 'limited')
    data = request.get_json() or {}

    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if user_role != 'admin' and (not username or entry.get('owner') != username):
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
            updated = cursor.fetchone()
            updated['amount'] = float(updated['amount'])
            updated['entry_date'] = str(updated['entry_date'])
            updated['created_at'] = str(updated['created_at'])
            updated['updated_at'] = str(updated['updated_at'])
        return jsonify(updated)
    except Exception as exc:
        logger.exception('Failed to update budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── DELETE entry ──────────────────────────────────────────────────────────────

@budget_bp.route('/api/budget/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_budget_entry(payload, entry_id):
    username = payload.get('username')
    user_role = payload.get('role', 'limited')

    try:
        with get_db_connection() as conn:
            _ensure_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if user_role != 'admin' and (not username or entry.get('owner') != username):
                return jsonify({'error': 'Access denied'}), 403
            cursor.execute("DELETE FROM budget_entries WHERE id = %s", (entry_id,))
            conn.commit()
        return jsonify({'success': True})
    except Exception as exc:
        logger.exception('Failed to delete budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500
