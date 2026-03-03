from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, token_required,
)
from mysql.connector import Error
from datetime import datetime
import re

from routes.tasks import _sync_tags_to_table

tasks_write_bp = Blueprint('tasks_write', __name__)


# ================================
# Tasks WRITE
# ================================

@tasks_write_bp.route('/api/tasks', methods=['POST'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@tasks_write_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
