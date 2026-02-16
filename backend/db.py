"""
Database configuration, connection pool, and schema initialization.
"""
import time
import os
import re

import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool
from contextlib import contextmanager


# ==================== DB CONFIG ====================

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'task_tracker'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

DB_NAME_PATTERN = re.compile(r'^[A-Za-z0-9_]+$')


def sanitize_db_name(name: str) -> str:
    """Ensure database name only contains safe characters."""
    if not name or not DB_NAME_PATTERN.fullmatch(name):
        raise ValueError('Invalid database name; use letters, numbers, and underscores only')
    return name


# ==================== CONNECTION POOL ====================

def _get_validated_pool_size():
    """Get and validate the DB_POOL_SIZE environment variable."""
    try:
        size = int(os.getenv('DB_POOL_SIZE', 5))
        if size < 1:
            print(f"Warning: DB_POOL_SIZE must be at least 1, using default of 5")
            return 5
        if size > 32:
            print(f"Warning: DB_POOL_SIZE {size} is very large, consider reducing for stability")
        return size
    except ValueError:
        print(f"Warning: Invalid DB_POOL_SIZE value, using default of 5")
        return 5


DB_POOL_SIZE = _get_validated_pool_size()
_db_pool = None

DB_CONNECT_MAX_RETRIES = int(os.getenv('DB_CONNECT_MAX_RETRIES', 3))
DB_CONNECT_BASE_DELAY = float(os.getenv('DB_CONNECT_BASE_DELAY', 1.0))


def _get_db_pool():
    """Lazily initialize and return the database connection pool."""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = MySQLConnectionPool(
                pool_name="task_tracker_pool",
                pool_size=DB_POOL_SIZE,
                pool_reset_session=True,
                **DB_CONFIG
            )
            print(f"Database connection pool initialized (size: {DB_POOL_SIZE})")
        except Error as e:
            print(f"Failed to create connection pool: {e}")
            return None
    return _db_pool


def _reset_db_pool():
    """Reset the connection pool so it will be re-created on next use."""
    global _db_pool
    _db_pool = None


