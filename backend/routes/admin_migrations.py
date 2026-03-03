from flask import Blueprint, jsonify, current_app
from config import (
    get_db_connection, admin_required,
    encrypt_field, decrypt_field,
    log_bank_transaction_access,
)
from mysql.connector import Error

admin_migrations_bp = Blueprint('admin_migrations', __name__)


@admin_migrations_bp.route('/api/migrate-encrypt-transactions', methods=['POST'])
@admin_required
def migrate_encrypt_transactions(payload):
    """
    CRITICAL SECURITY MIGRATION: Encrypt existing bank transaction data.
    Only needs to be run ONCE after deploying encryption changes.
    WARNING: Ensure DATA_ENCRYPTION_KEY is properly backed up before running!
    """
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

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
                    decrypt_field(trans['account_number'])
                    decrypt_field(trans['description'])
                    decrypt_field(trans['amount'])
                    already_encrypted_count += 1
                    continue
                except:
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

            log_bank_transaction_access(
                username='system',
                action='ENCRYPT_MIGRATION',
                transaction_ids=f"Encrypted: {encrypted_count}, Already encrypted: {already_encrypted_count}"
            )

            return jsonify({
                'success': True,
                'message': 'Migration completed successfully',
                'encrypted_count': encrypted_count,
                'already_encrypted_count': already_encrypted_count,
                'total_transactions': len(transactions)
            })

    except Exception as e:
        current_app.logger.error('admin encrypt migration error: %s', e, exc_info=True)
        return jsonify({'error': 'Migration failed'}), 500


@admin_migrations_bp.route('/api/admin/migrate-db', methods=['POST'])
@admin_required
def migrate_database(payload):
    """Manual database migration endpoint to add missing columns"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            migrations_applied = []

            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN ticker_symbol VARCHAR(20)")
                    connection.commit()
                    migrations_applied.append('ticker_symbol')
            except Exception as e:
                current_app.logger.error('admin migrate-db ticker_symbol error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add ticker_symbol column'}), 500

            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'currency'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN currency VARCHAR(3) DEFAULT 'ILS'")
                    connection.commit()
                    migrations_applied.append('currency')
            except Exception as e:
                current_app.logger.error('admin migrate-db currency error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add currency column'}), 500

            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN units DECIMAL(12,4) DEFAULT 1")
                    connection.commit()
                    migrations_applied.append('units')
            except Exception as e:
                current_app.logger.error('admin migrate-db units error: %s', e, exc_info=True)
                return jsonify({'error': 'Failed to add units column'}), 500

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
