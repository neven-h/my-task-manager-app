from flask import Blueprint, request, jsonify, current_app
from config import allowed_file, UPLOAD_FOLDER, token_required
from werkzeug.utils import secure_filename
import pandas as pd
import os

from routes.transaction_parsers import clean_transaction_data

transactions_encoding_bp = Blueprint('transactions_encoding', __name__)


@transactions_encoding_bp.route('/api/transactions/encoding-preview', methods=['POST'])
@token_required
def encoding_preview(payload):
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
                current_app.logger.error('encoding-preview decode error for %s: %s', encoding, e, exc_info=True)
                previews.append({
                    'encoding': encoding,
                    'success': False,
                    'error': 'Failed to decode with this encoding'
                })

        # Keep the file for when user selects an encoding
        return jsonify({
            'success': True,
            'temp_filename': filename,
            'previews': previews
        })

    except Exception as e:
        current_app.logger.error('encoding-preview error: %s', e, exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500


@transactions_encoding_bp.route('/api/transactions/upload-with-encoding', methods=['POST'])
@token_required
def upload_with_encoding(payload):
    """Upload file with user-selected encoding"""
    try:
        data = request.json
        temp_filename = data.get('temp_filename')
        selected_encoding = data.get('encoding', 'utf-8')

        if not temp_filename:
            return jsonify({'error': 'No temp filename provided'}), 400

        # Sanitise the caller-supplied filename to prevent path traversal.
        # secure_filename strips directory components and special characters;
        # we then verify the resolved path stays inside UPLOAD_FOLDER.
        safe_name = secure_filename(temp_filename)
        if not safe_name:
            return jsonify({'error': 'Invalid temp filename'}), 400

        upload_folder = os.path.realpath(current_app.config['UPLOAD_FOLDER'])
        file_path = os.path.realpath(os.path.join(upload_folder, f'preview_{safe_name}'))
        if not file_path.startswith(upload_folder + os.sep):
            return jsonify({'error': 'Invalid temp filename'}), 400

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
        current_app.logger.error('upload-with-encoding error: %s', e, exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500
