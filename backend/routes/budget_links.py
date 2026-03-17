"""Budget ↔ Bank Transaction tab linking — CRUD for budget_bank_links."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache

logger = logging.getLogger(__name__)
budget_links_bp = Blueprint('budget_links', __name__)


@budget_links_bp.route('/api/budget-tabs/<int:tab_id>/link', methods=['GET'])
@token_required
def get_link(payload, tab_id):
    """Return the linked transaction tab (if any) for a budget tab."""
    username = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT l.transaction_tab_id, t.name AS transaction_tab_name "
                "FROM budget_bank_links l "
                "JOIN transaction_tabs t ON t.id = l.transaction_tab_id "
                "WHERE l.budget_tab_id = %s AND l.owner = %s "
                "LIMIT 1",
                (tab_id, username),
            )
            row = cur.fetchone()
        if not row:
            return jsonify(None)
        return jsonify(row)
    except Exception:
        logger.exception('get_link failed')
        return jsonify({'error': 'Internal error'}), 500


@budget_links_bp.route('/api/transaction-tabs/<int:tab_id>/budget-link', methods=['GET'])
@token_required
def get_budget_link_for_transaction_tab(payload, tab_id):
    """Return the linked budget tab (if any) for a transaction tab."""
    username = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT l.budget_tab_id, b.name AS budget_tab_name "
                "FROM budget_bank_links l "
                "JOIN budget_tabs b ON b.id = l.budget_tab_id "
                "WHERE l.transaction_tab_id = %s AND l.owner = %s "
                "LIMIT 1",
                (tab_id, username),
            )
            row = cur.fetchone()
        if not row:
            return jsonify(None)
        return jsonify(row)
    except Exception:
        logger.exception('get_budget_link_for_transaction_tab failed')
        return jsonify({'error': 'Internal error'}), 500


@budget_links_bp.route('/api/budget-tabs/<int:tab_id>/link', methods=['PUT'])
@token_required
def set_link(payload, tab_id):
    """Link a budget tab to a bank transaction tab (1-to-1)."""
    username = payload['username']
    data = request.get_json() or {}
    tx_tab_id = data.get('transaction_tab_id')
    if not tx_tab_id:
        return jsonify({'error': 'transaction_tab_id is required'}), 400
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            # Verify ownership of both tabs
            cur.execute("SELECT id FROM budget_tabs WHERE id = %s AND owner = %s", (tab_id, username))
            if not cur.fetchone():
                return jsonify({'error': 'Budget tab not found'}), 404
            cur.execute(
                "SELECT id FROM transaction_tabs WHERE id = %s AND (owner = %s OR owner IS NULL)",
                (tx_tab_id, username)
            )
            if not cur.fetchone():
                return jsonify({'error': 'Transaction tab not found'}), 404
            # Remove any existing link for this budget tab, then insert
            cur.execute("DELETE FROM budget_bank_links WHERE budget_tab_id = %s AND owner = %s", (tab_id, username))
            cur.execute(
                "INSERT INTO budget_bank_links (budget_tab_id, transaction_tab_id, owner) VALUES (%s, %s, %s)",
                (tab_id, tx_tab_id, username),
            )
            conn.commit()
            # Return the new link
            cur.execute(
                "SELECT l.transaction_tab_id, t.name AS transaction_tab_name "
                "FROM budget_bank_links l "
                "JOIN transaction_tabs t ON t.id = l.transaction_tab_id "
                "WHERE l.budget_tab_id = %s AND l.owner = %s",
                (tab_id, username),
            )
            row = cur.fetchone()
        invalidate_balance_forecast_cache(username)
        return jsonify(row)
    except Exception:
        logger.exception('set_link failed')
        return jsonify({'error': 'Internal error'}), 500


@budget_links_bp.route('/api/budget-tabs/<int:tab_id>/link', methods=['DELETE'])
@token_required
def remove_link(payload, tab_id):
    """Remove the link between a budget tab and its bank transaction tab."""
    username = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM budget_bank_links WHERE budget_tab_id = %s AND owner = %s", (tab_id, username))
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'success': True})
    except Exception:
        logger.exception('remove_link failed')
        return jsonify({'error': 'Internal error'}), 500


@budget_links_bp.route('/api/budget-tabs/<int:tab_id>/sync-status', methods=['GET'])
@token_required
def sync_status(payload, tab_id):
    """Return sync quality indicators for a budget tab's linked transaction tab."""
    username = payload['username']
    user_role = payload.get('role', '')
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT l.transaction_tab_id, t.name AS transaction_tab_name "
                "FROM budget_bank_links l "
                "JOIN transaction_tabs t ON t.id = l.transaction_tab_id "
                "WHERE l.budget_tab_id = %s AND l.owner = %s LIMIT 1",
                (tab_id, username),
            )
            link = cur.fetchone()
            if not link:
                return jsonify({'linked': False})

            tx_tab_id = link['transaction_tab_id']
            # Transaction count + last date (skip uploaded_by filter for shared users)
            tx_sql = ("SELECT COUNT(*) AS cnt, MAX(transaction_date) AS last_date "
                      "FROM bank_transactions WHERE tab_id = %s")
            tx_params = [tx_tab_id]
            if user_role != 'shared':
                tx_sql += " AND (uploaded_by = %s OR uploaded_by IS NULL)"
                tx_params.append(username)
            cur.execute(tx_sql, tx_params)
            tx_row = cur.fetchone()
            # Budget entry count
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM budget_entries "
                "WHERE tab_id = %s AND owner = %s",
                (tab_id, username),
            )
            be_row = cur.fetchone()

        last_date = tx_row['last_date']
        if last_date and hasattr(last_date, 'isoformat'):
            last_date = last_date.isoformat()
        elif last_date:
            last_date = str(last_date)[:10]

        return jsonify({
            'linked': True,
            'transaction_tab_name': link['transaction_tab_name'],
            'transaction_count': tx_row['cnt'] or 0,
            'last_transaction_date': last_date,
            'budget_entry_count': be_row['cnt'] or 0,
        })
    except Exception:
        logger.exception('sync_status failed')
        return jsonify({'error': 'Internal error'}), 500
