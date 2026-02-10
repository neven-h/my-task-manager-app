from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, handle_error, token_required, DEBUG,
    encrypt_field, decrypt_field, log_bank_transaction_access,
    allowed_file, UPLOAD_FOLDER,
)
from decimal import Decimal
from mysql.connector import Error
from datetime import datetime, date
from werkzeug.utils import secure_filename
import pandas as pd
import chardet
import csv
import io
import os
import re
import json
import base64

transactions_bp = Blueprint('transactions', __name__)

# ============ BANK TRANSACTIONS ENDPOINTS ============

def clean_transaction_data(df):
    """Clean transaction data from uploaded file"""
    print(f"[CLEAN] Before cleaning: {len(df)} rows", flush=True)

    # Remove rows where all columns are empty
    df = df.dropna(how='all')
    print(f"[CLEAN] After removing empty rows: {len(df)} rows", flush=True)

    # Don't drop rows based on columns yet - let the main parser handle it
    # Just remove completely empty rows

    # Reset index
    df = df.reset_index(drop=True)

    print(f"[CLEAN] First 3 rows after cleaning:", flush=True)
    for i in range(min(3, len(df))):
        print(f"  Row {i}: {df.iloc[i].tolist()}", flush=True)

    return df


def parse_cash_transaction_file(file_path):
    """Parse CSV file for cash transactions (handles header row and different column orders)"""
    try:
        print(f"\n{'=' * 60}", flush=True)
        print(f"[CASH TRANSACTIONS] Starting to parse file", flush=True)

        # Try Hebrew encodings
        encodings_to_try = ['utf-8-sig', 'utf-8', 'windows-1255', 'cp1255', 'iso-8859-8']

        df = None
        for encoding in encodings_to_try:
            try:
                # Read with header to check column names
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"[SUCCESS] Read cash CSV with encoding: {encoding}", flush=True)
                print(f"[COLUMNS] Found columns: {list(df.columns)}", flush=True)
                break
            except Exception as e:
                print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                continue

        if df is None:
            df = pd.read_csv(file_path, encoding='utf-8', errors='replace')

        # Remove completely empty rows
        df = df.dropna(how='all')

        # Filter out rows that are totals (contain "סה״כ" anywhere)
        for col in df.columns:
            df = df[~df[col].astype(str).str.contains('סה״כ', na=False)]

        print(f"[CLEAN] After removing totals: {len(df)} rows", flush=True)

        if len(df) == 0:
            raise ValueError("No valid transactions found in file")

        # Try to identify columns by content or header names
        # Common Hebrew headers: שם כרטיס (card), תאריך (date), שם בית עסק (business), סכום קנייה (amount)
        date_col = None
        amount_col = None
        desc_col = None
        account_col = None

        # Check column headers for Hebrew names
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if 'תאריך' in col_str or 'date' in col_str.lower():
                date_col = i
            elif 'סכום' in col_str or 'amount' in col_str.lower():
                amount_col = i
            elif 'בית עסק' in col_str or 'description' in col_str.lower() or 'עסק' in col_str:
                desc_col = i
            elif 'כרטיס' in col_str or 'חשבון' in col_str or 'account' in col_str.lower():
                account_col = i

        # If headers didn't work, try to detect by content
        if date_col is None:
            date_pattern = r'\d{2}\.\d{2}\.\d{4}'
            for i in range(len(df.columns)):
                sample_values = df.iloc[:5, i].astype(str)
                if sample_values.str.match(date_pattern).any():
                    date_col = i
                    break

        if amount_col is None:
            for i in range(len(df.columns)):
                if i == date_col:
                    continue
                sample_values = df.iloc[:5, i].astype(str).str.replace(',', '').str.replace('"', '')
                try:
                    pd.to_numeric(sample_values, errors='raise')
                    amount_col = i
                    break
                except:
                    continue

        # Default assignments if still not found
        if date_col is None:
            date_col = 1  # Common position for date
        if amount_col is None:
            amount_col = 3  # Common position for amount
        if desc_col is None:
            desc_col = 2  # Common position for description
        if account_col is None:
            account_col = 0  # Common position for account

        print(f"[COLUMNS] Using: date={date_col}, amount={amount_col}, desc={desc_col}, account={account_col}",
              flush=True)

        # Create structured dataframe
        transactions = []
        for idx, row in df.iterrows():
            try:
                # Get date
                date_str = str(row.iloc[date_col]).strip()
                # Skip if not a valid date
                if not pd.notna(row.iloc[date_col]) or date_str in ['', 'nan', 'NaN']:
                    continue

                transaction_date = None
                for dfmt in ['%d.%m.%Y', '%d/%m/%Y', '%d/%m/%y', '%d.%m.%y', '%Y-%m-%d']:
                    transaction_date = pd.to_datetime(date_str, format=dfmt, errors='coerce')
                    if pd.notna(transaction_date):
                        break
                if pd.isna(transaction_date):
                    # Final fallback: let pandas infer
                    transaction_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                if pd.isna(transaction_date):
                    print(f"[SKIP] Row {idx}: Invalid date '{date_str}'", flush=True)
                    continue

                # Get amount (remove commas and quotes)
                amount_str = str(row.iloc[amount_col]).strip().replace(',', '').replace('"', '')
                if not amount_str or amount_str in ['nan', 'NaN', '']:
                    continue
                amount = float(amount_str)

                # Get description
                description = str(row.iloc[desc_col]).strip() if pd.notna(row.iloc[desc_col]) else 'משיכת מזומן'
                if description in ['nan', 'NaN', '']:
                    description = 'משיכת מזומן'

                # Get account number
                account_number = str(row.iloc[account_col]).strip() if pd.notna(row.iloc[account_col]) else ''
                if account_number in ['nan', 'NaN']:
                    account_number = ''

                # Month year
                month_year = transaction_date.strftime('%Y-%m')

                transactions.append({
                    'transaction_date': transaction_date,
                    'amount': amount,
                    'account_number': account_number,
                    'description': description,
                    'month_year': month_year,
                    'transaction_type': 'cash'
                })
                print(f"[PARSED] {transaction_date.strftime('%Y-%m-%d')}: {description} = {amount}", flush=True)
            except Exception as e:
                print(f"[SKIP ROW {idx}] Error: {e}", flush=True)
                continue

        if not transactions:
            raise ValueError("No valid transactions could be parsed from the file")

        result_df = pd.DataFrame(transactions)
        print(f"[CASH TRANSACTIONS] Successfully parsed {len(result_df)} transactions", flush=True)

        return result_df

    except Exception as e:
        print(f"[ERROR] Cash transaction parsing failed: {str(e)}", flush=True)
        raise ValueError(f"Error parsing cash transaction file: {str(e)}")


