"""
Database configuration and connection pool.

Schema initialization lives in db_schema.py (orchestrator) and the
domain-specific db_schema_*.py modules.
"""
import time
import os
import re

import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool
from contextlib import contextmanager


# ==================== DB CONFIG ====================

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'task_tracker'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

DB_NAME_PATTERN = re.compile(r'^[A-Za-z0-9_]+$')


def sanitize_db_name(name: str) -> str:
    """Ensure database name only contains safe characters."""
    if not name or not DB_NAME_PATTERN.fullmatch(name):
        raise ValueError('Invalid database name; use letters, numbers, and underscores only')
    return name


# ==================== CONNECTION POOL ====================

def _get_validated_pool_size():
    """Get and validate the DB_POOL_SIZE environment variable."""
    try:
        size = int(os.getenv('DB_POOL_SIZE', 5))
        if size < 1:
            print(f"Warning: DB_POOL_SIZE must be at least 1, using default of 5")
            return 5
        if size > 32:
            print(f"Warning: DB_POOL_SIZE {size} is very large, consider reducing for stability")
        return size
    except ValueError:
        print(f"Warning: Invalid DB_POOL_SIZE value, using default of 5")
        return 5


DB_POOL_SIZE = _get_validated_pool_size()
_db_pool = None

DB_CONNECT_MAX_RETRIES = int(os.getenv('DB_CONNECT_MAX_RETRIES', 3))
DB_CONNECT_BASE_DELAY = float(os.getenv('DB_CONNECT_BASE_DELAY', 1.0))


def _get_db_pool():
    """Lazily initialize and return the database connection pool."""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = MySQLConnectionPool(
                pool_name="task_tracker_pool",
                pool_size=DB_POOL_SIZE,
                pool_reset_session=True,
                **DB_CONFIG
            )
            print(f"Database connection pool initialized (size: {DB_POOL_SIZE})")
        except Error as e:
            print(f"Failed to create connection pool: {e}")
            return None
    return _db_pool


def _reset_db_pool():
    """Reset the connection pool so it will be re-created on next use."""
    global _db_pool
    _db_pool = None


@contextmanager
def get_db_connection():
    """Context manager for database connections with retry logic and connection pooling."""
    connection = None
    last_error = None

    for attempt in range(DB_CONNECT_MAX_RETRIES):
        try:
            pool = _get_db_pool()
            if pool:
                connection = pool.get_connection()
            else:
                connection = mysql.connector.connect(**DB_CONFIG)
            break
        except Error as e:
            last_error = e
            _reset_db_pool()
            if attempt < DB_CONNECT_MAX_RETRIES - 1:
                delay = DB_CONNECT_BASE_DELAY * (2 ** attempt)
                print(f"Database connection attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)

    if connection is None:
        print(f"Database connection failed after {DB_CONNECT_MAX_RETRIES} attempts: {last_error}")
        raise last_error

    try:
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()


