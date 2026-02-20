from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, handle_error, DEBUG,
    encrypt_field, decrypt_field, cipher_suite,
    log_bank_transaction_access, init_db,
    admin_required,
)
from mysql.connector import Error

admin_bp = Blueprint('admin', __name__)

# ============ CLIENT MANAGEMENT ENDPOINTS ============

@admin_bp.route('/api/clients/manage', methods=['GET'])
@admin_required
def get_all_clients_with_stats(payload):
    """Get all clients with their billable hours statistics"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT client,
                                  COUNT(*)                                                     as task_count,
                                  SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as total_hours,
                                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)        as completed_tasks
                           FROM tasks
                           WHERE client IS NOT NULL
                             AND client != ''
                           GROUP BY client
                           ORDER BY client


                           """)

            clients = cursor.fetchall()

            # Convert Decimal to float for JSON serialization
            for client in clients:
                if client.get('total_hours') is not None:
                    client['total_hours'] = float(client['total_hours'])
                else:
                    client['total_hours'] = 0.0

            return jsonify(clients)

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>', methods=['PUT'])
@admin_required
def rename_client(payload, client_name):
    """Rename a client across all tasks"""
    try:
        data = request.json
        new_name = data.get('new_name')

        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("UPDATE tasks SET client = %s WHERE client = %s", (new_name, client_name))
            connection.commit()

            return jsonify({
                'message': f'Client renamed successfully',
                'updated_count': cursor.rowcount
            })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>', methods=['DELETE'])
