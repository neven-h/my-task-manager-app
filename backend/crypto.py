"""
Data encryption/decryption helpers and bank transaction audit logging.
"""
import os
import base64

from cryptography.fernet import Fernet
from flask import request

from auth_utils import IS_CI


# ==================== ENCRYPTION SETUP ====================

if IS_CI:
    DATA_ENCRYPTION_KEY = base64.urlsafe_b64encode(b'0' * 32)
else:
    encryption_key = os.getenv('DATA_ENCRYPTION_KEY')
    if not encryption_key:
        raise ValueError("DATA_ENCRYPTION_KEY environment variable must be set for production")
    try:
        DATA_ENCRYPTION_KEY = encryption_key.encode()
        Fernet(DATA_ENCRYPTION_KEY)  # Validate key
    except Exception:
        raise ValueError(
            "DATA_ENCRYPTION_KEY is invalid. "
            "Generate with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )

cipher_suite = Fernet(DATA_ENCRYPTION_KEY)


# ==================== ENCRYPT / DECRYPT ====================

def encrypt_field(value: str) -> str:
    """Encrypt a sensitive field value."""
    if not value:
        return value
    try:
        encrypted = cipher_suite.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {e}")
        raise


def decrypt_field(encrypted_value: str) -> str:
    """Decrypt a sensitive field value. Returns plaintext on success, original on failure."""
    if not encrypted_value:
        return encrypted_value
    try:
        decoded = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
        decrypted = cipher_suite.decrypt(decoded)
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption warning: {e}")
        return encrypted_value  # Return as-is for legacy plaintext migration


# ==================== AUDIT LOGGING ====================

def log_bank_transaction_access(username: str, action: str, transaction_ids: str = None, month_year: str = None):
    """Log access to bank transactions for security audit."""
    # Import here to avoid circular dependency (db imports nothing from crypto)
    from db import get_db_connection
    try:
        ip_address = request.remote_addr if request else None
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO bank_transaction_audit_log
                (username, action, transaction_ids, month_year, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, action, transaction_ids, month_year, ip_address))
            connection.commit()
    except Exception as e:
        print(f"Audit logging error: {e}")
