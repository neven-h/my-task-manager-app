"""Budget tabs — delete endpoint (soft-delete to trash)."""
import logging
from flask import Blueprint, jsonify
from config import get_db_connection, token_required
from routes.trash import move_to_trash
from routes.budget_tabs import _ensure_tabs_table
from routes.budget_helpers import ensure_budget_daily_balances_table

logger = logging.getLogger(__name__)

budget_tabs_delete_bp = Blueprint('budget_tabs_delete', __name__)


@budget_tabs_delete_bp.route('/api/budget-tabs/<int:tab_id>', methods=['DELETE'])
@token_required
def delete_budget_tab(payload, tab_id):
    username  = payload.get('username')
    user_role = payload.get('role', 'limited')
    try:
        with get_db_connection() as conn:
            _ensure_tabs_table(conn)
            ensure_budget_daily_balances_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if tab.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403

            cursor.execute(
                "SELECT * FROM budget_entries WHERE tab_id = %s AND owner = %s",
                (tab_id, username)
            )
            entries = cursor.fetchall()
            for e in entries:
                if e.get('entry_date'):
                    e['entry_date'] = str(e['entry_date'])
                if e.get('created_at'):
                    e['created_at'] = str(e['created_at'])

            cursor.execute(
                "SELECT * FROM budget_daily_balances WHERE tab_id = %s AND owner = %s",
                (tab_id, username)
            )
            daily_balances = cursor.fetchall()
            for b in daily_balances:
                if b.get('entry_date'):
                    b['entry_date'] = str(b['entry_date'])
                if b.get('created_at'):
                    b['created_at'] = str(b['created_at'])
                if b.get('updated_at'):
                    b['updated_at'] = str(b['updated_at'])

            trash_data = {
                'tab_id': tab_id,
                'tab_name': tab.get('name'),
                'entries': entries,
                'daily_balances': daily_balances,
            }
            move_to_trash(conn, username, 'budget_tab', tab_id, tab.get('name'), trash_data)

            cursor.execute(
                "DELETE FROM budget_entries WHERE tab_id = %s AND owner = %s",
                (tab_id, username)
            )
            cursor.execute(
                "DELETE FROM budget_daily_balances WHERE tab_id = %s AND owner = %s",
                (tab_id, username)
            )
            cursor.execute("DELETE FROM budget_tabs WHERE id = %s", (tab_id,))
            conn.commit()
        return jsonify({'success': True, 'message': 'Tab moved to trash. You can restore it within 30 days.'})
    except Exception:
        logger.exception('Failed to delete budget tab')
        return jsonify({'error': 'An internal error occurred'}), 500
