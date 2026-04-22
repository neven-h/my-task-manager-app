from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, serialize_task, token_required,
    DEBUG,
)
from mysql.connector import Error

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
# Tasks READ
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
