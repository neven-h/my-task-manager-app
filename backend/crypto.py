"""
Data encryption/decryption helpers and bank transaction audit logging.

Rotation: with DATA_ENCRYPTION_KEY_PREVIOUS set beside a new
DATA_ENCRYPTION_KEY, everything writes with the new key and reads accept
either, until rekey.py (run by db_setup.py at every deploy) has rewritten what the
old one made. A value that opens under no key is an error, never data.
"""
import os
import base64
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from flask import request

from auth_utils import IS_CI


# ==================== ENCRYPTION SETUP ====================

_KEY_HELP = ("Generate with: python -c 'from cryptography.fernet import Fernet; "
             "print(Fernet.generate_key().decode())'")

# What encrypt_field stores: base64 of a Fernet token, which starts "gAAAAA".
TOKEN_PREFIX = base64.urlsafe_b64encode(b"gAAAAA").decode()


def _keys():
    """The key ring, current first: what writes, then what may still read."""
    if IS_CI and not os.getenv('DATA_ENCRYPTION_KEY'):
        current = base64.urlsafe_b64encode(b'0' * 32).decode()
    else:
        current = os.getenv('DATA_ENCRYPTION_KEY')
    if not current:
        raise ValueError("DATA_ENCRYPTION_KEY environment variable must be set for production")
    previous = os.getenv('DATA_ENCRYPTION_KEY_PREVIOUS')
    return [current] + ([previous] if previous else [])


@lru_cache(maxsize=1)
def _ring():
    try:
        return MultiFernet([Fernet(key.encode()) for key in _keys()])
    except (ValueError, TypeError):
        raise ValueError(f"DATA_ENCRYPTION_KEY or DATA_ENCRYPTION_KEY_PREVIOUS is invalid. {_KEY_HELP}")


@lru_cache(maxsize=1)
def _current():
    return Fernet(_keys()[0].encode())


_ring()  # fail at boot, not on the first request


# ==================== ENCRYPT / DECRYPT ====================

def encrypt_field(value: str) -> str:
    """Encrypt a sensitive field value."""
    if not value:
        return value
    return base64.urlsafe_b64encode(_ring().encrypt(value.encode())).decode('utf-8')


def decrypt_field(encrypted_value: str) -> str:
    """Decrypt a sensitive field value. Raises InvalidToken when no key in the
    ring opens it: ciphertext must never be shown, or saved again, as data."""
    if not encrypted_value:
        return encrypted_value
    token = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
    return _ring().decrypt(token).decode('utf-8')


def rekey_value(stored):
    """-> `stored` rewritten under the current key, or None when it already is.
    A value that is not one of our tokens is legacy plaintext and is encrypted.
    Raises InvalidToken for a token no key in the ring opens."""
    if not stored:
        return None
    if not stored.startswith(TOKEN_PREFIX):
        return encrypt_field(stored)
    token = base64.urlsafe_b64decode(stored.encode('utf-8'))
    try:
        _current().decrypt(token)
        return None
    except InvalidToken:
        return base64.urlsafe_b64encode(_ring().rotate(token)).decode('utf-8')


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
