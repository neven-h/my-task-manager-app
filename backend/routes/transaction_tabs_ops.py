"""Transaction tabs — duplicate and delete endpoints."""
from flask import Blueprint, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error
from routes.trash import move_to_trash

transaction_tabs_ops_bp = Blueprint('transaction_tabs_ops', __name__)


@transaction_tabs_ops_bp.route('/api/transaction-tabs/<int:tab_id>/duplicate', methods=['POST'])
@token_required
def duplicate_transaction_tab(payload, tab_id):
    """Create a copy of a tab and all its transactions."""
    try:
        username = payload['username']
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM transaction_tabs WHERE id = %s AND owner = %s", (tab_id, username))
            source = cursor.fetchone()
            if not source:
                return jsonify({'error': 'Tab not found'}), 404
            new_name = source['name'] + ' (copy)'
            cursor.execute("INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)", (new_name, username))
            connection.commit()
            new_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO bank_transactions "
                "  (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id) "
                "SELECT account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, %s "
                "FROM bank_transactions WHERE tab_id = %s",
                (new_id, tab_id),
            )
            connection.commit()
            cursor.execute("SELECT * FROM transaction_tabs WHERE id = %s", (new_id,))
            new_tab = cursor.fetchone()
            if new_tab.get('created_at'):
                new_tab['created_at'] = new_tab['created_at'].isoformat()
        return jsonify(new_tab), 201
    except Error as e:
        current_app.logger.error('duplicate_transaction_tab db error: %s', e)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_ops_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['DELETE'])
@token_required
def delete_transaction_tab(payload, tab_id):
    """Delete a transaction tab and its associated transactions (soft-delete to trash)"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("SELECT * FROM transaction_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if tab['owner'] != username:
                return jsonify({'error': 'Access denied'}), 403

            cursor.execute(
                "SELECT * FROM bank_transactions WHERE tab_id = %s",
                (tab_id,)
            )
            transactions = cursor.fetchall()
            for t in transactions:
                if t.get('transaction_date'):
                    t['transaction_date'] = str(t['transaction_date'])
                if t.get('created_at'):
                    t['created_at'] = str(t['created_at'])

            tab_name = tab.get('name', f'Tab {tab_id}')
            trash_data = {
                'tab_id': tab_id,
                'tab_name': tab_name,
                'transactions': transactions,
            }
            move_to_trash(connection, username, 'transaction_tab', tab_id, tab_name, trash_data)

            cursor.execute(
                "DELETE FROM bank_transactions WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_transactions = cursor.rowcount

            cursor.execute(
                "DELETE FROM transaction_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            return jsonify({
                'success': True,
                'message': f'Tab moved to trash with {deleted_transactions} transactions. You can restore it within 30 days.'
            })

    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
