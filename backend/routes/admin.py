from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, handle_error, DEBUG, init_db, admin_required
from mysql.connector import Error

admin_bp = Blueprint('admin', __name__)

# ============ CLIENT MANAGEMENT ENDPOINTS ============

@admin_bp.route('/api/clients/manage', methods=['GET'])
@admin_required
def get_all_clients_with_stats(payload):
    """Get all clients with their billable hours statistics"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT client,
                                  COUNT(*)                                                     as task_count,
                                  SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as total_hours,
                                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)        as completed_tasks
                           FROM tasks
                           WHERE client IS NOT NULL
                             AND client != ''
                           GROUP BY client
                           ORDER BY client
                           """)

            clients = cursor.fetchall()

            for client in clients:
                if client.get('total_hours') is not None:
                    client['total_hours'] = float(client['total_hours'])
                else:
                    client['total_hours'] = 0.0

            return jsonify(clients)

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>', methods=['PUT'])
@admin_required
def rename_client(payload, client_name):
    """Rename a client across all tasks"""
    try:
        data = request.json
        new_name = data.get('new_name')

        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("UPDATE tasks SET client = %s WHERE client = %s", (new_name, client_name))
            connection.commit()

            return jsonify({
                'message': 'Client renamed successfully',
                'updated_count': cursor.rowcount
            })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>', methods=['DELETE'])
@admin_required
def delete_client(payload, client_name):
    """Delete all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM tasks WHERE client = %s", (client_name,))
            connection.commit()

            return jsonify({'message': f'{cursor.rowcount} tasks deleted successfully'})

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_bp.route('/api/clients/<client_name>/tasks', methods=['GET'])
@admin_required
def get_client_tasks(payload, client_name):
    """Get all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT *
                           FROM tasks
                           WHERE client = %s
                           ORDER BY task_date DESC, task_time DESC
                           """, (client_name,))

            tasks = cursor.fetchall()

            for task in tasks:
                if task.get('task_date'):
                    task['task_date'] = task['task_date'].strftime('%Y-%m-%d')
                if task.get('task_time'):
                    task['task_time'] = str(task['task_time'])

            return jsonify(tasks)

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


# Initialize database on import (works with gunicorn)
try:
    init_db()
    print("✓ Database initialized successfully")
except Exception as e:
    print(f"⚠ Warning: Database initialization failed: {e}")
    print("⚠ App will start but database operations will fail until MySQL is configured")
