from flask import Blueprint, request, jsonify, send_file, current_app
from config import (
    get_db_connection, sanitize_csv_field, UPLOAD_FOLDER, token_required,
)
from mysql.connector import Error
from datetime import datetime
import csv
import io

task_export_bp = Blueprint('task_export', __name__)


@task_export_bp.route('/api/export/csv', methods=['GET'])
@token_required
def export_csv(payload):
    """Export tasks to CSV"""
    try:
        username = payload.get('username')
        user_role = payload.get('role', 'limited')
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
                io.BytesIO(output.getvalue().encode('utf-8-sig')),
                mimetype='text/csv; charset=utf-8',
                as_attachment=True,
                download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        current_app.logger.error('task_export db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@task_export_bp.route('/api/export/hours-report', methods=['GET'])
@token_required
def export_hours_report(payload):
    """Export tasks to CSV in hours report format"""
    try:
        username = payload.get('username')
        user_role = payload.get('role', 'limited')
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
            fieldnames = ['Date', 'Time', 'Client', 'Task', 'Description', 'Category', 'Hours', 'Status', 'Notes']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            import json as _json
            for task in tasks:
                categories_str = ''
                raw_cats = task.get('categories')
                # Unwrap up to two layers of JSON encoding to recover from legacy double-encoded rows.
                for _ in range(2):
                    if isinstance(raw_cats, str):
                        try:
                            raw_cats = _json.loads(raw_cats)
                        except Exception:
                            break
                    else:
                        break
                if isinstance(raw_cats, list):
                    categories_str = ', '.join(str(c) for c in raw_cats)
                elif raw_cats:
                    categories_str = str(raw_cats)
                elif task.get('category'):
                    categories_str = task['category']

                task_time_val = task.get('task_time')
                if task_time_val is None or str(task_time_val) in ('', '00:00:00', '0:00:00'):
                    time_str = ''
                else:
                    time_str = str(task_time_val)

                writer.writerow({
                    'Date': task['task_date'].strftime('%Y-%m-%d') if hasattr(task['task_date'], 'strftime') else str(task['task_date']),
                    'Time': time_str,
                    'Client': task.get('client', ''),
                    'Task': task.get('title', ''),
                    'Description': task.get('description', '') or '',
                    'Category': categories_str,
                    'Hours': task.get('duration', ''),
                    'Status': task.get('status', ''),
                    'Notes': task.get('notes', '')
                })

            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8-sig')),
                mimetype='text/csv; charset=utf-8',
                as_attachment=True,
                download_name=f'hours_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        current_app.logger.error('task_export db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
