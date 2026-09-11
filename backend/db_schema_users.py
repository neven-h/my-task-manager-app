"""Schema initialization for user-related tables."""
import re

from mysql.connector import Error

# A raw TOTP seed is base32 (A-Z, 2-7). Stored secrets are Fernet ciphertext,
# which is base64 and always contains lowercase letters, so it never matches.
_PLAINTEXT_TOTP_SECRET = re.compile(r'^[A-Z2-7]+=*$')


def _encrypt_plaintext_2fa_secrets(cursor):
    """Encrypt any 2FA seeds stored before secrets were encrypted at rest."""
    from crypto import encrypt_field  # needs DATA_ENCRYPTION_KEY; import lazily
    cursor.execute("SELECT id, two_factor_secret FROM users WHERE two_factor_secret IS NOT NULL")
    legacy = [(encrypt_field(row['two_factor_secret']), row['id'])
              for row in cursor.fetchall()
              if _PLAINTEXT_TOTP_SECRET.match(row['two_factor_secret'])]
    if legacy:
        cursor.executemany("UPDATE users SET two_factor_secret = %s WHERE id = %s", legacy)
        print(f"Encrypted {len(legacy)} plaintext 2FA secret(s)")


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
        ("two_factor_secret", "VARCHAR(255)", "two_factor_secret"),
        ("two_factor_enabled", "BOOLEAN DEFAULT FALSE", "two_factor_enabled"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_def}")
            print(f"Added {label} column to users table")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"2FA column migration note: {e}")

    # Encrypted 2FA secrets are ~190 chars; older DBs have VARCHAR(32).
    try:
        cursor.execute("ALTER TABLE users MODIFY COLUMN two_factor_secret VARCHAR(255)")
        _encrypt_plaintext_2fa_secrets(cursor)
    except Error as e:
        print(f"2FA secret encryption migration note: {e}")

    # Migrate password_reset_tokens: add 'used' column if missing
    try:
        cursor.execute("ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE")
        print("Added used column to password_reset_tokens")
    except Error as e:
        if 'Duplicate column' not in str(e):
            print(f"password_reset_tokens migration note: {e}")
