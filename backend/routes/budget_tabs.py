"""Budget tabs — named groupings for budget entries."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required

logger = logging.getLogger(__name__)

budget_tabs_bp = Blueprint('budget_tabs', __name__)

_CREATE_BUDGET_TABS_SQL = """
    CREATE TABLE IF NOT EXISTS budget_tabs (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        owner      VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_budget_tabs_owner (owner)
    )
"""


_orphan_cleanup_done = False


def _ensure_tabs_table(conn):
    global _orphan_cleanup_done
    cursor = conn.cursor()
    cursor.execute(_CREATE_BUDGET_TABS_SQL)
    if not _orphan_cleanup_done:
        cursor.execute("DELETE FROM budget_entries WHERE tab_id IS NULL")
        _orphan_cleanup_done = True
    conn.commit()
    cursor.close()


# ── GET all tabs ───────────────────────────────────────────────────────────────

@budget_tabs_bp.route('/api/budget-tabs', methods=['GET'])
@token_required
def get_budget_tabs(payload):
    username  = payload.get('username')
    user_role = payload.get('role', 'limited')
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM budget_tabs WHERE owner = %s ORDER BY created_at ASC",
                (username,)
            )
            tabs = cursor.fetchall()
            for t in tabs:
                if t.get('created_at'):
                    t['created_at'] = str(t['created_at'])
        return jsonify(tabs)
    except Exception:
        logger.exception('Failed to get budget tabs')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── POST create tab ────────────────────────────────────────────────────────────

@budget_tabs_bp.route('/api/budget-tabs', methods=['POST'])
@token_required
def create_budget_tab(payload):
    username = payload.get('username')
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "INSERT INTO budget_tabs (name, owner) VALUES (%s, %s)",
                (name, username)
            )
            conn.commit()
            new_id = cursor.lastrowid
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (new_id,))
            tab = cursor.fetchone()
            tab['created_at'] = str(tab['created_at'])
        return jsonify(tab), 201
    except Exception:
        logger.exception('Failed to create budget tab')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── PUT rename tab ─────────────────────────────────────────────────────────────

@budget_tabs_bp.route('/api/budget-tabs/<int:tab_id>', methods=['PUT'])
@token_required
def rename_budget_tab(payload, tab_id):
    username  = payload.get('username')
    user_role = payload.get('role', 'limited')
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if tab.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403
            cursor.execute(
                "UPDATE budget_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            conn.commit()
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (tab_id,))
            updated = cursor.fetchone()
            updated['created_at'] = str(updated['created_at'])
        return jsonify(updated)
    except Exception:
        logger.exception('Failed to rename budget tab')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── POST duplicate tab ─────────────────────────────────────────────────────────

@budget_tabs_bp.route('/api/budget-tabs/<int:tab_id>/duplicate', methods=['POST'])
@token_required
def duplicate_budget_tab(payload, tab_id):
    """Create a copy of a tab and all its entries."""
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s AND owner = %s", (tab_id, username))
            source = cursor.fetchone()
            if not source:
                return jsonify({'error': 'Tab not found'}), 404
            new_name = source['name'] + ' (copy)'
            cursor.execute("INSERT INTO budget_tabs (name, owner) VALUES (%s, %s)", (new_name, username))
            conn.commit()
            new_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO budget_entries "
                "  (type, description, amount, entry_date, category, notes, owner, tab_id, source) "
                "SELECT type, description, amount, entry_date, category, notes, owner, %s, 'manual' "
                "FROM budget_entries WHERE tab_id = %s AND owner = %s",
                (new_id, tab_id, username),
            )
            conn.commit()
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (new_id,))
            new_tab = cursor.fetchone()
            new_tab['created_at'] = str(new_tab['created_at'])
        return jsonify(new_tab), 201
    except Exception:
        logger.exception('Failed to duplicate budget tab')
        return jsonify({'error': 'An internal error occurred'}), 500
