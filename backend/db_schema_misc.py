"""Schema initialization for tags, categories, and clients tables."""
import logging

from mysql.connector import Error

logger = logging.getLogger(__name__)


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
        logger.info("Added owner column to tags table")
    except Error as e:
        if 'Duplicate column' not in str(e):
            logger.warning("Tags owner column migration note: %s", e)

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
        logger.info("Added owner column to categories_master table")
    except Error as e:
        if 'Duplicate column' not in str(e):
            logger.warning("Categories owner column migration note: %s", e)

    cursor.execute("SELECT COUNT(*) AS cnt FROM categories_master")
    if cursor.fetchone()['cnt'] == 0:
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
        logger.info("Inserted default categories")

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
        logger.info("Added owner column to clients table")
    except Error as e:
        if 'Duplicate column' not in str(e):
            logger.warning("Clients owner column migration note: %s", e)

    # ── budget_entries ────────────────────────────────────────────────────────
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budget_entries (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                type        ENUM('income','outcome') NOT NULL,
                description VARCHAR(500) NOT NULL,
                amount      DECIMAL(12,2) NOT NULL,
                entry_date  DATE NOT NULL,
                category    VARCHAR(100),
                notes       TEXT,
                owner       VARCHAR(255),
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_budget_owner (owner),
                INDEX idx_budget_date  (entry_date)
            )
        """)
        logger.info("budget_entries table ready")
    except Error as e:
        logger.error("Failed to create budget_entries table: %s", e, exc_info=True)
        raise
