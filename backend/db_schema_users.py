"""Schema initialization for user-related tables."""
from mysql.connector import Error


def init_users_tables(cursor, connection):
    """Create and migrate users and password_reset_tokens tables."""
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
