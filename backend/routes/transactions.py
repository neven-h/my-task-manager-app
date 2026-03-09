from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required,
    encrypt_field, log_bank_transaction_access,
    allowed_file, UPLOAD_FOLDER,
)
from mysql.connector import Error
from werkzeug.utils import secure_filename
import pandas as pd
import os

from routes.transaction_parsers_credit import parse_transaction_file

transactions_bp = Blueprint('transactions', __name__)

# ==================== TRANSACTION ENDPOINTS ====================

@transactions_bp.route('/api/transactions/upload', methods=['POST'])
@token_required
def upload_transactions(payload):
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
                'temp_filename': filename,
                'transaction_type': transaction_type,
                'normalizer_profile': df.attrs.get('normalizer_profile'),
                'normalizer_confidence': df.attrs.get('normalizer_confidence'),
            }

            return jsonify(response_data)

        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except ValueError as e:
        current_app.logger.error('upload validation error: %s', e, exc_info=True)
        return jsonify({'error': 'Invalid file or data'}), 400
    except Exception as e:
        current_app.logger.error('upload error: %s', e, exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500


@transactions_bp.route('/api/transactions/save', methods=['POST'])
@token_required
def save_transactions(payload):
    """Save parsed transactions to database with encryption"""
    try:
        data = request.json
        transactions = data.get('transactions', [])
        username = payload['username']  # Get uploader username from JWT
        tab_id = data.get('tab_id')

        if not transactions:
            return jsonify({'error': 'No transactions to save'}), 400

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check: verify the tab belongs to the requesting user
            cursor.execute(
                "SELECT id FROM transaction_tabs WHERE id = %s AND owner = %s",
                (tab_id, username)
            )
            if not cursor.fetchone():
                return jsonify({'error': 'Tab not found or access denied'}), 404

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
                'message': f'{len(transactions)} transactions saved successfully (encrypted)',
                'transaction_ids': [int(tid) for tid in transaction_ids]
            })

    except Error as e:
        current_app.logger.error('save_transactions db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transactions_bp.route('/api/transactions/batch-delete', methods=['DELETE'])
@token_required
def batch_delete_transactions(payload):
    """Delete multiple transactions by IDs (for undo after upload)"""
    try:
        data = request.json
        transaction_ids = data.get('transaction_ids', [])
        username = payload['username']
        user_role = payload['role']

        if not transaction_ids or not isinstance(transaction_ids, list):
            return jsonify({'error': 'transaction_ids array is required'}), 400

        if len(transaction_ids) > 5000:
            return jsonify({'error': 'Cannot delete more than 5000 transactions at once'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            placeholders = ','.join(['%s'] * len(transaction_ids))

            # Ownership check: verify all transactions belong to this user
            if user_role != 'admin':
                cursor.execute(
                    f"SELECT COUNT(*) as cnt FROM bank_transactions WHERE id IN ({placeholders}) AND uploaded_by != %s",
                    (*transaction_ids, username)
                )
                row = cursor.fetchone()
                if row and row['cnt'] > 0:
                    return jsonify({'error': 'Access denied: some transactions do not belong to you'}), 403

            cursor = connection.cursor()
            cursor.execute(
                f"DELETE FROM bank_transactions WHERE id IN ({placeholders})",
                tuple(transaction_ids)
            )
            deleted_count = cursor.rowcount
            connection.commit()

            log_bank_transaction_access(
                username=username,
                action='BATCH_DELETE',
                transaction_ids=','.join(str(tid) for tid in transaction_ids[:10]) + ('...' if len(transaction_ids) > 10 else '')
            )

            return jsonify({
                'success': True,
                'message': f'{deleted_count} transactions deleted',
                'deleted_count': deleted_count
            })

    except Error as e:
        current_app.logger.error('batch_delete_transactions db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