def parse_transaction_file(file_path, transaction_type='credit'):
    """Parse CSV or Excel file and return cleaned dataframe"""
    try:
        # If it's marked as cash transaction, use special parser
        if transaction_type == 'cash':
            return parse_cash_transaction_file(file_path)

        # Otherwise use standard credit card transaction parser
        # Determine file type and read accordingly
        if file_path.endswith('.csv'):
            # Use chardet to detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                result = chardet.detect(raw_data)
                detected_encoding = result['encoding']
                confidence = result['confidence']

                print(f"\n{'=' * 60}", flush=True)
                print(f"[ENCODING DEBUG] File: {file_path}", flush=True)
                print(f"[CHARDET] Detected: {detected_encoding} (confidence: {confidence})", flush=True)

                # Show first 200 bytes in hex for debugging
                print(f"[RAW BYTES] First 200 bytes (hex): {raw_data[:200].hex()}", flush=True)

                # Try to decode first line with different encodings to see which looks right
                first_line_end = raw_data.find(b'\n')
                if first_line_end > 0:
                    first_line_bytes = raw_data[:first_line_end]
                    print(f"[FIRST LINE BYTES] {first_line_bytes.hex()}", flush=True)
                    for test_enc in ['windows-1255', 'utf-8', 'iso-8859-8', 'cp1255']:
                        try:
                            decoded = first_line_bytes.decode(test_enc)
                            print(f"[TEST DECODE {test_enc}] {decoded}", flush=True)
                        except:
                            print(f"[TEST DECODE {test_enc}] FAILED", flush=True)

                # Map common encodings to their variants
                encoding_map = {
                    'ISO-8859-8': 'windows-1255',  # Hebrew ISO -> Windows Hebrew
                    'ISO-8859-1': 'cp1252',  # Latin-1 -> Windows-1252
                    'ascii': 'utf-8'  # ASCII -> UTF-8
                }

                # Try detected encoding first, then its mapped variant
                encodings_to_try = []
                if detected_encoding:
                    encodings_to_try.append(detected_encoding)
                    if detected_encoding.upper() in encoding_map:
                        encodings_to_try.append(encoding_map[detected_encoding.upper()])

                # Add Hebrew encodings as backup (since detection can be unreliable for Hebrew)
                encodings_to_try.extend([
                    'windows-1255',
                    'cp1255',
                    'iso-8859-8',
                    'utf-8-sig',
                    'utf-8',
                    'cp1252',
                    'windows-1252',
                    'latin-1'
                ])

                # Remove duplicates while preserving order
                seen = set()
                encodings_to_try = [x for x in encodings_to_try if x and not (x in seen or seen.add(x))]

            df = None
            used_encoding = None
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    used_encoding = encoding
                    print(f"[SUCCESS] Read CSV with encoding: {encoding}", flush=True)

                    # Debug: show first description value
                    if len(df) > 0 and len(df.columns) >= 3:
                        first_desc = df.iloc[0, 2] if len(df.columns) > 2 else "N/A"
                        print(f"[FIRST DESCRIPTION] {first_desc}", flush=True)
                        print(f"[FIRST DESC BYTES] {str(first_desc).encode('utf-8').hex()}", flush=True)

                    break
                except (UnicodeDecodeError, UnicodeError, LookupError) as e:
                    print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                    continue

            if df is None:
                # If all encodings fail, try with errors='replace'
                df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
                used_encoding = 'utf-8-replace'
                print(f"[FALLBACK] Using UTF-8 with error replacement", flush=True)
        else:
            df = pd.read_excel(file_path)

        # Clean the data
        df = clean_transaction_data(df)

        # Ensure we have the expected columns
        if len(df.columns) < 4:
            raise ValueError("File must have at least 4 columns: Account Number, Date, Description, Amount")

        # Rename columns to standard names
        df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])

        # Parse dates - try multiple formats
        print(f"[PARSE] Before date parsing: {len(df)} rows", flush=True)

        # Try multiple date formats in order of specificity
        date_formats = [
            '%d.%m.%Y',   # DD.MM.YYYY (e.g., 03.02.2026)
            '%d/%m/%Y',   # DD/MM/YYYY (e.g., 03/02/2026)
            '%d/%m/%y',   # D/M/YY (e.g., 3/2/26)
            '%d.%m.%y',   # D.M.YY (e.g., 3.2.26)
            '%Y-%m-%d',   # YYYY-MM-DD (e.g., 2026-02-03)
        ]

        parsed_dates = None
        for fmt in date_formats:
            attempt = pd.to_datetime(df['transaction_date'], format=fmt, errors='coerce')
            valid_count = attempt.notna().sum()
            print(f"[PARSE] Format '{fmt}': {valid_count}/{len(df)} dates parsed", flush=True)
            if valid_count > 0 and (parsed_dates is None or valid_count > parsed_dates.notna().sum()):
                parsed_dates = attempt

        # Final fallback: let pandas infer the format
        if parsed_dates is None or parsed_dates.notna().sum() == 0:
            parsed_dates = pd.to_datetime(df['transaction_date'], dayfirst=True, errors='coerce')
            print(f"[PARSE] Fallback (dayfirst=True): {parsed_dates.notna().sum()}/{len(df)} dates parsed", flush=True)

        df['transaction_date'] = parsed_dates
        print(f"[PARSE] After date parsing, rows with NaT dates: {df['transaction_date'].isna().sum()}", flush=True)

        # Convert amount to float
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        print(f"[PARSE] After amount parsing, rows with NaN amounts: {df['amount'].isna().sum()}", flush=True)

        # Show first 3 rows before dropping
        print(f"[PARSE] First 3 rows before dropping NaN:", flush=True)
        for i in range(min(3, len(df))):
            print(
                f"  Row {i}: date={df.iloc[i]['transaction_date']}, desc={df.iloc[i]['description']}, amt={df.iloc[i]['amount']}",
                flush=True)

        # Remove rows with invalid dates or amounts
        df = df.dropna(subset=['transaction_date', 'amount'])
        print(f"[PARSE] After dropping NaN: {len(df)} rows remaining", flush=True)

        # Add month_year column
        df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')

        # Add transaction_type column
        df['transaction_type'] = transaction_type

        return df

    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")


