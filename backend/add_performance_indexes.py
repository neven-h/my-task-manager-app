#!/usr/bin/env python3
"""
Script to add performance indexes to the database.
This ensures all foreign key and commonly-filtered columns have proper indexes.
"""
from db import get_db_connection
from mysql.connector import Error
import re

# Regex pattern for valid SQL identifiers (table names, column names, index names)
VALID_IDENTIFIER = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

def is_valid_identifier(name):
    """Validate that a name is a safe SQL identifier"""
    return bool(VALID_IDENTIFIER.match(name)) and len(name) <= 64

def add_missing_indexes():
    """Add missing performance indexes to database tables."""
    print("Checking and adding missing performance indexes...")
    
    # Define indexes to ensure exist
    # Format: (table_name, index_name, column_name)
    indexes_to_check = [
        ('tasks', 'idx_created_by', 'created_by'),
        ('bank_transactions', 'idx_uploaded_by', 'uploaded_by'),
        ('bank_transactions', 'idx_tab_id', 'tab_id'),
        ('stock_portfolio', 'idx_created_by', 'created_by'),
        ('stock_portfolio', 'idx_tab_id', 'tab_id'),
        ('portfolio_tabs', 'idx_owner', 'owner'),
        ('transaction_tabs', 'idx_owner', 'owner'),
    ]
    
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            for table_name, index_name, column_name in indexes_to_check:
                # Validate all identifiers to prevent SQL injection
                if not all(is_valid_identifier(x) for x in [table_name, index_name, column_name]):
                    print(f"✗ Skipping invalid identifier: table={table_name}, index={index_name}, column={column_name}")
                    continue
                
                # Check if index exists
                cursor.execute(
                    "SELECT COUNT(*) as count FROM information_schema.STATISTICS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND INDEX_NAME = %s",
                    (table_name, index_name)
                )
                index_exists = cursor.fetchone()['count'] > 0
                
                if not index_exists:
                    try:
                        # Safe to use f-string now that we've validated identifiers
                        cursor.execute(f"CREATE INDEX {index_name} ON {table_name}({column_name})")
                        connection.commit()
                        print(f"✓ Added index {index_name} on {table_name}.{column_name}")
                    except Error as e:
                        if 'Duplicate key' in str(e) or 'already exists' in str(e):
                            print(f"  Index {index_name} on {table_name} already exists")
                        else:
                            print(f"✗ Error adding index {index_name}: {e}")
                else:
                    print(f"  Index {index_name} on {table_name}.{column_name} already exists")
            
            print("\nPerformance indexes check completed!")
            
    except Error as e:
        print(f"Database error: {e}")
        return False
    
    return True

if __name__ == '__main__':
    success = add_missing_indexes()
    exit(0 if success else 1)
