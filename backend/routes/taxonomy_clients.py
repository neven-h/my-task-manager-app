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

                if user_role == 'limited':
                    # Limited users only see their own clients
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        WHERE owner = %s
                        ORDER BY name
                    """, (username,))
                    clients_from_table = cursor.fetchall()

                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND created_by = %s
                          AND client NOT IN (SELECT name FROM clients WHERE owner = %s)
                        ORDER BY client
                    """, (username, username))
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]
                else:
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        ORDER BY name
                    """)
                    clients_from_table = cursor.fetchall()

                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND client NOT IN (SELECT name FROM clients)
                        ORDER BY client
                    """)
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]

                all_clients = clients_from_table + [{'name': c} for c in clients_from_tasks]
                return jsonify(all_clients)

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
