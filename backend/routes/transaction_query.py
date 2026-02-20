from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required, DEBUG,
    encrypt_field, decrypt_field, log_bank_transaction_access,
)
from decimal import Decimal
from mysql.connector import Error
from datetime import datetime, date
import json
import re

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


@transaction_query_bp.route('/api/transactions/<month_year>', methods=['GET'])
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

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

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


@transaction_query_bp.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
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


@transaction_query_bp.route('/api/transactions/month/<month_year>', methods=['DELETE'])
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


@transaction_query_bp.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
@token_required
def update_transaction(payload, transaction_id):
    """Update a specific transaction with encryption"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

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


@transaction_query_bp.route('/api/transactions/manual', methods=['POST'])
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


@transaction_query_bp.route('/api/transactions/descriptions', methods=['GET'])
@token_required
def get_all_descriptions(payload):
    """Get all unique transaction descriptions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("""
                           SELECT DISTINCT description
                           FROM bank_transactions
                           WHERE description IS NOT NULL
                             AND description != ''
                           ORDER BY description
                           """)

            descriptions = [row[0] for row in cursor.fetchall()]
            return jsonify(descriptions)

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_query_bp.route('/api/transactions/stats', methods=['GET'])
@token_required
def get_transaction_stats(payload):
    """Get transaction statistics including cash vs credit breakdown (filtered by user role and tab)"""
    try:
        username = payload['username']
        user_role = payload['role']
        # Get optional date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        tab_id = request.args.get('tab_id')

        print(f"[STATS DEBUG] tab_id={tab_id}, username={username}, role={user_role}")

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Require tab_id for strict tab separation
            if not tab_id or tab_id == 'null' or tab_id == 'undefined':
                print(f"[STATS DEBUG] Invalid tab_id, returning empty stats")
                return jsonify({'by_type': [], 'monthly_by_type': []})

            # Build filters
            filters = ["tab_id = %s"]
            params = [tab_id]

            if start_date:
                filters.append("transaction_date >= %s")
                params.append(start_date)
            if end_date:
                filters.append("transaction_date <= %s")
                params.append(end_date)
            if user_role == 'limited':
                filters.append("uploaded_by = %s")
                params.append(username)

            where_clause = " AND ".join(filters) if filters else "1=1"

            # Fetch individual rows — amount is encrypted, so we must decrypt in Python
            cursor.execute(f"""
                SELECT
                    transaction_type,
                    amount,
                    transaction_date,
                    month_year
                FROM bank_transactions
                WHERE {where_clause}
            """, params)

            rows = cursor.fetchall()
            print(f"[STATS DEBUG] Found {len(rows)} transactions for tab_id={tab_id}")

            # Debug: Show sample of what we found
            if len(rows) > 0:
                print(f"[STATS DEBUG] Sample transaction: type={rows[0].get('transaction_type')}, date={rows[0].get('transaction_date')}")
            else:
                # Check if transactions exist without tab_id match
                cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
                null_count = cursor.fetchone()
                cursor.execute("SELECT COUNT(*) as count FROM bank_transactions")
                total_count = cursor.fetchone()
                print(f"[STATS DEBUG] Total transactions in DB: {total_count['count']}, NULL tab_id: {null_count['count']}")

            # Aggregate by type in Python after decrypting amounts
            type_stats = {}
            for row in rows:
                t = row['transaction_type'] or 'unknown'
                if t not in type_stats:
                    type_stats[t] = {
                        'transaction_type': t,
                        'transaction_count': 0,
                        'total_amount': 0.0,
                        'avg_amount': 0.0,
                        'first_date': row['transaction_date'],
                        'last_date': row['transaction_date']
                    }
                type_stats[t]['transaction_count'] += 1
                try:
                    decrypted = decrypt_field(row['amount'])
                    amt = float(decrypted) if decrypted else 0.0
                except (ValueError, TypeError):
                    amt = 0.0
                type_stats[t]['total_amount'] += amt
                if row['transaction_date']:
                    if not type_stats[t]['first_date'] or row['transaction_date'] < type_stats[t]['first_date']:
                        type_stats[t]['first_date'] = row['transaction_date']
                    if not type_stats[t]['last_date'] or row['transaction_date'] > type_stats[t]['last_date']:
                        type_stats[t]['last_date'] = row['transaction_date']

            by_type = []
            for stat in type_stats.values():
                if stat['transaction_count'] > 0:
                    stat['avg_amount'] = stat['total_amount'] / stat['transaction_count']
                if stat['first_date']:
                    stat['first_date'] = stat['first_date'].isoformat()
                if stat['last_date']:
                    stat['last_date'] = stat['last_date'].isoformat()
                by_type.append(stat)

            # Aggregate monthly breakdown by type in Python
            monthly_stats = {}
            for row in rows:
                key = (row['month_year'], row['transaction_type'] or 'unknown')
                if key not in monthly_stats:
                    monthly_stats[key] = {
                        'month_year': row['month_year'],
                        'transaction_type': key[1],
                        'transaction_count': 0,
                        'total_amount': 0.0
                    }
                monthly_stats[key]['transaction_count'] += 1
                try:
                    decrypted = decrypt_field(row['amount'])
                    amt = float(decrypted) if decrypted else 0.0
                except (ValueError, TypeError):
                    amt = 0.0
                monthly_stats[key]['total_amount'] += amt

            monthly_by_type = sorted(
                monthly_stats.values(),
                key=lambda x: (x['month_year'], x['transaction_type']),
                reverse=True
            )

            return jsonify({
                'by_type': by_type,
                'monthly_by_type': monthly_by_type
            })

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


