from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, UPLOAD_FOLDER, token_required
from mysql.connector import Error
from werkzeug.utils import secure_filename
import os
import pandas as pd

task_import_bp = Blueprint('task_import', __name__)


@task_import_bp.route('/api/import/hours-report', methods=['POST'])
@token_required
def import_hours_report(payload):
    """Import tasks from hours report CSV or Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            if filename.endswith('.csv'):
                encodings_to_try = [
                    'utf-8-sig', 'utf-8', 'windows-1255', 'iso-8859-8', 'cp1255',
                    'cp1252', 'windows-1252', 'latin-1', 'iso-8859-1'
                ]
                df = None
                for encoding in encodings_to_try:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        current_app.logger.debug('task_import: read file with encoding %s', encoding)
                        break
                    except (UnicodeDecodeError, UnicodeError, LookupError):
                        continue
                if df is None:
                    df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file.'}), 400

            required_columns = ['Date', 'Task']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400

            imported_count = 0
            errors = []

            with get_db_connection() as connection:
                cursor = connection.cursor()

                for index, row in df.iterrows():
                    try:
                        task_date = pd.to_datetime(row['Date'], errors='coerce')
                        if pd.isna(task_date):
                            errors.append(f"Row {index + 2}: Invalid date")
                            continue

                        title = str(row['Task']).strip() if pd.notna(row['Task']) else ''
                        if not title:
                            errors.append(f"Row {index + 2}: Missing task title")
                            continue

                        client = str(row.get('Client', '')).strip() if pd.notna(row.get('Client')) else ''

                        import json as _json
                        raw_category = str(row.get('Category', '')).strip() if pd.notna(row.get('Category')) else ''
                        if raw_category:
                            categories_list = [c.strip() for c in raw_category.split(',') if c.strip()]
                        else:
                            categories_list = []
                        categories_json = _json.dumps(categories_list) if categories_list else _json.dumps([])
                        category_legacy = categories_list[0] if categories_list else ''

                        duration = row.get('Hours')
                        status = str(row.get('Status', 'completed')).strip().lower() if pd.notna(row.get('Status')) else 'completed'
                        notes = str(row.get('Notes', '')).strip() if pd.notna(row.get('Notes')) else ''

                        if pd.notna(duration) and duration != '':
                            try:
                                duration = float(duration)
                            except (ValueError, TypeError):
                                duration = None
                        else:
                            duration = None

                        query = """
                                INSERT INTO tasks
                                (title, description, category, categories, client, task_date, task_time,
                                 duration, status, tags, notes)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """
                        values = (
                            title, '', category_legacy, categories_json, client,
                            task_date.strftime('%Y-%m-%d'), '00:00:00', duration,
                            status if status in ['completed', 'uncompleted'] else 'completed',
                            '', notes
                        )
                        cursor.execute(query, values)
                        imported_count += 1

                    except Exception as e:
                        current_app.logger.error('task_import row %d error: %s', index + 2, e, exc_info=True)
                        errors.append(f"Row {index + 2}: failed to import")
                        continue

                connection.commit()

            os.remove(file_path)

            result = {
                'message': f'Successfully imported {imported_count} task(s)',
                'imported_count': imported_count
            }
            if errors:
                result['errors'] = errors[:10]
                if len(errors) > 10:
                    result['additional_errors'] = len(errors) - 10

            return jsonify(result), 200

        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except Error as e:
        current_app.logger.error('task_import db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
