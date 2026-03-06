from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required,
    encrypt_field, log_bank_transaction_access,
)
from mysql.connector import Error

transaction_update_bp = Blueprint('transaction_update', __name__)

@transaction_update_bp.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
@token_required
def update_transaction(payload, transaction_id):
    """Update a specific transaction with encryption"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Ownership check: non-admin users can only update transactions in their own tabs
            if user_role != 'admin':
                cursor.execute(
                    "SELECT bt.id FROM bank_transactions bt "
                    "JOIN transaction_tabs tt ON bt.tab_id = tt.id "
                    "WHERE bt.id = %s AND tt.owner = %s",
                    (transaction_id, username)
                )
                if not cursor.fetchone():
                    return jsonify({'error': 'Transaction not found or access denied'}), 404

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                    UPDATE bank_transactions
                    SET transaction_date = %s,
                        description      = %s,
                        amount           = %s,
                        month_year       = %s,
                        account_number   = %s,
                        transaction_type = %s
                    WHERE id = %s
                    """

            cursor.execute(query, (
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                encrypted_account,
                data.get('transaction_type', 'credit'),
                transaction_id
            ))
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='UPDATE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction updated successfully (encrypted)'})

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_update_bp.route('/api/transactions/manual', methods=['POST'])
@token_required
def add_manual_transaction(payload):
    """Add a transaction manually with encryption"""
    try:
        username = payload['username']
        data = request.json
        tab_id = data.get('tab_id')

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Ownership check: verify the tab belongs to the requesting user
            cursor.execute(
                "SELECT id FROM transaction_tabs WHERE id = %s AND owner = %s",
                (tab_id, username)
            )
            if not cursor.fetchone():
                return jsonify({'error': 'Tab not found or access denied'}), 404

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
            cursor.execute(query, (
                encrypted_account,
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                data.get('transaction_type', 'credit'),
                username,
                tab_id
            ))
            connection.commit()

            transaction_id = cursor.lastrowid

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='MANUAL_ADD',
                transaction_ids=str(transaction_id),
                month_year=data.get('month_year')
            )

            return jsonify({
                'message': 'Transaction added successfully (encrypted)',
                'id': transaction_id
            })

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
