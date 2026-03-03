from flask import Blueprint, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

tasks_analytics_bp = Blueprint('tasks_analytics', __name__)


# ================================
# Stats
# ================================

@tasks_analytics_bp.route('/api/stats', methods=['GET'])
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
        current_app.logger.error('tasks db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