@contextmanager
def get_db_connection():
    """Context manager for database connections with retry logic and connection pooling."""
    connection = None
    last_error = None

    for attempt in range(DB_CONNECT_MAX_RETRIES):
        try:
            pool = _get_db_pool()
            if pool:
                connection = pool.get_connection()
            else:
                connection = mysql.connector.connect(**DB_CONFIG)
            break
        except Error as e:
            last_error = e
            _reset_db_pool()
            if attempt < DB_CONNECT_MAX_RETRIES - 1:
                delay = DB_CONNECT_BASE_DELAY * (2 ** attempt)
                print(f"Database connection attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)

    if connection is None:
        print(f"Database connection failed after {DB_CONNECT_MAX_RETRIES} attempts: {last_error}")
        raise last_error

    try:
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()


# ==================== SCHEMA INITIALIZATION ====================

def init_db():
    """Initialize database and create tables."""
    connection = None
    cursor = None
    try:
        temp_config = DB_CONFIG.copy()
        db_name = sanitize_db_name(temp_config.pop('database'))

        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor(dictionary=True)

        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.execute(f"USE `{db_name}`")

        # Create tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL,
                client VARCHAR(255),
                task_date DATE NOT NULL,
                task_time TIME,
                duration DECIMAL(5, 2),
                status ENUM('completed', 'uncompleted') DEFAULT 'uncompleted',
                categories TEXT,
                tags TEXT,
                notes TEXT,
                shared BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date (task_date),
                INDEX idx_category (category),
                INDEX idx_status (status),
                INDEX idx_client (client),
                INDEX idx_shared (shared),
                FULLTEXT idx_search (title, description, notes)
            )
        """)

        for col, col_def, label in [
            ("shared", "BOOLEAN DEFAULT FALSE", "shared"),
            ("created_by", "VARCHAR(255)", "created_by"),
            ("is_draft", "BOOLEAN DEFAULT FALSE", "is_draft"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col} {col_def}")
                print(f"Added {label} column to tasks")
            except Error as e:
                if 'Duplicate column' not in str(e):
                    print(f"Note: {e}")

        for idx_name, idx_col in [
            ("idx_shared", "shared"),
            ("idx_created_by", "created_by"),
            ("idx_draft", "is_draft"),
        ]:
            try:
                cursor.execute(f"CREATE INDEX {idx_name} ON tasks({idx_col})")
                print(f"Added index {idx_name}")
            except Error as e:
                if 'Duplicate' not in str(e):
                    print(f"Note: {e}")

        # Create task_attachments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255),
                content_type VARCHAR(100),
                file_size INT,
                cloudinary_url VARCHAR(1024) DEFAULT NULL,
                cloudinary_public_id VARCHAR(512) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_task_id (task_id),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        """)
        print("Created task_attachments table")

        try:
            cursor.execute("""
                ALTER TABLE task_attachments
                ADD COLUMN cloudinary_url VARCHAR(1024) DEFAULT NULL,
                ADD COLUMN cloudinary_public_id VARCHAR(512) DEFAULT NULL
            """)
            print("Added cloudinary columns to task_attachments")
        except Exception as e:
            print(f"Note: {e}")

        # Create bank_transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bank_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_number VARCHAR(50),
                transaction_date DATE NOT NULL,
                description VARCHAR(500) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                month_year VARCHAR(7) NOT NULL,
                transaction_type ENUM('credit', 'cash') DEFAULT 'credit',
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_transaction_date (transaction_date),
                INDEX idx_month_year (month_year),
                INDEX idx_account (account_number),
                INDEX idx_transaction_type (transaction_type)
            )
        """)

        for col, col_def, label in [
            ("transaction_type", "ENUM('credit', 'cash') DEFAULT 'credit'", "transaction_type"),
            ("uploaded_by", "VARCHAR(255)", "uploaded_by"),
            ("tab_id", "INT", "tab_id"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE bank_transactions ADD COLUMN {col} {col_def}")
                print(f"Added {label} column to bank_transactions")
            except Error as e:
                if 'Duplicate column' not in str(e):
                    print(f"Note: {e}")

        try:
            cursor.execute("ALTER TABLE bank_transactions ADD INDEX idx_uploaded_by (uploaded_by)")
            print("Added uploaded_by index to bank_transactions")
        except Error as e:
            if 'Duplicate key' not in str(e):
                print(f"Note: {e}")

        try:
            cursor.execute("ALTER TABLE bank_transactions ADD INDEX idx_tab_id (tab_id)")
            print("Added tab_id index to bank_transactions")
        except Error as e:
            if 'Duplicate key' not in str(e):
                print(f"Note: {e}")

        # Migrate bank_transactions to support encrypted TEXT fields
        for idx_name in ('idx_account',):
            try:
                cursor.execute(f"DROP INDEX {idx_name} ON bank_transactions")
                print(f"Dropped index {idx_name}")
            except Error:
                pass

        for col, col_def in (
            ('account_number', 'TEXT'),
            ('description', 'TEXT'),
            ('amount', 'TEXT'),
        ):
            try:
                cursor.execute(f"ALTER TABLE bank_transactions MODIFY COLUMN {col} {col_def}")
                print(f"Migrated bank_transactions.{col} to {col_def}")
            except Error as e:
                if 'already' not in str(e).lower():
                    print(f"Migration note ({col}): {e}")

        # Create transaction_tabs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transaction_tabs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_owner (owner)
            )
        """)
        print("Created transaction_tabs table")

        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'shared', 'limited') DEFAULT 'limited',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_email (email),
                INDEX idx_username (username)
            )
        """)
        print("Created users table")

        # Create password_reset_tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_expires (expires_at),
                INDEX idx_user_id (user_id)
            )
        """)
        print("Created password_reset_tokens table")

        # Add 2FA columns to users
        for col, col_def, label in [
            ("two_factor_secret", "VARCHAR(32)", "two_factor_secret"),
            ("two_factor_enabled", "BOOLEAN DEFAULT FALSE", "two_factor_enabled"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_def}")
                print(f"Added {label} column to users table")
            except Error as e:
                if 'Duplicate column' not in str(e):
                    print(f"2FA column migration note: {e}")

        # Create bank_transaction_audit_log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bank_transaction_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                action VARCHAR(50) NOT NULL,
                transaction_ids TEXT,
                month_year VARCHAR(7),
                ip_address VARCHAR(45),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_timestamp (timestamp),
                INDEX idx_action (action)
            )
        """)
        print("Created bank_transaction_audit_log table")

        # Create tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                color VARCHAR(7) DEFAULT '#0d6efd',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_name (name)
            )
        """)

        try:
            cursor.execute("ALTER TABLE tags ADD COLUMN owner VARCHAR(255)")
            print("Added owner column to tags table")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Tags owner column migration note: {e}")

        # Create categories_master table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id VARCHAR(50) NOT NULL UNIQUE,
                label VARCHAR(100) NOT NULL,
                color VARCHAR(7) DEFAULT '#0d6efd',
                icon VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_category_id (category_id)
            )
        """)

        try:
            cursor.execute("ALTER TABLE categories_master ADD COLUMN owner VARCHAR(255)")
            print("Added owner column to categories_master table")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Categories owner column migration note: {e}")

        cursor.execute("SELECT COUNT(*) FROM categories_master")
        if cursor.fetchone()[0] == 0:
            default_categories = [
                ('insurance', 'Insurance Lawsuits', '#0d6efd', '⚖️'),
                ('emails', 'Email Management', '#6610f2', '📧'),
                ('customer-support', 'Customer Support', '#0dcaf0', '🎧'),
                ('banking', 'Bank Accounts', '#198754', '🏦'),
                ('scheduling', 'Scheduling', '#ffc107', '📅'),
                ('documentation', 'Documentation', '#fd7e14', '📄'),
                ('phone-calls', 'Phone Calls', '#20c997', '📞'),
                ('research', 'Research', '#6f42c1', '🔍'),
                ('nursing', 'Nursing', '#d63384', '⚕️'),
                ('moshe', 'Moshe', '#dc3545', '👤'),
                ('other', 'Other Tasks', '#6c757d', '📝')
            ]
            cursor.executemany("""
                INSERT INTO categories_master (category_id, label, color, icon)
                VALUES (%s, %s, %s, %s)
            """, default_categories)
            print("Inserted default categories")

        # Create clients table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255),
                phone VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name)
            )
        """)

        try:
            cursor.execute("ALTER TABLE clients ADD COLUMN owner VARCHAR(255)")
            print("Added owner column to clients table")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Clients owner column migration note: {e}")

        # Create portfolio_tabs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_tabs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_owner (owner)
            )
        """)
        print("Created portfolio_tabs table")

        # Create stock_portfolio table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stock_portfolio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                ticker_symbol VARCHAR(20),
                percentage DECIMAL(5,2),
                value_ils DECIMAL(12,2) NOT NULL,
                base_price DECIMAL(12,2),
                entry_date DATE NOT NULL,
                tab_id INT,
                currency VARCHAR(3) DEFAULT 'ILS',
                units DECIMAL(12,4) DEFAULT 1,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_entry_date (entry_date),
                INDEX idx_name (name),
                INDEX idx_ticker_symbol (ticker_symbol),
                INDEX idx_created_by (created_by),
                INDEX idx_tab_id (tab_id),
                FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE
            )
        """)
        print("Created stock_portfolio table")

        # Check and add optional stock_portfolio columns
        for col, col_def in [
            ('tab_id', 'INT'),
            ('base_price', 'DECIMAL(12,2)'),
            ('ticker_symbol', 'VARCHAR(20)'),
            ('currency', "VARCHAR(3) DEFAULT 'ILS'"),
            ('units', 'DECIMAL(12,4) DEFAULT 1'),
        ]:
            try:
                cursor.execute(f"SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = '{col}'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute(f"ALTER TABLE stock_portfolio ADD COLUMN {col} {col_def}")
                    connection.commit()
                    print(f"Added {col} column to stock_portfolio")
            except Exception as e:
                print(f"Note: {col} column check/add failed (may already exist): {e}")

        for idx_name, idx_col in [('idx_tab_id', 'tab_id'), ('idx_ticker_symbol', 'ticker_symbol')]:
            try:
                cursor.execute(f"SHOW INDEX FROM stock_portfolio WHERE Key_name = '{idx_name}'")
                if cursor.fetchone() is None:
                    cursor.execute(f"ALTER TABLE stock_portfolio ADD INDEX {idx_name} ({idx_col})")
                    connection.commit()
            except Exception as e:
                print(f"Note: {idx_name} index may already exist: {e}")

        try:
            cursor.execute("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME LIKE '%tab_id%'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE stock_portfolio ADD FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE")
                connection.commit()
        except Exception as e:
            print(f"Note: Foreign key constraint may already exist: {e}")

        # Create watched_stocks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watched_stocks (
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
        print("Created watched_stocks table")

        # Create yahoo_portfolio table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yahoo_portfolio (
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
        print("Created yahoo_portfolio table")

        connection.commit()
        print("Database initialized successfully")

    except Error as e:
        print(f"Error initializing database: {e}")
    finally:
        if connection and connection.is_connected():
            if cursor:
                cursor.close()
            connection.close()
