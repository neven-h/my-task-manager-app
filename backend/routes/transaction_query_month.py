from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field, log_bank_transaction_access
from mysql.connector import Error

transaction_query_month_bp = Blueprint('transaction_query_month', __name__)


@transaction_query_month_bp.route('/api/transactions/<month_year>', methods=['GET'])
@token_required
def get_transactions_by_month(payload, month_year):
    """Get all transactions for a specific month (filtered by user role and tab) with decryption"""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT id,
                       account_number,
                       transaction_date,
                       description,
                       amount,
                       month_year,
                       transaction_type,
                       upload_date,
                       uploaded_by
                FROM bank_transactions
                WHERE month_year = %s
            """
            params = [month_year]

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role — shared role retains cross-user read access; everyone else sees only their own
            if user_role != 'shared':
                query += " AND uploaded_by = %s"
                params.append(username)

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

            # Decrypt sensitive fields and convert types
            for trans in transactions:
                # Decrypt sensitive fields
                trans['account_number'] = decrypt_field(trans['account_number'])
                trans['description'] = decrypt_field(trans['description'])
                trans['amount'] = decrypt_field(trans['amount'])

                # Convert types after decryption
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    try:
                        trans['amount'] = float(trans['amount'])
                    except (ValueError, TypeError):
                        trans['amount'] = 0.0
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='VIEW_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_query_month_bp.route('/api/transactions/descriptions', methods=['GET'])
@token_required
def get_all_descriptions(payload):
    """Get all unique transaction descriptions scoped to the requesting user's tab."""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            if user_role == 'admin':
                # Admins may pass an optional tab_id; without it they see nothing
                # (prevents accidental dump of the whole table)
                if tab_id:
                    cursor.execute("""
                        SELECT DISTINCT bt.description
                        FROM bank_transactions bt
                        WHERE bt.tab_id = %s
                          AND bt.description IS NOT NULL
                          AND bt.description != ''
                        ORDER BY bt.description
                    """, (tab_id,))
                else:
                    return jsonify([])
            else:
                # Non-admin: tab_id is required; verify tab ownership
                if not tab_id:
                    return jsonify({'error': 'tab_id is required'}), 400

                cursor.execute(
                    "SELECT id FROM transaction_tabs WHERE id = %s AND owner = %s",
                    (tab_id, username)
                )
                if not cursor.fetchone():
                    return jsonify({'error': 'Tab not found or access denied'}), 404

                cursor.execute("""
                    SELECT DISTINCT bt.description
                    FROM bank_transactions bt
                    WHERE bt.tab_id = %s
                      AND bt.description IS NOT NULL
                      AND bt.description != ''
                    ORDER BY bt.description
                """, (tab_id,))

            descriptions = [row[0] for row in cursor.fetchall()]
            return jsonify(descriptions)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