@admin_required
def delete_client(payload, client_name):
    """Delete all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM tasks WHERE client = %s", (client_name,))
            connection.commit()

            return jsonify({
                'message': f'{cursor.rowcount} tasks deleted successfully'
            })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>/tasks', methods=['GET'])
@admin_required
def get_client_tasks(payload, client_name):
    """Get all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT *
                           FROM tasks
                           WHERE client = %s
                           ORDER BY task_date DESC, task_time DESC
                           """, (client_name,))

            tasks = cursor.fetchall()

            # Convert datetime objects to strings
            for task in tasks:
                if task.get('task_date'):
                    task['task_date'] = task['task_date'].strftime('%Y-%m-%d')
                if task.get('task_time'):
                    task['task_time'] = str(task['task_time'])

            return jsonify(tasks)

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/migrate-user-ownership', methods=['POST'])
@admin_required
def migrate_user_ownership(payload):
    """Add owner column to categories_master, tags, and clients tables for user isolation"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Add owner column to categories_master if it doesn't exist
            cursor.execute("""
                ALTER TABLE categories_master
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            # Add owner column to tags if it doesn't exist
            cursor.execute("""
                ALTER TABLE tags
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            # Add owner column to clients if it doesn't exist
            cursor.execute("""
                ALTER TABLE clients
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            connection.commit()

            return jsonify({
                'success': True,
                'message': 'Database migrated successfully - user ownership columns added'
            })

    except Error as e:
        current_app.logger.error('admin migration error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/migrate-encrypt-transactions', methods=['POST'])
@admin_required
def migrate_encrypt_transactions(payload):
    """
    CRITICAL SECURITY MIGRATION: Encrypt existing bank transaction data

    This endpoint encrypts all existing plaintext bank transactions.
    Only needs to be run ONCE after deploying encryption changes.

    WARNING: This operation cannot be easily reversed. Ensure DATA_ENCRYPTION_KEY
    is properly backed up before running!
    """
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get all transactions
            cursor.execute("""
                SELECT id, account_number, description, amount
                FROM bank_transactions
            """)
            transactions = cursor.fetchall()

            if not transactions:
                return jsonify({
                    'success': True,
                    'message': 'No transactions to encrypt',
                    'encrypted_count': 0
                })

            encrypted_count = 0
            already_encrypted_count = 0

            for trans in transactions:
                try:
                    # Try to decrypt - if it works, it's already encrypted
                    decrypt_field(trans['account_number'])
                    decrypt_field(trans['description'])
                    decrypt_field(trans['amount'])
                    already_encrypted_count += 1
                    continue
                except:
                    # Decryption failed, so it's plaintext - encrypt it
                    encrypted_account = encrypt_field(trans['account_number'] or '')
                    encrypted_description = encrypt_field(trans['description'])
                    encrypted_amount = encrypt_field(str(trans['amount']))

                    cursor.execute("""
                        UPDATE bank_transactions
                        SET account_number = %s,
                            description = %s,
                            amount = %s
                        WHERE id = %s
                    """, (encrypted_account, encrypted_description, encrypted_amount, trans['id']))

                    encrypted_count += 1

            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username='system',
                action='ENCRYPT_MIGRATION',
                transaction_ids=f"Encrypted: {encrypted_count}, Already encrypted: {already_encrypted_count}"
            )

            return jsonify({
                'success': True,
                'message': f'Migration completed successfully',
                'encrypted_count': encrypted_count,
                'already_encrypted_count': already_encrypted_count,
                'total_transactions': len(transactions)
            })

    except Exception as e:
        current_app.logger.error('admin encrypt migration error: %s', e, exc_info=True)
        return jsonify({'error': 'Migration failed'}), 500


# Initialize database on import (works with gunicorn)
try:
    init_db()
    print("✓ Database initialized successfully")
except Exception as e:
    print(f"⚠ Warning: Database initialization failed: {e}")
    print("⚠ App will start but database operations will fail until MySQL is configured")


@admin_bp.route('/api/admin/diagnose-tasks', methods=['GET'])
@admin_required
def diagnose_tasks(payload):
    """Show task counts grouped by created_by to identify orphaned (NULL) tasks."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT
                    COALESCE(created_by, '(NULL - orphaned)') AS created_by,
                    COUNT(*)           AS task_count,
                    MIN(task_date)     AS oldest,
                    MAX(task_date)     AS newest
                FROM tasks
                GROUP BY created_by
                ORDER BY task_count DESC
            """)
            rows = cursor.fetchall()
            for r in rows:
                if r.get('oldest'):
                    r['oldest'] = r['oldest'].isoformat()
                if r.get('newest'):
                    r['newest'] = r['newest'].isoformat()

            cursor.execute("SELECT COUNT(*) AS total FROM tasks")
            total = cursor.fetchone()['total']

            return jsonify({'total_tasks': total, 'breakdown': rows})

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/admin/repair-task-ownership', methods=['POST'])
@admin_required
def repair_task_ownership(payload):
    """
    Claim all tasks with created_by = NULL for the admin user.
    These are tasks created before JWT auth was added to the create endpoint.
    Safe to run multiple times (only affects NULL rows).
    """
    try:
        admin_username = payload['username']
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("""
                UPDATE tasks
                SET created_by = %s
                WHERE created_by IS NULL
            """, (admin_username,))
            connection.commit()
            claimed = cursor.rowcount

        return jsonify({
            'success': True,
            'claimed_tasks': claimed,
            'assigned_to': admin_username,
            'message': f'{claimed} orphaned task(s) assigned to {admin_username}'
        })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/admin/migrate-db', methods=['POST'])
@admin_required
def migrate_database(payload):
    """Manual database migration endpoint to add missing columns"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            migrations_applied = []
            
            # Check and add ticker_symbol
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN ticker_symbol VARCHAR(20)")
                    connection.commit()
                    migrations_applied.append('ticker_symbol')
            except Exception as e:
                current_app.logger.error('admin migrate-db ticker_symbol error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add ticker_symbol column'}), 500

            # Check and add currency
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'currency'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN currency VARCHAR(3) DEFAULT 'ILS'")
                    connection.commit()
                    migrations_applied.append('currency')
            except Exception as e:
                current_app.logger.error('admin migrate-db currency error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add currency column'}), 500

            # Check and add units
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN units DECIMAL(12,4) DEFAULT 1")
                    connection.commit()
                    migrations_applied.append('units')
            except Exception as e:
                current_app.logger.error('admin migrate-db units error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add units column'}), 500

            # Ensure watched_stocks table exists
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS watched_stocks
                    (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        ticker_symbol VARCHAR(20) NOT NULL,
                        stock_name VARCHAR(255),
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_user_ticker (username, ticker_symbol),
                        INDEX idx_username (username),
                        INDEX idx_ticker_symbol (ticker_symbol)
                    )
                """)
                connection.commit()
                migrations_applied.append('watched_stocks_table')
            except Exception as e:
                current_app.logger.error('admin migrate-db watched_stocks error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to create watched_stocks table'}), 500

            # Ensure yahoo_portfolio table exists
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS yahoo_portfolio
                    (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        ticker_symbol VARCHAR(20) NOT NULL,
                        stock_name VARCHAR(255),
                        quantity DECIMAL(14,4) DEFAULT 0,
                        avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                        currency VARCHAR(10) DEFAULT 'USD',
                        notes TEXT,
                        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                        INDEX idx_username (username)
                    )
                """)
                connection.commit()
                migrations_applied.append('yahoo_portfolio_table')
            except Exception as e:
                current_app.logger.error('admin migrate-db yahoo_portfolio error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to create yahoo_portfolio table'}), 500

            return jsonify({
                'message': 'Migration completed successfully',
                'migrations_applied': migrations_applied
            })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500

