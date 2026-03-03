from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field, log_bank_transaction_access
from mysql.connector import Error

transaction_query_bp = Blueprint('transaction_query', __name__)

@transaction_query_bp.route('/api/transactions/months', methods=['GET'])
@token_required
def get_transaction_months(payload):
    """Get list of months with saved transactions (filtered by user role and tab)"""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Fetch individual rows to decrypt amounts in Python
            query = """
                SELECT month_year,
                       amount,
                       transaction_date,
                       upload_date
                FROM bank_transactions
                WHERE 1=1
            """
            params = []

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Decrypt amounts and aggregate by month
            month_data = {}
            for row in rows:
                my = row['month_year']
                if my not in month_data:
                    month_data[my] = {
                        'month_year': my,
                        'transaction_count': 0,
                        'total_amount': 0.0,
                        'start_date': row['transaction_date'],
                        'end_date': row['transaction_date'],
                        'last_upload': row['upload_date']
                    }
                month_data[my]['transaction_count'] += 1
                try:
                    decrypted = decrypt_field(row['amount'])
                    month_data[my]['total_amount'] += float(decrypted) if decrypted else 0.0
                except (ValueError, TypeError):
                    pass
                # Track min/max dates
                if row['transaction_date']:
                    if not month_data[my]['start_date'] or row['transaction_date'] < month_data[my]['start_date']:
                        month_data[my]['start_date'] = row['transaction_date']
                    if not month_data[my]['end_date'] or row['transaction_date'] > month_data[my]['end_date']:
                        month_data[my]['end_date'] = row['transaction_date']
                if row['upload_date']:
                    if not month_data[my]['last_upload'] or row['upload_date'] > month_data[my]['last_upload']:
                        month_data[my]['last_upload'] = row['upload_date']

            # Convert to sorted list
            months = sorted(month_data.values(), key=lambda x: x['month_year'], reverse=True)

            for month in months:
                if month['total_amount']:
                    month['total_amount'] = float(month['total_amount'])
                if month['start_date']:
                    month['start_date'] = month['start_date'].isoformat()
                if month['end_date']:
                    month['end_date'] = month['end_date'].isoformat()
                if month['last_upload']:
                    month['last_upload'] = month['last_upload'].isoformat()

            return jsonify(months)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_query_bp.route('/api/transactions/all', methods=['GET'])
@token_required
def get_all_transactions(payload):
    """Get all transactions (filtered by user role and tab) with decryption"""
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
                WHERE 1=1
            """
            params = []

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all transactions

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
                action='VIEW_ALL',
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
