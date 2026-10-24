"""Bring every encrypted value to the current DATA_ENCRYPTION_KEY.

init_db runs this once per deploy (db_setup.py). Outside a rotation it only encrypts legacy
plaintext left from before encryption at rest (decrypt_field no longer passes
it through). During one (DATA_ENCRYPTION_KEY_PREVIOUS set beside a new
DATA_ENCRYPTION_KEY) it also rewrites what the old key made. Idempotent: a
value already under the current key is left alone. When the deploy log shows
nothing left under the old key, delete DATA_ENCRYPTION_KEY_PREVIOUS.
"""
from cryptography.fernet import InvalidToken

from crypto import rekey_value

# Every column encrypt_field writes.
ENCRYPTED = {
    'bank_transactions': ('account_number', 'description', 'amount'),
    'users': ('two_factor_secret',),
}


def rekey_table(cursor, table, columns):
    """-> (rows rewritten, values no key opens). The caller commits."""
    cursor.execute(f"SELECT id, {', '.join(columns)} FROM {table}")
    rewritten = unreadable = 0
    for row in cursor.fetchall():
        changes = {}
        for column in columns:
            try:
                if (new := rekey_value(row[column])) is not None:
                    changes[column] = new
            except (InvalidToken, ValueError):
                unreadable += 1
        if changes:
            sets = ', '.join(f"{c} = %s" for c in changes)
            cursor.execute(f"UPDATE {table} SET {sets} WHERE id = %s", (*changes.values(), row['id']))
            rewritten += 1
    return rewritten, unreadable


def rekey_all(cursor):
    """-> {table: (rewritten, unreadable)}, printed for the boot log."""
    report = {table: rekey_table(cursor, table, columns) for table, columns in ENCRYPTED.items()}
    if any(sum(counts) for counts in report.values()):
        print(f"rekey: (rows rewritten, values no key opens) per table: {report}")
    return report