# ==================== TRANSACTION TABS ENDPOINTS ====================

@transactions_bp.route('/api/transaction-tabs', methods=['GET'])
def get_transaction_tabs():
    """Get all transaction tabs for the current user"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM transaction_tabs WHERE 1=1"
            params = []

            if user_role == 'limited':
                query += " AND owner = %s"
                params.append(username)

            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            tabs = cursor.fetchall()

            for tab in tabs:
                if tab.get('created_at'):
                    tab['created_at'] = tab['created_at'].isoformat()

            return jsonify(tabs)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transaction-tabs', methods=['POST'])
def create_transaction_tab():
    """Create a new transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        owner = data.get('username')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)",
                (name, owner)
            )
            connection.commit()

            tab_id = cursor.lastrowid
            return jsonify({
                'id': tab_id,
                'name': name,
                'owner': owner,
                'message': 'Tab created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['PUT'])
def update_transaction_tab(tab_id):
    """Rename a transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute(
                "UPDATE transaction_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['DELETE'])
def delete_transaction_tab(tab_id):
    """Delete a transaction tab and its associated transactions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Delete associated transactions first
            cursor.execute(
                "DELETE FROM bank_transactions WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_transactions = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM transaction_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_transactions} transactions'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transaction-tabs/orphaned', methods=['GET'])
def get_orphaned_transaction_count():
    """Get count of transactions with no tab_id (orphaned from before tabs existed)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
            result = cursor.fetchone()
            return jsonify({'count': result['count']})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transaction-tabs/<int:tab_id>/adopt', methods=['POST'])
def adopt_orphaned_transactions(tab_id):
    """Assign all transactions with tab_id=NULL to the specified tab"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("UPDATE bank_transactions SET tab_id = %s WHERE tab_id IS NULL", (tab_id,))
            adopted_count = cursor.rowcount
            connection.commit()
            return jsonify({'message': f'{adopted_count} transactions assigned to tab', 'count': adopted_count})
    except Error as e:
        return jsonify({'error': str(e)}), 500



# ==================== TRANSACTION ENDPOINTS ====================

@transactions_bp.route('/api/transactions/upload', methods=['POST'])
def upload_transactions():
    """Upload and parse bank transaction file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        transaction_type = request.form.get('transaction_type', 'credit')  # Get transaction type from form

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Parse the file with transaction type
            df = parse_transaction_file(file_path, transaction_type)

            # Calculate total amount
            total_amount = float(df['amount'].sum())

            # Convert to list of dictionaries for JSON response
            transactions = []
            for idx, row in df.iterrows():
                desc_value = str(row['description'])

                # Debug first transaction
                if idx == 0:
                    print(f"[FIRST TRANSACTION DEBUG]", flush=True)
                    print(f"  Description value: {desc_value}", flush=True)
                    print(f"  Description type: {type(desc_value)}", flush=True)
                    print(f"  Description bytes: {desc_value.encode('utf-8').hex()}", flush=True)
                    print(f"  Description repr: {repr(desc_value)}", flush=True)

                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': desc_value,
                    'amount': float(row['amount']),
                    'month_year': row['month_year'],
                    'transaction_type': row.get('transaction_type', transaction_type)
                })

            response_data = {
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'temp_filename': filename,  # Return filename for re-encoding attempts
                'transaction_type': transaction_type
            }

            # Debug the JSON response
            if transactions:
                print(f"[JSON RESPONSE DEBUG]", flush=True)
                print(f"  First transaction description: {transactions[0]['description']}", flush=True)
                import json
                json_str = json.dumps(transactions[0], ensure_ascii=False)
                print(f"  First transaction JSON: {json_str}", flush=True)
                print(f"  JSON bytes: {json_str.encode('utf-8').hex()}", flush=True)
                print(f"{'=' * 60}\n", flush=True)

            return jsonify(response_data)

        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@transactions_bp.route('/api/transactions/encoding-preview', methods=['POST'])
def encoding_preview():
    """Show previews of file with different encodings to let user choose"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'preview_{filename}')
        file.save(file_path)

        # List of encodings to try
        encodings_to_test = [
            'utf-8',
            'windows-1255',  # Hebrew Windows
            'iso-8859-8',  # Hebrew ISO
            'cp1255',  # Hebrew Code Page
            'utf-16',
            'windows-1252',  # Western European
            'iso-8859-1',  # Latin-1
        ]

        previews = []

        for encoding in encodings_to_test:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                df = clean_transaction_data(df)

                if len(df.columns) >= 4:
                    # Get first 3 rows, 3rd column (description)
                    descriptions = []
                    for i in range(min(3, len(df))):
                        try:
                            desc = str(df.iloc[i, 2])  # 3rd column
                            descriptions.append(desc)
                        except:
                            descriptions.append("N/A")

                    previews.append({
                        'encoding': encoding,
                        'success': True,
                        'samples': descriptions
                    })
            except Exception as e:
                previews.append({
                    'encoding': encoding,
                    'success': False,
                    'error': str(e)[:100]
                })

        # Keep the file for when user selects an encoding
        return jsonify({
            'success': True,
            'temp_filename': filename,
            'previews': previews
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@transactions_bp.route('/api/transactions/upload-with-encoding', methods=['POST'])
def upload_with_encoding():
    """Upload file with user-selected encoding"""
    try:
        data = request.json
        temp_filename = data.get('temp_filename')
        selected_encoding = data.get('encoding', 'utf-8')

        if not temp_filename:
            return jsonify({'error': 'No temp filename provided'}), 400

        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'preview_{temp_filename}')

        if not os.path.exists(file_path):
            return jsonify({'error': 'Temporary file not found'}), 400

        try:
            # Parse with selected encoding
            df = pd.read_csv(file_path, encoding=selected_encoding)
            df = clean_transaction_data(df)

            if len(df.columns) < 4:
                raise ValueError("File must have at least 4 columns")

            df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])
            df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%d.%m.%Y', errors='coerce')
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            df = df.dropna(subset=['transaction_date', 'amount'])
            df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')

            # Convert to transactions list
            transactions = []
            for _, row in df.iterrows():
                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': str(row['description']),
                    'amount': float(row['amount']),
                    'month_year': row['month_year']
                })

            total_amount = float(df['amount'].sum())

            return jsonify({
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'encoding_used': selected_encoding
            })

        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@transactions_bp.route('/api/transactions/save', methods=['POST'])
