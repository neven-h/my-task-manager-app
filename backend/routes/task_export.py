from flask import Blueprint, request, jsonify, send_file, current_app
from config import (
    get_db_connection, sanitize_csv_field, UPLOAD_FOLDER,
)
from mysql.connector import Error
from werkzeug.utils import secure_filename
from datetime import datetime
import csv
import io
import os
import pandas as pd

task_export_bp = Blueprint('task_export', __name__)


@task_export_bp.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export tasks to CSV"""
    try:
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)

            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)

            query += " ORDER BY task_date DESC, task_time DESC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            output = io.StringIO()
            if tasks:
                fieldnames = list(tasks[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for task in tasks:
                    safe_row = {k: sanitize_csv_field(task.get(k)) for k in fieldnames}
                    writer.writerow(safe_row)

            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500


@task_export_bp.route('/api/export/hours-report', methods=['GET'])
def export_hours_report():
    """Export tasks to CSV in hours report format"""
    try:
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)

            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)

            query += " ORDER BY task_date ASC, task_time ASC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            output = io.StringIO()
            fieldnames = ['Date', 'Client', 'Task', 'Category', 'Hours', 'Status', 'Notes']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for task in tasks:
                categories_str = ''
                if task.get('categories'):
                    try:
                        import json
                        categories_list = json.loads(task['categories']) if isinstance(task['categories'], str) else task['categories']
                        categories_str = ', '.join(categories_list) if isinstance(categories_list, list) else str(categories_list)
                    except Exception:
                        categories_str = str(task['categories'])

                writer.writerow({
                    'Date': task['task_date'].strftime('%Y-%m-%d') if hasattr(task['task_date'], 'strftime') else str(task['task_date']),
                    'Client': task.get('client', ''),
                    'Task': task.get('title', ''),
                    'Category': categories_str,
                    'Hours': task.get('duration', ''),
                    'Status': task.get('status', ''),
                    'Notes': task.get('notes', '')
                })

            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'hours_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500


@task_export_bp.route('/api/import/hours-report', methods=['POST'])
def import_hours_report():
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
                        print(f"Successfully read file with encoding: {encoding}")
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
                        category = str(row.get('Category', 'other')).strip() if pd.notna(row.get('Category')) else 'other'
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
                            title, '', category, category, client,
                            task_date.strftime('%Y-%m-%d'), '00:00:00', duration,
                            status if status in ['completed', 'uncompleted'] else 'completed',
                            '', notes
                        )
                        cursor.execute(query, values)
                        imported_count += 1

                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
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
        return jsonify({'error': str(e)}), 500
