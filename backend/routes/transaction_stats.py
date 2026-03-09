from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field
from mysql.connector import Error
from concurrent.futures import ThreadPoolExecutor

transaction_stats_bp = Blueprint('transaction_stats', __name__)


@transaction_stats_bp.route('/api/transactions/stats', methods=['GET'])
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

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Require tab_id for strict tab separation
            if not tab_id or tab_id == 'null' or tab_id == 'undefined':
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
            if user_role != 'shared':
                filters.append("(uploaded_by = %s OR uploaded_by IS NULL)")
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

        # Decrypt each amount ONCE in parallel, then reuse for both aggregations
        def _decrypt_amount(row):
            try:
                decrypted = decrypt_field(row['amount'])
                return float(decrypted) if decrypted else 0.0
            except (ValueError, TypeError):
                return 0.0

        workers = min(len(rows), 8) if rows else 1
        with ThreadPoolExecutor(max_workers=workers) as ex:
            amounts = list(ex.map(_decrypt_amount, rows)) if rows else []

        # Build both aggregations in a single pass over pre-decrypted data
        type_stats = {}
        monthly_stats = {}

        for row, amt in zip(rows, amounts):
            t = row['transaction_type'] or 'unknown'

            # --- by_type ---
            if t not in type_stats:
                type_stats[t] = {
                    'transaction_type': t,
                    'transaction_count': 0,
                    'total_amount': 0.0,
                    'avg_amount': 0.0,
                    'first_date': row['transaction_date'],
                    'last_date': row['transaction_date'],
                }
            type_stats[t]['transaction_count'] += 1
            type_stats[t]['total_amount'] += amt
            if row['transaction_date']:
                if not type_stats[t]['first_date'] or row['transaction_date'] < type_stats[t]['first_date']:
                    type_stats[t]['first_date'] = row['transaction_date']
                if not type_stats[t]['last_date'] or row['transaction_date'] > type_stats[t]['last_date']:
                    type_stats[t]['last_date'] = row['transaction_date']

            # --- monthly_by_type ---
            key = (row['month_year'], t)
            if key not in monthly_stats:
                monthly_stats[key] = {
                    'month_year': row['month_year'],
                    'transaction_type': t,
                    'transaction_count': 0,
                    'total_amount': 0.0,
                }
            monthly_stats[key]['transaction_count'] += 1
            monthly_stats[key]['total_amount'] += amt

        # Finalize by_type
        by_type = []
        for stat in type_stats.values():
            if stat['transaction_count'] > 0:
                stat['avg_amount'] = stat['total_amount'] / stat['transaction_count']
            if stat['first_date']:
                stat['first_date'] = stat['first_date'].isoformat()
            if stat['last_date']:
                stat['last_date'] = stat['last_date'].isoformat()
            by_type.append(stat)

        monthly_by_type = sorted(
            monthly_stats.values(),
            key=lambda x: (x['month_year'], x['transaction_type']),
            reverse=True
        )

        return jsonify({'by_type': by_type, 'monthly_by_type': monthly_by_type})

    except Error as e:
        current_app.logger.error('transaction_query db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
