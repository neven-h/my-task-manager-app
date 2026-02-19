from flask import Blueprint, request, jsonify
from config import (
    get_db_connection, serialize_task, token_required, admin_required,
    DEBUG, app, mail, FRONTEND_URL,
)
from mysql.connector import Error
from datetime import datetime
import re

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
# Tasks CRUD
# ================================

@tasks_bp.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks(payload):
    """Get all tasks with optional filtering"""
    try:
        username = payload['username']
        user_role = payload['role']

        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        shared_only = request.args.get('shared')
        include_drafts = request.args.get('include_drafts', 'false')
        has_attachment = request.args.get('has_attachment')
        
        # Pagination parameters - only paginate if explicitly requested
        page = request.args.get('page')
        per_page = request.args.get('per_page')
        use_pagination = page is not None or per_page is not None
        
        if use_pagination:
            page = int(page) if page else 1
            per_page = min(int(per_page) if per_page else 100, 500)  # Max 500 per page
            offset = (page - 1) * per_page

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build WHERE clause for filtering (shared by both SELECT and COUNT queries)
            where_clause = "WHERE 1=1"
            params = []

            if include_drafts != 'true':
                where_clause += " AND (is_draft = FALSE OR is_draft IS NULL)"

            if user_role == 'shared':
                where_clause += " AND shared = TRUE"
            elif user_role == 'limited':
                where_clause += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)

            if DEBUG:
                print(f"User: {username}, Role: {user_role}, Where: {where_clause}, Params: {params}")

            if shared_only == 'true':
                where_clause += " AND shared = TRUE"

            if category and category != 'all':
                where_clause += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                where_clause += " AND status = %s"
                params.append(status)

            if client:
                where_clause += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                where_clause += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                where_clause += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                where_clause += " AND task_date <= %s"
                params.append(date_end)

            if has_attachment == 'true':
                where_clause += " AND id IN (SELECT DISTINCT task_id FROM task_attachments)"

            # Build SELECT query with ORDER BY
            query = f"SELECT * FROM tasks {where_clause} ORDER BY task_date DESC, task_time DESC, created_at DESC"
            
            # Only add pagination if explicitly requested
            if use_pagination:
                # Build efficient COUNT query (same WHERE clause, no ORDER BY)
                count_query = f"SELECT COUNT(*) as total FROM tasks {where_clause}"
                
                cursor.execute(count_query, params)
                total_count = cursor.fetchone()['total']
                
                # Add pagination
                query += " LIMIT %s OFFSET %s"
                params.extend([per_page, offset])

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            for task in tasks:
                serialize_task(task)

            if tasks:
                task_ids = [t['id'] for t in tasks]
                placeholders = ','.join(['%s'] * len(task_ids))
                cursor.execute(
                    f"SELECT id, task_id, filename, content_type, file_size, cloudinary_url FROM task_attachments WHERE task_id IN ({placeholders}) ORDER BY task_id, id",
                    task_ids
                )
                att_rows = cursor.fetchall()
                att_by_task = {}
                for r in att_rows:
                    tid = r['task_id']
                    if tid not in att_by_task:
                        att_by_task[tid] = []
                    att_by_task[tid].append({
                        'id': r['id'],
                        'filename': r['filename'],
                        'content_type': r.get('content_type') or '',
                        'file_size': r.get('file_size'),
                        'url': r.get('cloudinary_url') or f"/api/tasks/attachments/{r['id']}/file",
                    })
                for task in tasks:
                    task['attachments'] = att_by_task.get(task['id'], [])

            # Return paginated format only if pagination was requested
            if use_pagination:
                return jsonify({
                    'tasks': tasks,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': total_count,
                        'total_pages': (total_count + per_page - 1) // per_page
                    }
                })
            else:
                # Backward compatible: return array for clients not using pagination
                return jsonify(tasks)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks', methods=['POST'])
