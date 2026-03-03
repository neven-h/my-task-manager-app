"""Schema initialization for portfolio and stock tables."""
from mysql.connector import Error


def init_portfolio_tables(cursor, connection):
    """Create and migrate portfolio_tabs, stock_portfolio, watched_stocks, yahoo_portfolio tables."""
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

    for col, col_def in [
        ('tab_id', 'INT'),
        ('base_price', 'DECIMAL(12,2)'),
        ('ticker_symbol', 'VARCHAR(20)'),
        ('currency', "VARCHAR(3) DEFAULT 'ILS'"),
        ('units', 'DECIMAL(12,4) DEFAULT 1'),
    ]:
        try:
            cursor.execute(
                "SELECT COUNT(*) as count FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' "
                f"AND COLUMN_NAME = '{col}'"
            )
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
        cursor.execute(
            "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' "
            "AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME LIKE '%tab_id%'"
        )
        if cursor.fetchone() is None:
            cursor.execute(
                "ALTER TABLE stock_portfolio "
                "ADD FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE"
            )
            connection.commit()
    except Exception as e:
        print(f"Note: Foreign key constraint may already exist: {e}")

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
