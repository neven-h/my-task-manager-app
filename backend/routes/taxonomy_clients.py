from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

taxonomy_clients_bp = Blueprint('taxonomy_clients', __name__)


# ================================
# Clients
# ================================

@taxonomy_clients_bp.route('/api/clients', methods=['GET', 'POST'])
@token_required
def manage_clients_list(payload):
    """Get list of clients or create a new one"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Fetch all distinct client names from the clients table
                # AND from this user's tasks, then compute stats in one query.
                cursor.execute("""
                    SELECT
                        client_name                          AS client,
                        COALESCE(c.email, '')                AS email,
                        COALESCE(c.phone, '')                AS phone,
                        COALESCE(c.notes, '')                AS notes,
                        COUNT(t.id)                          AS task_count,
                        COALESCE(SUM(t.duration), 0)         AS total_hours,
                        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks
                    FROM (
                        -- Union: names from the clients table + names only in tasks
                        SELECT name AS client_name FROM clients WHERE owner = %s
                        UNION
                        SELECT DISTINCT client AS client_name
                        FROM tasks
                        WHERE client IS NOT NULL AND client != ''
                          AND created_by = %s
                    ) AS all_names
                    LEFT JOIN clients c
                        ON c.name = all_names.client_name AND c.owner = %s
                    LEFT JOIN tasks t
                        ON t.client = all_names.client_name AND t.created_by = %s
                    GROUP BY client_name, c.email, c.phone, c.notes
                    ORDER BY client_name
                """, (username, username, username, username))

                return jsonify(cursor.fetchall())

        except Error as e:
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            owner = username

            if not name:
                return jsonify({'error': 'Client name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO clients (name, email, phone, notes, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (name, data.get('email', ''), data.get('phone', ''), data.get('notes', ''), owner))
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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500