def save_transactions():
    """Save parsed transactions to database with encryption"""
    try:
        data = request.json
        transactions = data.get('transactions', [])
        username = data.get('username')  # Get uploader username
        tab_id = data.get('tab_id')

        if not transactions:
            return jsonify({'error': 'No transactions to save'}), 400

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """

            transaction_ids = []
            for trans in transactions:
                # Encrypt sensitive fields
                encrypted_account = encrypt_field(trans.get('account_number', ''))
                encrypted_description = encrypt_field(trans['description'])
                encrypted_amount = encrypt_field(str(trans['amount']))

                values = (
                    encrypted_account,
                    trans['transaction_date'],
                    encrypted_description,
                    encrypted_amount,
                    trans['month_year'],
                    trans.get('transaction_type', 'credit'),
                    username,
                    tab_id
                )
                cursor.execute(query, values)
                transaction_ids.append(str(cursor.lastrowid))

            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='SAVE',
                transaction_ids=','.join(transaction_ids[:10]) + ('...' if len(transaction_ids) > 10 else ''),
                month_year=transactions[0].get('month_year')
            )

            return jsonify({
                'success': True,
                'message': f'{len(transactions)} transactions saved successfully (encrypted)'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/months', methods=['GET'])
def get_transaction_months():
    """Get list of months with saved transactions (filtered by user role and tab)"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Fetch individual rows to decrypt amounts in Python
            query = """
                SELECT month_year,
                       amount,
                       transaction_date,
                       upload_date
                FROM bank_transactions
                WHERE 1=1
            """
            params = []

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Decrypt amounts and aggregate by month
            month_data = {}
            for row in rows:
                my = row['month_year']
                if my not in month_data:
                    month_data[my] = {
                        'month_year': my,
                        'transaction_count': 0,
                        'total_amount': 0.0,
                        'start_date': row['transaction_date'],
                        'end_date': row['transaction_date'],
                        'last_upload': row['upload_date']
                    }
                month_data[my]['transaction_count'] += 1
                try:
                    decrypted = decrypt_field(row['amount'])
                    month_data[my]['total_amount'] += float(decrypted) if decrypted else 0.0
                except (ValueError, TypeError):
                    pass
                # Track min/max dates
                if row['transaction_date']:
                    if not month_data[my]['start_date'] or row['transaction_date'] < month_data[my]['start_date']:
                        month_data[my]['start_date'] = row['transaction_date']
                    if not month_data[my]['end_date'] or row['transaction_date'] > month_data[my]['end_date']:
                        month_data[my]['end_date'] = row['transaction_date']
                if row['upload_date']:
                    if not month_data[my]['last_upload'] or row['upload_date'] > month_data[my]['last_upload']:
                        month_data[my]['last_upload'] = row['upload_date']

            # Convert to sorted list
            months = sorted(month_data.values(), key=lambda x: x['month_year'], reverse=True)

            for month in months:
                if month['total_amount']:
                    month['total_amount'] = float(month['total_amount'])
                if month['start_date']:
                    month['start_date'] = month['start_date'].isoformat()
                if month['end_date']:
                    month['end_date'] = month['end_date'].isoformat()
                if month['last_upload']:
                    month['last_upload'] = month['last_upload'].isoformat()

            return jsonify(months)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/all', methods=['GET'])
