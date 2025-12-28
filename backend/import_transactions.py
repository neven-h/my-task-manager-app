#!/usr/bin/env python3
"""
Import transactions from CSV files into the database
"""
# noinspection SqlNoDataSourceInspection,SqlResolve
import mysql.connector
from mysql.connector import Error
import csv
import os
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'task_tracker'
}

def parse_hebrew_date(date_str):
    """Convert Hebrew date format (DD.MM.YYYY) to YYYY-MM-DD"""
    try:
        parts = date_str.split('.')
        if len(parts) == 3:
            day, month, year = parts
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except:
        pass
    return None

def import_csv_file(filepath, account_number=''):
    """Import a single CSV file"""
    connection = None
    imported = 0
    skipped = 0

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        print(f"\nImporting: {os.path.basename(filepath)}")

        with open(filepath, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                try:
                    # Handle Hebrew headers
                    if 'תאריך' in row:
                        date_str = row['תאריך']
                        description = row.get('שם בית עסק', '')
                        amount_str = row.get('סכום קנייה', '0')
                        card_number = row.get('שם כרטיס', account_number)
                    else:
                        # Try English headers
                        date_str = row.get('date', row.get('Date', ''))
                        description = row.get('description', row.get('Description', ''))
                        amount_str = row.get('amount', row.get('Amount', '0'))
                        card_number = row.get('account', row.get('Account', account_number))

                    # Parse date
                    transaction_date = parse_hebrew_date(date_str)
                    if not transaction_date:
                        print(f"  Skipping row with invalid date: {date_str}")
                        skipped += 1
                        continue

                    # Parse amount
                    amount = float(amount_str.replace(',', ''))

                    # Calculate month_year
                    month_year = transaction_date[:7]  # YYYY-MM

                    # Insert transaction
                    query = """
                        INSERT INTO transactions
                        (transaction_date, month_year, description, amount, account_number)
                        VALUES (%s, %s, %s, %s, %s)
                    """

                    cursor.execute(query, (
                        transaction_date,
                        month_year,
                        description.strip(),
                        amount,
                        str(card_number).strip()
                    ))

                    imported += 1

                except Exception as e:
                    print(f"  Error importing row: {e}")
                    skipped += 1
                    continue

        connection.commit()
        print(f"  ✅ Imported: {imported} transactions")
        if skipped > 0:
            print(f"  ⚠️  Skipped: {skipped} rows")

    except Error as e:
        print(f"  ❌ Database error: {e}")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

    return imported, skipped

def main():
    """Import all CSV files from csv_files directory"""
    csv_dir = '/Users/pit/PycharmProjects/My Task Manager App/csv_files'

    if not os.path.exists(csv_dir):
        print(f"Directory not found: {csv_dir}")
        return

    print("=" * 60)
    print("TRANSACTION IMPORT TOOL")
    print("=" * 60)

    total_imported = 0
    total_skipped = 0

    # Get all CSV files
    csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]

    if not csv_files:
        print("No CSV files found!")
        return

    print(f"\nFound {len(csv_files)} CSV files\n")

    for filename in sorted(csv_files):
        filepath = os.path.join(csv_dir, filename)
        imported, skipped = import_csv_file(filepath)
        total_imported += imported
        total_skipped += skipped

    print("\n" + "=" * 60)
    print(f"TOTAL: {total_imported} transactions imported")
    if total_skipped > 0:
        print(f"       {total_skipped} rows skipped")
    print("=" * 60)

if __name__ == '__main__':
    main()