@token_required
def create_task(payload):
    """Create a new task"""
    try:
        username = payload['username']
        data = request.json

        task_time = data.get('task_time')
        if not task_time:
            task_time = datetime.now().strftime('%H:%M:%S')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """

            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            tags = data.get('tags', [])
            tags_list = tags if isinstance(tags, list) else [t.strip() for t in tags.split(',') if t.strip()]
            tags_str = ','.join(tags_list)

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
                username
            )

            cursor.execute(query, values)
            _sync_tags_to_table(cursor, tags_list)
            connection.commit()

            return jsonify({'id': cursor.lastrowid, 'message': 'Task created successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(payload, task_id):
    """Update an existing task"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check: non-admin users can only edit their own tasks
            if user_role != 'admin':
                cursor.execute("SELECT created_by FROM tasks WHERE id = %s", (task_id,))
                row = cursor.fetchone()
                if not row:
                    return jsonify({'error': 'Task not found'}), 404
                if row['created_by'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            query = """
                    UPDATE tasks
                    SET title       = %s,
                        description = %s,
                        category    = %s,
                        categories  = %s,
                        client      = %s,
                        task_date   = %s,
                        task_time   = %s,
                        duration    = %s,
                        status      = %s,
                        tags        = %s,
                        notes       = %s,
                        shared      = %s,
                        is_draft    = %s
                    WHERE id = %s
                    """

            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            tags = data.get('tags', [])
            tags_list = tags if isinstance(tags, list) else [t.strip() for t in tags.split(',') if t.strip()]
            tags_str = ','.join(tags_list)

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
@token_required
def delete_task(payload, task_id):
    """Delete a task"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check: non-admin users can only delete their own tasks
            if user_role != 'admin':
                cursor.execute("SELECT created_by FROM tasks WHERE id = %s", (task_id,))
                row = cursor.fetchone()
                if not row:
                    return jsonify({'error': 'Task not found'}), 404
                if row['created_by'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404

            return jsonify({'message': 'Task deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/toggle-status', methods=['PATCH'])
@token_required
def toggle_task_status(payload, task_id):
    """Toggle task completion status"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("SELECT status, created_by FROM tasks WHERE id = %s", (task_id,))
            result = cursor.fetchone()

            if not result:
                return jsonify({'error': 'Task not found'}), 404

            # Ownership check
            if user_role != 'admin' and result['created_by'] != username:
                return jsonify({'error': 'Access denied'}), 403

            current_status = result['status']
            new_status = 'completed' if current_status == 'uncompleted' else 'uncompleted'

            cursor = connection.cursor()
            cursor.execute("UPDATE tasks SET status = %s WHERE id = %s", (new_status, task_id))
            connection.commit()

            return jsonify({'message': 'Status updated successfully', 'status': new_status})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/api/tasks/<int:task_id>/duplicate', methods=['POST'])
@token_required
def duplicate_task(payload, task_id):
    """Duplicate an existing task"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            original_task = cursor.fetchone()

            if not original_task:
                return jsonify({'error': 'Task not found'}), 404

            # Ownership check: non-admin users can only duplicate their own tasks
            if user_role != 'admin' and original_task.get('created_by') != username:
                return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """

            values = (
                f"Copy of {original_task['title']}",
                original_task['description'],
                original_task['category'],
                original_task['categories'],
                original_task['client'],
                datetime.now().date(),
                datetime.now().time(),
                original_task['duration'],
                'uncompleted',
                original_task['tags'],
                original_task['notes'],
                original_task['shared'],
                False,
                username
            )

            cursor.execute(query, values)
            connection.commit()

            return jsonify({'message': 'Task duplicated successfully', 'id': cursor.lastrowid}), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ================================
# Share & Drafts
# ================================

@tasks_bp.route('/api/tasks/<int:task_id>/share', methods=['POST'])
@token_required
def share_task(payload, task_id):
    """Share a task via email"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            return jsonify({'error': 'Invalid email address'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            task = cursor.fetchone()

            if not task:
                return jsonify({'error': 'Task not found'}), 404

            # Ownership check: non-admin users can only share their own tasks
            if user_role != 'admin' and task.get('created_by') != username:
                return jsonify({'error': 'Access denied'}), 403

            email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

            if not email_configured:
                if DEBUG:
                    return jsonify({'success': True, 'message': f'Email not configured (debug mode). Task "{task["title"]}" would be shared with {email}'})
                else:
                    return jsonify({'error': 'Email service is not configured. Please contact administrator.'}), 503

            task_date = task['task_date'].strftime('%B %d, %Y') if task.get('task_date') else 'Not set'
            notes = task.get('notes', '')

            try:
                from flask_mail import Message
                msg = Message(
                    subject=f"Task Shared: {task['title']}",
                    recipients=[email],
                    body=f"""A task has been shared with you from Task Tracker.

Task: {task['title']}
Status: {task.get('status', 'pending').capitalize()}
Category: {task.get('category', 'None')}
Date: {task_date}

Description:
{task.get('description', 'No description')}

{('Notes: ' + notes) if notes else ''}

View your tasks at {FRONTEND_URL}

Best regards,
Task Tracker Team"""
                )
                mail.send(msg)
                return jsonify({'success': True, 'message': f'Task shared successfully with {email}'})
            except Exception as mail_error:
                print(f"Email sending failed: {mail_error}")
                if DEBUG:
                    return jsonify({'success': True, 'message': f'Email service error (debug mode). Task "{task["title"]}" would be shared with {email}'})
                else:
                    return jsonify({'error': 'Failed to send email. Please try again later.'}), 503

    except Exception as e:
        print(f"Share task error: {e}")
        return jsonify({'error': 'Failed to share task'}), 500


@tasks_bp.route('/api/drafts', methods=['GET'])
@token_required
def get_drafts(payload):
    """Get draft tasks for the authenticated user"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            if user_role == 'admin':
                cursor.execute("SELECT * FROM tasks WHERE is_draft = TRUE ORDER BY updated_at DESC")
            else:
                cursor.execute(
                    "SELECT * FROM tasks WHERE is_draft = TRUE AND created_by = %s ORDER BY updated_at DESC",
                    (username,)
                )
            drafts = cursor.fetchall()

            for draft in drafts:
                serialize_task(draft)

            return jsonify(drafts)

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ================================
# Stats
# ================================

@tasks_bp.route('/api/stats', methods=['GET'])
@token_required
def get_stats(payload):
    """Get statistics about tasks - filtered by user role"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            where_clause = "WHERE 1=1"
            params = []

            if user_role == 'shared':
                where_clause += " AND shared = TRUE"
            elif user_role == 'limited':
                where_clause += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)

            cursor.execute(f"""
                SELECT COUNT(*) as total_tasks,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                       SUM(CASE WHEN status = 'uncompleted' THEN 1 ELSE 0 END) as uncompleted_tasks,
                       SUM(duration) as total_duration
                FROM tasks {where_clause}
            """, params)
            overall = cursor.fetchone()

            cursor.execute(f"""
                SELECT category, COUNT(*) as count, SUM(duration) as total_duration,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM tasks {where_clause}
                GROUP BY category ORDER BY count DESC
            """, params)
            by_category = cursor.fetchall()

            cursor.execute(f"""
                SELECT client, COUNT(*) as count, SUM(duration) as total_duration
                FROM tasks {where_clause}
                AND client IS NOT NULL AND client != ''
                GROUP BY client ORDER BY count DESC LIMIT 10
            """, params)
            by_client = cursor.fetchall()

            cursor.execute(f"""
                SELECT DATE_FORMAT(task_date, '%Y-%m') as month,
                       COUNT(*) as count, SUM(duration) as total_duration
                FROM tasks {where_clause}
                GROUP BY month ORDER BY month DESC LIMIT 12
            """, params)
            monthly = cursor.fetchall()

            for collection in [overall], by_category, by_client, monthly:
                for item in (collection if isinstance(collection, list) else [collection]):
                    if item and item.get('total_duration'):
                        item['total_duration'] = float(item['total_duration'])

            return jsonify({
                'overall': overall,
                'by_category': by_category,
                'by_client': by_client,
                'monthly': monthly
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500