def get_all_transactions():
    """Get all transactions (filtered by user role and tab) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT id,
                       account_number,
                       transaction_date,
                       description,
                       amount,
                       month_year,
                       transaction_type,
                       upload_date,
                       uploaded_by
                FROM bank_transactions
                WHERE 1=1
            """
            params = []

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all transactions

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

            # Decrypt sensitive fields and convert types
            for trans in transactions:
                # Decrypt sensitive fields
                trans['account_number'] = decrypt_field(trans['account_number'])
                trans['description'] = decrypt_field(trans['description'])
                trans['amount'] = decrypt_field(trans['amount'])

                # Convert types after decryption
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    try:
                        trans['amount'] = float(trans['amount'])
                    except (ValueError, TypeError):
                        trans['amount'] = 0.0
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='VIEW_ALL',
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/<month_year>', methods=['GET'])
def get_transactions_by_month(month_year):
    """Get all transactions for a specific month (filtered by user role and tab) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT id,
                       account_number,
                       transaction_date,
                       description,
                       amount,
                       month_year,
                       transaction_type,
                       upload_date,
                       uploaded_by
                FROM bank_transactions
                WHERE month_year = %s
            """
            params = [month_year]

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

            # Decrypt sensitive fields and convert types
            for trans in transactions:
                # Decrypt sensitive fields
                trans['account_number'] = decrypt_field(trans['account_number'])
                trans['description'] = decrypt_field(trans['description'])
                trans['amount'] = decrypt_field(trans['amount'])

                # Convert types after decryption
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    try:
                        trans['amount'] = float(trans['amount'])
                    except (ValueError, TypeError):
                        trans['amount'] = 0.0
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='VIEW_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a specific transaction with audit logging"""
    try:
        username = request.args.get('username', 'unknown')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM bank_transactions WHERE id = %s", (transaction_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Transaction not found'}), 404

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/month/<month_year>', methods=['DELETE'])
def delete_month_transactions(month_year):
    """Delete all transactions for a specific month with audit logging"""
    try:
        username = request.args.get('username', 'unknown')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify({'error': 'tab_id is required'}), 400

            cursor.execute("DELETE FROM bank_transactions WHERE month_year = %s AND tab_id = %s", (month_year, tab_id))
            deleted_count = cursor.rowcount
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {deleted_count}"
            )

            return jsonify({
                'message': f'{deleted_count} transactions deleted successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update a specific transaction with encryption"""
    try:
        data = request.json
        username = data.get('username', 'unknown')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                    UPDATE bank_transactions
                    SET transaction_date = %s,
                        description      = %s,
                        amount           = %s,
                        month_year       = %s,
                        account_number   = %s,
                        transaction_type = %s
                    WHERE id = %s
                    """

            cursor.execute(query, (
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                encrypted_account,
                data.get('transaction_type', 'credit'),
                transaction_id
            ))
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='UPDATE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction updated successfully (encrypted)'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/manual', methods=['POST'])
def add_manual_transaction():
    """Add a transaction manually with encryption"""
    try:
        data = request.json
        username = data.get('username', 'admin')
        tab_id = data.get('tab_id')

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
            cursor.execute(query, (
                encrypted_account,
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                data.get('transaction_type', 'credit'),
                username,
                tab_id
            ))
            connection.commit()

            transaction_id = cursor.lastrowid

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='MANUAL_ADD',
                transaction_ids=str(transaction_id),
                month_year=data.get('month_year')
            )

            return jsonify({
                'message': 'Transaction added successfully (encrypted)',
                'id': transaction_id
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/descriptions', methods=['GET'])
def get_all_descriptions():
    """Get all unique transaction descriptions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("""
                           SELECT DISTINCT description
                           FROM bank_transactions
                           WHERE description IS NOT NULL
                             AND description != ''
                           ORDER BY description
                           """)

            descriptions = [row[0] for row in cursor.fetchall()]
            return jsonify(descriptions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/transactions/stats', methods=['GET'])
def get_transaction_stats():
    """Get transaction statistics including cash vs credit breakdown (filtered by user role and tab)"""
    try:
        # Get optional date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify({'by_type': [], 'monthly': []})

            # Build filters
            filters = ["tab_id = %s"]
            params = [tab_id]

            if start_date:
                filters.append("transaction_date >= %s")
                params.append(start_date)
            if end_date:
                filters.append("transaction_date <= %s")
                params.append(end_date)
            if user_role == 'limited':
                filters.append("uploaded_by = %s")
                params.append(username)

            where_clause = " AND ".join(filters) if filters else "1=1"

            # Overall stats by type
            cursor.execute(f"""
                SELECT 
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    MIN(transaction_date) as first_date,
                    MAX(transaction_date) as last_date
                FROM bank_transactions
                WHERE {where_clause}
                GROUP BY transaction_type
            """, params)

            by_type = cursor.fetchall()

            # Convert Decimal to float
            for item in by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])
                if item['avg_amount']:
                    item['avg_amount'] = float(item['avg_amount'])
                if item['first_date']:
                    item['first_date'] = item['first_date'].isoformat()
                if item['last_date']:
                    item['last_date'] = item['last_date'].isoformat()

            # Monthly breakdown by type
            cursor.execute(f"""
                SELECT 
                    month_year,
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount
                FROM bank_transactions
                WHERE {where_clause}
                GROUP BY month_year, transaction_type
                ORDER BY month_year DESC, transaction_type
            """, params)

            monthly_by_type = cursor.fetchall()

            # Convert Decimal to float
            for item in monthly_by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])

            return jsonify({
                'by_type': by_type,
                'monthly_by_type': monthly_by_type
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


