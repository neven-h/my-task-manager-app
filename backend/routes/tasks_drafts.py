from flask import Blueprint, jsonify, current_app
from config import get_db_connection, serialize_task, token_required
from mysql.connector import Error

tasks_drafts_bp = Blueprint('tasks_drafts', __name__)


@tasks_drafts_bp.route('/api/drafts', methods=['GET'])
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

            if drafts:
                draft_ids = [d['id'] for d in drafts]
                placeholders = ','.join(['%s'] * len(draft_ids))
                cursor.execute(
                    f"SELECT id, task_id, filename, content_type, file_size, cloudinary_url FROM task_attachments WHERE task_id IN ({placeholders}) ORDER BY task_id, id",
                    draft_ids
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
                for draft in drafts:
                    draft['attachments'] = att_by_task.get(draft['id'], [])

            return jsonify(drafts)

    except Error as e:
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
