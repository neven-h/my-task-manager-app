from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field
from mysql.connector import Error

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
