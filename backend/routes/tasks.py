from flask import Blueprint, request, jsonify, send_file, current_app
from config import (
    get_db_connection, handle_error, serialize_task, token_required,
    sanitize_csv_field, DEBUG, UPLOAD_FOLDER, TASK_ATTACHMENTS_FOLDER,
    allowed_task_attachment, app, mail, FRONTEND_URL,
)
from mysql.connector import Error
from werkzeug.utils import secure_filename
from datetime import datetime, date
import csv
import io
import os
import re
import uuid
import pandas as pd

tasks_bp = Blueprint('tasks', __name__)


def _sync_tags_to_table(cursor, tags):
    """Ensure all tag names exist in the tags table (INSERT IGNORE)."""
    for tag in tags:
        tag = tag.strip()
        if tag:
            cursor.execute(
                "INSERT IGNORE INTO tags (name) VALUES (%s)",
                (tag,)
            )


# ================================
# Tasks Endpoints
# ================================

@tasks_bp.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks with optional filtering"""
    try:
        # Get query parameters
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        shared_only = request.args.get('shared')  # For users with 'shared' role
        username = request.args.get('username')  # NEW: Get username from query
        user_role = request.args.get('role')  # NEW: Get role from query
        include_drafts = request.args.get('include_drafts', 'false')
        has_attachment = request.args.get('has_attachment')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            # Exclude drafts by default unless explicitly requested
            if include_drafts != 'true':
                query += " AND (is_draft = FALSE OR is_draft IS NULL)"

            # NEW: Filter based on user role
            if user_role == 'shared':
                # 'shared' role: only see tasks marked as shared
                query += " AND shared = TRUE"
            elif user_role == 'limited':
                # 'limited' role: only see their own tasks (created_by must match)
                query += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)
            # 'admin' role: see everything (no additional filter)

            # Log for debugging
            if DEBUG:
                print(f"User: {username}, Role: {user_role}, Query: {query}, Params: {params}")

            # If shared_only is explicitly requested (backward compatibility)
            if shared_only == 'true':
                query += " AND shared = TRUE"

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

            if has_attachment == 'true':
                query += " AND id IN (SELECT DISTINCT task_id FROM task_attachments)"

            query += " ORDER BY task_date DESC, task_time DESC, created_at DESC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            # Convert datetime objects to strings and tags to array using helper
            for task in tasks:
                serialize_task(task)

            # Attach attachment list to each task
            if tasks:
                task_ids = [t['id'] for t in tasks]
                placeholders = ','.join(['%s'] * len(task_ids))
                cursor.execute(
                    f"SELECT id, task_id, filename, content_type, file_size FROM task_attachments WHERE task_id IN ({placeholders}) ORDER BY task_id, id",
                    task_ids
                )
                att_rows = cursor.fetchall()
                att_by_task = {}
                for r in att_rows:
                    tid = r['task_id']
                    if tid not in att_by_task:
                        att_by_task[tid] = []
                    att_by_task[tid].append(_attachment_to_json(r))
                for task in tasks:
                    task['attachments'] = att_by_task.get(task['id'], [])

            return jsonify(tasks)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.json

        # NEW: Get username from request
        username = data.get('username')

        # Set default time to current time if not provided
        task_time = data.get('task_time')
        if not task_time:
            task_time = datetime.now().strftime('%H:%M:%S')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                    """

            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]  # First category is primary
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_list = tags if isinstance(tags, list) else [t.strip() for t in tags.split(',') if t.strip()]
            tags_str = ','.join(tags_list)

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                task_time,
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False)),
                username  # NEW: Store creator
            )

            cursor.execute(query, values)
            _sync_tags_to_table(cursor, tags_list)
            connection.commit()

            task_id = cursor.lastrowid

            return jsonify({
                'id': task_id,
                'message': 'Task created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update an existing task"""
    try:
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                    UPDATE tasks
                    SET title       = %s, \
                        description = %s, \
                        category    = %s, \
                        categories  = %s, \
                        client      = %s,
                        task_date   = %s, \
                        task_time   = %s, \
                        duration    = %s,
                        status      = %s, \
                        tags        = %s, \
                        notes       = %s, \
                        shared      = %s, \
                        is_draft    = %s
                    WHERE id = %s \
                    """
            # Note: We're NOT updating created_by - it stays with original creator

            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_list = tags if isinstance(tags, list) else [t.strip() for t in tags.split(',') if t.strip()]
            tags_str = ','.join(tags_list)

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                data.get('task_time'),
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False)),
                task_id
            )

            cursor.execute(query, values)
            _sync_tags_to_table(cursor, tags_list)
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404

            return jsonify({'message': 'Task updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404

            return jsonify({'message': 'Task deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/toggle-status', methods=['PATCH'])
def toggle_task_status(task_id):
    """Toggle task completion status"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Get current status
            cursor.execute("SELECT status FROM tasks WHERE id = %s", (task_id,))
            result = cursor.fetchone()

            if not result:
                return jsonify({'error': 'Task not found'}), 404

            # Toggle between completed and uncompleted
            current_status = result[0]
            new_status = 'completed' if current_status == 'uncompleted' else 'uncompleted'

            cursor.execute(
                "UPDATE tasks SET status = %s WHERE id = %s",
                (new_status, task_id)
            )
            connection.commit()

            return jsonify({
                'message': 'Status updated successfully',
                'status': new_status
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/duplicate', methods=['POST'])
def duplicate_task(task_id):
    """Duplicate an existing task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get the original task
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            original_task = cursor.fetchone()

            if not original_task:
                return jsonify({'error': 'Task not found'}), 404

            # Create a duplicate with modified title and today's date
            cursor = connection.cursor()
            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                    """

            # Add "Copy of" prefix to title
            new_title = f"Copy of {original_task['title']}"

            # Use today's date and current time
            today = datetime.now().date()
            current_time = datetime.now().time()

            values = (
                new_title,
                original_task['description'],
                original_task['category'],
                original_task['categories'],
                original_task['client'],
                today,
                current_time,
                original_task['duration'],
                'uncompleted',  # New tasks start as uncompleted
                original_task['tags'],
                original_task['notes'],
                original_task['shared'],
                False  # Duplicates should not be created as drafts
            )

            cursor.execute(query, values)
            connection.commit()

            new_task_id = cursor.lastrowid

            return jsonify({
                'message': 'Task duplicated successfully',
                'id': new_task_id
            }), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ================================
# Task Attachments
# ================================

def _attachment_to_json(row):
    """Convert attachment row to JSON with url path for frontend."""
    return {
        'id': row['id'],
        'filename': row['filename'],
        'content_type': row.get('content_type') or '',
        'file_size': row.get('file_size'),
        'url': f"/api/tasks/attachments/{row['id']}/file",
    }


@tasks_bp.route('/api/tasks/<int:task_id>/attachments', methods=['GET'])
def get_task_attachments(task_id):
    """List attachments for a task."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, filename, content_type, file_size FROM task_attachments WHERE task_id = %s ORDER BY id",
                (task_id,)
            )
            rows = cursor.fetchall()
        return jsonify([_attachment_to_json(r) for r in rows])
    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/attachments', methods=['POST'])
def upload_task_attachment(task_id):
    """Upload a file or image attachment for a task."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_task_attachment(file.filename):
            return jsonify({'error': 'File type not allowed for task attachments'}), 400

        # Ensure task exists
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Task not found'}), 404

        ext = (file.filename.rsplit('.', 1)[1].lower()) if '.' in file.filename else ''
        stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
        upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, stored_name)
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        content_type = file.content_type or ''

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """INSERT INTO task_attachments (task_id, filename, stored_filename, content_type, file_size)
                   VALUES (%s, %s, %s, %s, %s)""",
                (task_id, secure_filename(file.filename), stored_name, content_type, file_size)
            )
            connection.commit()
            att_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, filename, content_type, file_size FROM task_attachments WHERE id = %s",
                (att_id,)
            )
            row = cursor.fetchone()
        return jsonify(_attachment_to_json(row)), 201
    except Error as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@tasks_bp.route('/api/tasks/attachments/<int:attachment_id>/file', methods=['GET'])
def serve_task_attachment(attachment_id):
    """Serve an attachment file by id."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT stored_filename, filename, content_type FROM task_attachments WHERE id = %s",
                (attachment_id,)
            )
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
        path = os.path.join(upload_dir, row['stored_filename'])
        if not os.path.isfile(path):
            return jsonify({'error': 'File not found'}), 404
        return send_file(
            path,
            mimetype=row.get('content_type') or 'application/octet-stream',
            as_attachment=False,
            download_name=row['filename']
        )
    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/attachments/<int:attachment_id>', methods=['DELETE'])
def delete_task_attachment(task_id, attachment_id):
    """Delete an attachment."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT stored_filename FROM task_attachments WHERE id = %s AND task_id = %s",
                (attachment_id, task_id)
            )
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
        path = os.path.join(upload_dir, row['stored_filename'])
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM task_attachments WHERE id = %s AND task_id = %s", (attachment_id, task_id))
            connection.commit()
        return jsonify({'message': 'Attachment deleted'})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/share', methods=['POST'])
