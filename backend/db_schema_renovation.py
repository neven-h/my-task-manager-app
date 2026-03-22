"""Schema initialization for renovation tracker tables."""
from mysql.connector import Error


def init_renovation_tables(cursor, connection):
    """Create renovation_items and renovation_payments tables."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS renovation_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner VARCHAR(255) NOT NULL,
            name VARCHAR(500) NOT NULL,
            area VARCHAR(200),
            contractor VARCHAR(255),
            status ENUM('planned','in_progress','done') DEFAULT 'planned',
            estimated_cost DECIMAL(12,2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_reno_owner (owner)
        )
    """)
    print("Created renovation_items table")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS renovation_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            owner VARCHAR(255) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payment_date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES renovation_items(id) ON DELETE CASCADE,
            INDEX idx_reno_pay_item (item_id),
            INDEX idx_reno_pay_owner (owner)
        )
    """)
    print("Created renovation_payments table")

    # Idempotent migrations (future columns go here)
    for col, col_def, label in []:
        try:
            cursor.execute(f"ALTER TABLE renovation_items ADD COLUMN {col} {col_def}")
            print(f"Added {label} column to renovation_items")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Note: {e}")

    connection.commit()
