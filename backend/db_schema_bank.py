"""Schema initialization for bank and transaction tables."""
from mysql.connector import Error


def init_bank_tables(cursor, connection):
    """Create and migrate bank_transactions, transaction_tabs, and audit_log tables."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bank_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_number VARCHAR(50),
            transaction_date DATE NOT NULL,
            description VARCHAR(500) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            month_year VARCHAR(7) NOT NULL,
            transaction_type VARCHAR(20) DEFAULT 'credit',
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_transaction_date (transaction_date),
            INDEX idx_month_year (month_year),
            INDEX idx_account (account_number),
            INDEX idx_transaction_type (transaction_type)
        )
    """)

    for col, col_def, label in [
        ("transaction_type", "VARCHAR(20) DEFAULT 'credit'", "transaction_type"),
        ("uploaded_by", "VARCHAR(255)", "uploaded_by"),
        ("tab_id", "INT", "tab_id"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE bank_transactions ADD COLUMN {col} {col_def}")
            print(f"Added {label} column to bank_transactions")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Note: {e}")

    for idx_name, idx_col in [
        ("idx_uploaded_by", "uploaded_by"),
        ("idx_tab_id", "tab_id"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE bank_transactions ADD INDEX {idx_name} ({idx_col})")
            print(f"Added {idx_name} index to bank_transactions")
        except Error as e:
            if 'Duplicate key' not in str(e):
                print(f"Note: {e}")

    # Migrate to encrypted TEXT fields
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

    # Migrate transaction_type from ENUM to VARCHAR to support transfer_in/transfer_out
    try:
        cursor.execute(
            "ALTER TABLE bank_transactions MODIFY COLUMN transaction_type VARCHAR(20) DEFAULT 'credit'"
        )
        print("Migrated transaction_type to VARCHAR(20)")
    except Error as e:
        if 'already' not in str(e).lower():
            print(f"Migration note (transaction_type): {e}")

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budget_bank_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            budget_tab_id INT NOT NULL,
            transaction_tab_id INT NOT NULL,
            owner VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_budget_tx_link (budget_tab_id, transaction_tab_id),
            INDEX idx_bbl_owner (owner)
        )
    """)
    print("Created budget_bank_links table")

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