def share_task(task_id):
    """Share a task via email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Validate email format
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            return jsonify({'error': 'Invalid email address'}), 400

        # Get the task
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            task = cursor.fetchone()

            if not task:
                return jsonify({'error': 'Task not found'}), 404

            # Check if email is configured
            email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

            if not email_configured:
                if DEBUG:
                    return jsonify({
                        'success': True,
                        'message': f'Email not configured (debug mode). Task "{task["title"]}" would be shared with {email}'
                    })
                else:
                    return jsonify({'error': 'Email service is not configured. Please contact administrator.'}), 503

            # Build task details for email
            task_date = task['task_date'].strftime('%B %d, %Y') if task.get('task_date') else 'Not set'
            status = task.get('status', 'pending').capitalize()
            category = task.get('category', 'None')
            description = task.get('description', 'No description')
            notes = task.get('notes', '')

            # Send email
            try:
                msg = Message(
                    subject=f"Task Shared: {task['title']}",
                    recipients=[email],
                    body=f"""A task has been shared with you from Task Tracker.

Task: {task['title']}
Status: {status}
Category: {category}
Date: {task_date}

Description:
{description}

{('Notes: ' + notes) if notes else ''}

View your tasks at {FRONTEND_URL}

Best regards,
Task Tracker Team"""
                )
                mail.send(msg)

                return jsonify({
                    'success': True,
                    'message': f'Task shared successfully with {email}'
                })
            except Exception as mail_error:
                print(f"Email sending failed: {mail_error}")
                if DEBUG:
                    return jsonify({
                        'success': True,
                        'message': f'Email service error (debug mode). Task "{task["title"]}" would be shared with {email}'
                    })
                else:
                    return jsonify({'error': 'Failed to send email. Please try again later.'}), 503

    except Exception as e:
        print(f"Share task error: {e}")
        return jsonify({'error': 'Failed to share task'}), 500


# noinspection DuplicatedCode
@tasks_bp.route('/api/drafts', methods=['GET'])
def get_drafts():
    """Get all draft tasks"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                    SELECT *
                    FROM tasks
                    WHERE is_draft = TRUE
                    ORDER BY updated_at DESC \
                    """

            cursor.execute(query)
            drafts = cursor.fetchall()

            # Convert datetime objects to strings and tags to array using helper
            for draft in drafts:
                serialize_task(draft)

            return jsonify(drafts)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export tasks to CSV"""
    try:
        # Get filtering parameters (same as get_tasks)
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query (same logic as get_tasks)
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

            # Create CSV
            output = io.StringIO()
            if tasks:
                fieldnames = list(tasks[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for task in tasks:
                    # sanitize each value to prevent formula injection
                    safe_row = {k: sanitize_csv_field(task.get(k)) for k in fieldnames}
                    writer.writerow(safe_row)

            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500



@tasks_bp.route('/api/export/hours-report', methods=['GET'])
def export_hours_report():
    """Export tasks to CSV in hours report format (compatible with Google Sheets billable hours format)"""
    try:
        # Get filtering parameters
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query (same logic as get_tasks)
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

            # Create CSV in hours report format
            output = io.StringIO()

            # Define hours report format columns
            fieldnames = ['Date', 'Client', 'Task', 'Category', 'Hours', 'Status', 'Notes']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            # Transform tasks into hours report format
            for task in tasks:
                # Parse categories from JSON if it's a string
                categories_str = ''
                if task.get('categories'):
                    try:
                        import json
                        categories_list = json.loads(task['categories']) if isinstance(task['categories'], str) else \
                        task['categories']
                        categories_str = ', '.join(categories_list) if isinstance(categories_list, list) else str(
                            categories_list)
                    except:
                        categories_str = str(task['categories'])

                writer.writerow({
                    'Date': task['task_date'].strftime('%Y-%m-%d') if hasattr(task['task_date'], 'strftime') else str(
                        task['task_date']),
                    'Client': task.get('client', ''),
                    'Task': task.get('title', ''),
                    'Category': categories_str,
                    'Hours': task.get('duration', ''),
                    'Status': task.get('status', ''),
                    'Notes': task.get('notes', '')
                })

            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'hours_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/import/hours-report', methods=['POST'])
def import_hours_report():
    """Import tasks from hours report CSV or Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Read the file based on extension
            if filename.endswith('.csv'):
                # Try different encodings for Hebrew support
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

            # Expected columns: Date, Client, Task, Category, Hours, Status, Notes
            required_columns = ['Date', 'Task']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400

            # Process and import tasks
            imported_count = 0
            errors = []

            with get_db_connection() as connection:
                cursor = connection.cursor()

                for index, row in df.iterrows():
                    try:
                        # Parse date
                        task_date = pd.to_datetime(row['Date'], errors='coerce')
                        if pd.isna(task_date):
                            errors.append(f"Row {index + 2}: Invalid date")
                            continue

                        # Get task details
                        title = str(row['Task']).strip() if pd.notna(row['Task']) else ''
                        if not title:
                            errors.append(f"Row {index + 2}: Missing task title")
                            continue

                        client = str(row.get('Client', '')).strip() if pd.notna(row.get('Client')) else ''
                        category = str(row.get('Category', 'other')).strip() if pd.notna(
                            row.get('Category')) else 'other'
                        duration = row.get('Hours')
                        status = str(row.get('Status', 'completed')).strip().lower() if pd.notna(
                            row.get('Status')) else 'completed'
                        notes = str(row.get('Notes', '')).strip() if pd.notna(row.get('Notes')) else ''

                        # Handle duration - convert to float or None
                        if pd.notna(duration) and duration != '':
                            try:
                                duration = float(duration)
                            except (ValueError, TypeError):
                                duration = None
                        else:
                            duration = None

                        # Insert into database
                        query = """
                                INSERT INTO tasks
                                (title, description, category, categories, client, task_date, task_time,
                                 duration, status, tags, notes)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                                """

                        values = (
                            title,
                            '',  # description
                            category,
                            category,  # categories
                            client,
                            task_date.strftime('%Y-%m-%d'),
                            '00:00:00',  # default time
                            duration,
                            status if status in ['completed', 'uncompleted'] else 'completed',
                            '',  # tags
                            notes
                        )

                        cursor.execute(query, values)
                        imported_count += 1

                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                        continue

                connection.commit()

            # Clean up uploaded file
            os.remove(file_path)

            result = {
                'message': f'Successfully imported {imported_count} task(s)',
                'imported_count': imported_count
            }

            if errors:
                result['errors'] = errors[:10]  # Return first 10 errors
                if len(errors) > 10:
                    result['additional_errors'] = len(errors) - 10

            return jsonify(result), 200

        except Exception as e:
            # Clean up file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about tasks - FILTERED BY USER ROLE"""
    try:
        # CRITICAL: Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username or not user_role:
            return jsonify({'error': 'Unauthorized: username and role required'}), 401
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build WHERE clause based on role
            where_clause = "WHERE 1=1"
            params = []
            
            if user_role == 'shared':
                where_clause += " AND shared = TRUE"
            elif user_role == 'limited':
                where_clause += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)
            # admin: no additional filter

            # Overall stats
            query = f"""
                SELECT COUNT(*) as total_tasks,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                       SUM(CASE WHEN status = 'uncompleted' THEN 1 ELSE 0 END) as uncompleted_tasks,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
            """
            cursor.execute(query, params)
            overall = cursor.fetchone()

            # Stats by category
            query = f"""
                SELECT category,
                       COUNT(*) as count,
                       SUM(duration) as total_duration,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM tasks
                {where_clause}
                GROUP BY category
                ORDER BY count DESC
            """
            cursor.execute(query, params)
            by_category = cursor.fetchall()

            # Stats by client
            query = f"""
                SELECT client,
                       COUNT(*) as count,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
                AND client IS NOT NULL AND client != ''
                GROUP BY client
                ORDER BY count DESC
                LIMIT 10
            """
            cursor.execute(query, params)
            by_client = cursor.fetchall()

            # Monthly stats
            query = f"""
                SELECT DATE_FORMAT(task_date, '%Y-%m') as month,
                       COUNT(*) as count,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
                GROUP BY month
                ORDER BY month DESC
                LIMIT 12
            """
            cursor.execute(query, params)
            monthly = cursor.fetchall()

            # Convert Decimal to float
            if overall['total_duration']:
                overall['total_duration'] = float(overall['total_duration'])

            for item in by_category:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            for item in by_client:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            for item in monthly:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            return jsonify({
                'overall': overall,
                'by_category': by_category,
                'by_client': by_client,
                'monthly': monthly
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/categories', methods=['GET', 'POST'])
def manage_categories():
    """Get list of categories or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own categories OR categories with no owner (shared)
                    query = """
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY label
                    """
                    cursor.execute(query, (username,))
                else:
                    # Admin and shared users see all categories
                    cursor.execute("""
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        ORDER BY label
                    """)

                categories = cursor.fetchall()
                return jsonify(categories)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            category_id = data.get('id', '').strip().lower().replace(' ', '-')
            label = data.get('label', '').strip()
            color = data.get('color', '#0d6efd')
            icon = data.get('icon', '📝')
            owner = data.get('owner')  # Get owner from request

            if not category_id or not label:
                return jsonify({'error': 'Category ID and label are required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO categories_master (category_id, label, color, icon, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (category_id, label, color, icon, owner))
                connection.commit()

                return jsonify({
                    'id': category_id,
                    'label': label,
                    'color': color,
                    'icon': icon
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Category already exists'}), 409
            return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/categories/<category_id>', methods=['PUT', 'DELETE'])
def update_delete_category(category_id):
    """Update or delete a category"""
    if request.method == 'PUT':
        try:
            data = request.json
            label = data.get('label', '').strip()
            color = data.get('color')
            icon = data.get('icon')

            if not label:
                return jsonify({'error': 'Label is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               UPDATE categories_master
                               SET label = %s,
                                   color = %s,
                                   icon  = %s
                               WHERE category_id = %s
                               """, (label, color, icon, category_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               DELETE
                               FROM categories_master
                               WHERE category_id = %s
                               """, (category_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tags', methods=['GET', 'POST'])
def manage_tags():
    """Get list of tags or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Auto-seed tags table from tasks.tags if table is empty
                cursor.execute("SELECT COUNT(*) as cnt FROM tags")
                if cursor.fetchone()['cnt'] == 0:
                    cursor.execute("SELECT DISTINCT tags FROM tasks WHERE tags IS NOT NULL AND tags != ''")
                    all_tag_names = set()
                    for row in cursor.fetchall():
                        for t in row['tags'].split(','):
                            t = t.strip()
                            if t:
                                all_tag_names.add(t)
                    for tag_name in all_tag_names:
                        cursor.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (tag_name,))
                    connection.commit()

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own tags OR tags with no owner (shared)
                    query = """
                        SELECT id, name, color
                        FROM tags
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """
                    cursor.execute(query, (username,))
                else:
                    # Admin and shared users see all tags
                    cursor.execute("""
                        SELECT id, name, color
                        FROM tags
                        ORDER BY name
                    """)

                tags = cursor.fetchall()
                return jsonify(tags)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color', '#0d6efd')
            owner = data.get('owner')  # Get owner from request

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO tags (name, color, owner)
                               VALUES (%s, %s, %s)
                               """, (name, color, owner))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'color': color
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Tag already exists'}), 409
            return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tags/<int:tag_id>', methods=['PUT', 'DELETE'])
def update_delete_tag(tag_id):
    """Update or delete a tag"""
    if request.method == 'PUT':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color')

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               UPDATE tags
                               SET name  = %s,
                                   color = %s
                               WHERE id = %s
                               """, (name, color, tag_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               DELETE
                               FROM tags
                               WHERE id = %s
                               """, (tag_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/clients', methods=['GET', 'POST'])
def manage_clients_list():
    """Get list of clients or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own clients OR clients with no owner
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """, (username,))
                    clients_from_table = cursor.fetchall()

                    # Also get clients from their own tasks
                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND created_by = %s
                          AND client NOT IN (SELECT name FROM clients WHERE owner = %s OR owner IS NULL)
                        ORDER BY client
                    """, (username, username))
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]
                else:
                    # Admin and shared users see all clients
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        ORDER BY name
                    """)
                    clients_from_table = cursor.fetchall()

                    # Also get clients that only exist in tasks table
                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND client NOT IN (SELECT name FROM clients)
                        ORDER BY client
                    """)
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]

                # Combine both lists
                all_clients = clients_from_table + [{'name': c} for c in clients_from_tasks]

                return jsonify(all_clients)

        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            owner = data.get('owner')  # Get owner from request

            if not name:
                return jsonify({'error': 'Client name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO clients (name, email, phone, notes, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (
                                   name,
                                   data.get('email', ''),
                                   data.get('phone', ''),
                                   data.get('notes', ''),
                                   owner
                               ))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'email': data.get('email', ''),
                    'phone': data.get('phone', ''),
                    'notes': data.get('notes', '')
                }), 201

        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Client already exists'}), 409
            return jsonify({'error': str(e)}), 500


