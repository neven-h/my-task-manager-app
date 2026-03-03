"""Schema initialization for tags, categories, and clients tables."""
from mysql.connector import Error


def init_misc_tables(cursor, connection):
    """Create and migrate tags, categories_master, and clients tables."""
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
