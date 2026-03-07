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


def _ensure_tabs_table(conn):
    cursor = conn.cursor()
    cursor.execute(_CREATE_BUDGET_TABS_SQL)
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
            if user_role == 'admin':
                cursor.execute("SELECT * FROM budget_tabs ORDER BY created_at ASC")
            else:
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
            if user_role != 'admin' and tab.get('owner') != username:
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


# ── DELETE tab ─────────────────────────────────────────────────────────────────

@budget_tabs_bp.route('/api/budget-tabs/<int:tab_id>', methods=['DELETE'])
@token_required
def delete_budget_tab(payload, tab_id):
    username  = payload.get('username')
    user_role = payload.get('role', 'limited')
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if user_role != 'admin' and tab.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403
            # Unassign entries from this tab (keep the entries, just remove the tab link)
            cursor.execute(
                "UPDATE budget_entries SET tab_id = NULL WHERE tab_id = %s",
                (tab_id,)
            )
            cursor.execute("DELETE FROM budget_tabs WHERE id = %s", (tab_id,))
            conn.commit()
        return jsonify({'success': True})
    except Exception:
        logger.exception('Failed to delete budget tab')
        return jsonify({'error': 'An internal error occurred'}), 500
