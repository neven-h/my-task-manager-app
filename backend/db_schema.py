"""Orchestrates database schema initialization across all domain modules."""
import mysql.connector
from mysql.connector import Error

from db import DB_CONFIG, sanitize_db_name
from db_schema_tasks import init_tasks_tables
from db_schema_bank import init_bank_tables
from db_schema_users import init_users_tables
from db_schema_portfolio import init_portfolio_tables
from db_schema_misc import init_misc_tables
from db_schema_renovation import init_renovation_tables


def init_db():
    """Initialize database and create all tables. -> True on success."""
    connection = None
    cursor = None
    try:
        temp_config = DB_CONFIG.copy()
        db_name = sanitize_db_name(temp_config.pop('database'))

        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor(dictionary=True)

        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.execute(f"USE `{db_name}`")

        init_tasks_tables(cursor, connection)
        init_bank_tables(cursor, connection)
        init_users_tables(cursor, connection)
        init_portfolio_tables(cursor, connection)
        init_misc_tables(cursor, connection)
        init_renovation_tables(cursor, connection)
        from rekey import rekey_all  # needs DATA_ENCRYPTION_KEY; import lazily
        rekey_all(cursor)  # legacy plaintext and a key rotation, every boot

        connection.commit()
        print("Database initialized successfully")
        return True

    except Error as e:
        print(f"Error initializing database: {e}")
        return False
    finally:
        if connection and connection.is_connected():
            if cursor:
                cursor.close()
            connection.close()
