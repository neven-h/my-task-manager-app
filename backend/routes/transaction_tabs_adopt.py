from flask import Blueprint, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

transaction_tabs_adopt_bp = Blueprint('transaction_tabs_adopt', __name__)


@transaction_tabs_adopt_bp.route('/api/transaction-tabs/orphaned', methods=['GET'])
@token_required
def get_orphaned_transaction_count(payload):
    """Get count of transactions with no tab_id (orphaned from before tabs existed)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
            result = cursor.fetchone()
            return jsonify({'count': result['count']})
    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_adopt_bp.route('/api/transaction-tabs/<int:tab_id>/adopt', methods=['POST'])
@token_required
def adopt_orphaned_transactions(payload, tab_id):
    """Assign all transactions with tab_id=NULL to the specified tab"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            if user_role != 'admin':
                cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
                tab = cursor.fetchone()
                if not tab:
                    return jsonify({'error': 'Tab not found'}), 404
                if tab['owner'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute("UPDATE bank_transactions SET tab_id = %s WHERE tab_id IS NULL", (tab_id,))
            adopted_count = cursor.rowcount
            connection.commit()
            return jsonify({'message': f'{adopted_count} transactions assigned to tab', 'count': adopted_count})
    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
