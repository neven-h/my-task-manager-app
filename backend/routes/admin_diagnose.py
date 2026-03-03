from flask import Blueprint, jsonify, current_app
from config import get_db_connection, admin_required
from mysql.connector import Error

admin_diagnose_bp = Blueprint('admin_diagnose', __name__)


@admin_diagnose_bp.route('/api/migrate-user-ownership', methods=['POST'])
@admin_required
def migrate_user_ownership(payload):
    """Add owner column to categories_master, tags, and clients tables for user isolation"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("""
                ALTER TABLE categories_master
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            cursor.execute("""
                ALTER TABLE tags
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            cursor.execute("""
                ALTER TABLE clients
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            connection.commit()

            return jsonify({
                'success': True,
                'message': 'Database migrated successfully - user ownership columns added'
            })

    except Error as e:
        current_app.logger.error('admin migration error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_diagnose_bp.route('/api/admin/diagnose-tasks', methods=['GET'])
@admin_required
def diagnose_tasks(payload):
    """Show task counts grouped by created_by to identify orphaned (NULL) tasks."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT
                    COALESCE(created_by, '(NULL - orphaned)') AS created_by,
                    COUNT(*)           AS task_count,
                    MIN(task_date)     AS oldest,
                    MAX(task_date)     AS newest
                FROM tasks
                GROUP BY created_by
                ORDER BY task_count DESC
            """)
            rows = cursor.fetchall()
            for r in rows:
                if r.get('oldest'):
                    r['oldest'] = r['oldest'].isoformat()
                if r.get('newest'):
                    r['newest'] = r['newest'].isoformat()

            cursor.execute("SELECT COUNT(*) AS total FROM tasks")
            total = cursor.fetchone()['total']

            return jsonify({'total_tasks': total, 'breakdown': rows})

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@admin_diagnose_bp.route('/api/admin/repair-task-ownership', methods=['POST'])
@admin_required
def repair_task_ownership(payload):
    """
    Claim all tasks with created_by = NULL for the admin user.
    Safe to run multiple times (only affects NULL rows).
    """
    try:
        admin_username = payload['username']
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("""
                UPDATE tasks
                SET created_by = %s
                WHERE created_by IS NULL
            """, (admin_username,))
            connection.commit()
            claimed = cursor.rowcount

        return jsonify({
            'success': True,
            'claimed_tasks': claimed,
            'assigned_to': admin_username,
            'message': f'{claimed} orphaned task(s) assigned to {admin_username}'
        })

    except Error as e:
        current_app.logger.error('admin db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
