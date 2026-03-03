from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error
from datetime import datetime

tasks_actions_bp = Blueprint('tasks_actions', __name__)


# ================================
# Tasks ACTIONS
# ================================

@tasks_actions_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@tasks_actions_bp.route('/api/tasks/<int:task_id>/toggle-status', methods=['PATCH'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@tasks_actions_bp.route('/api/tasks/<int:task_id>/duplicate', methods=['POST'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
