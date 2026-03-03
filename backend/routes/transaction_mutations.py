from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required,
    log_bank_transaction_access,
)
from mysql.connector import Error

transaction_mutations_bp = Blueprint('transaction_mutations', __name__)

@transaction_mutations_bp.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
@token_required
def delete_transaction(payload, transaction_id):
    """Delete a specific transaction with audit logging"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check via tab
            if user_role != 'admin':
                cursor.execute("""
                    SELECT bt.uploaded_by, tt.owner
                    FROM bank_transactions bt
                    LEFT JOIN transaction_tabs tt ON bt.tab_id = tt.id
                    WHERE bt.id = %s
                """, (transaction_id,))
                row = cursor.fetchone()
                if not row:
                    return jsonify({'error': 'Transaction not found'}), 404
                if row['uploaded_by'] != username and row['owner'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute("DELETE FROM bank_transactions WHERE id = %s", (transaction_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Transaction not found'}), 404

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction deleted successfully'})

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_mutations_bp.route('/api/transactions/month/<month_year>', methods=['DELETE'])
@token_required
def delete_month_transactions(payload, month_year):
    """Delete all transactions for a specific month with audit logging"""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify({'error': 'tab_id is required'}), 400

            # Ownership check: verify the tab belongs to the user
            if user_role != 'admin':
                cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
                tab = cursor.fetchone()
                if not tab:
                    return jsonify({'error': 'Tab not found'}), 404
                if tab['owner'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute("DELETE FROM bank_transactions WHERE month_year = %s AND tab_id = %s", (month_year, tab_id))
            deleted_count = cursor.rowcount
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {deleted_count}"
            )

            return jsonify({
                'message': f'{deleted_count} transactions deleted successfully'
            })

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
