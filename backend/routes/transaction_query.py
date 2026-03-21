from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field, log_bank_transaction_access
from mysql.connector import Error
import threading
from concurrent.futures import ThreadPoolExecutor

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
                       amount_plain,
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

            # Filter by role — shared role retains cross-user read access; everyone else sees only their own
            if user_role != 'shared':
                query += " AND (uploaded_by = %s OR uploaded_by IS NULL)"
                params.append(username)

            cursor.execute(query, params)
            rows = cursor.fetchall()

        # Decrypt amounts in parallel, then aggregate by month
        def _decrypt_row_amount(row):
            try:
                if row.get('amount_plain') is not None:
                    amount = float(row['amount_plain'])
                else:
                    decrypted = decrypt_field(row['amount'])
                    amount = float(decrypted) if decrypted else 0.0
            except (ValueError, TypeError):
                amount = 0.0
            return row['month_year'], amount, row['transaction_date'], row['upload_date']

        workers = min(len(rows), 8) if rows else 1
        with ThreadPoolExecutor(max_workers=workers) as ex:
            decrypted_rows = list(ex.map(_decrypt_row_amount, rows)) if rows else []

        month_data = {}
        for my, amount, trans_date, upload_date in decrypted_rows:
            if my not in month_data:
                month_data[my] = {
                    'month_year': my,
                    'transaction_count': 0,
                    'total_amount': 0.0,
                    'start_date': trans_date,
                    'end_date': trans_date,
                    'last_upload': upload_date,
                }
            month_data[my]['transaction_count'] += 1
            month_data[my]['total_amount'] += amount
            if trans_date:
                if not month_data[my]['start_date'] or trans_date < month_data[my]['start_date']:
                    month_data[my]['start_date'] = trans_date
                if not month_data[my]['end_date'] or trans_date > month_data[my]['end_date']:
                    month_data[my]['end_date'] = trans_date
            if upload_date:
                if not month_data[my]['last_upload'] or upload_date > month_data[my]['last_upload']:
                    month_data[my]['last_upload'] = upload_date

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
                       amount_plain,
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

            # Filter by role — shared role retains cross-user read access; everyone else sees only their own
            if user_role != 'shared':
                query += " AND (uploaded_by = %s OR uploaded_by IS NULL)"
                params.append(username)

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

        # Decrypt 2 fields per row in parallel — amount_plain used directly
        def _decrypt_transaction(trans):
            trans['account_number'] = decrypt_field(trans['account_number'])
            trans['description'] = decrypt_field(trans['description'])
            if trans.get('amount_plain') is not None:
                trans['amount'] = float(trans['amount_plain'])
            else:
                trans['amount'] = decrypt_field(trans['amount'])
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
            return trans

        if transactions:
            workers = min(len(transactions), 8)
            with ThreadPoolExecutor(max_workers=workers) as ex:
                transactions = list(ex.map(_decrypt_transaction, transactions))

        # Audit log in background — don't open a second DB connection on the hot path
        threading.Thread(
            target=log_bank_transaction_access,
            kwargs=dict(username=username, action='VIEW_ALL', transaction_ids=f"Count: {len(transactions)}"),
            daemon=True,
        ).start()

        return jsonify(transactions)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
