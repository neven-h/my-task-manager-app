from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from mysql.connector import Error

taxonomy_bp = Blueprint('taxonomy', __name__)


# ================================
# Categories
# ================================

@taxonomy_bp.route('/api/categories', methods=['GET', 'POST'])
@token_required
def manage_categories(payload):
    """Get list of categories or create a new one"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                if user_role == 'limited':
                    # Limited users only see their own categories OR categories with no owner (shared)
                    cursor.execute("""
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY label
                    """, (username,))
                else:
                    cursor.execute("""
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        ORDER BY label
                    """)

                return jsonify(cursor.fetchall())
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            category_id = data.get('id', '').strip().lower().replace(' ', '-')
            label = data.get('label', '').strip()
            color = data.get('color', '#0d6efd')
            icon = data.get('icon', '📝')
            owner = username if user_role != 'admin' else None

            if not category_id or not label:
                return jsonify({'error': 'Category ID and label are required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO categories_master (category_id, label, color, icon, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (category_id, label, color, icon, owner))
                connection.commit()

                return jsonify({'id': category_id, 'label': label, 'color': color, 'icon': icon}), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Category already exists'}), 409
            return jsonify({'error': str(e)}), 500


@taxonomy_bp.route('/api/categories/<category_id>', methods=['PUT', 'DELETE'])
@token_required
def update_delete_category(payload, category_id):
    """Update or delete a category"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'PUT':
        try:
            data = request.json
            label = data.get('label', '').strip()
            color = data.get('color')
            icon = data.get('icon')

            if not label:
                return jsonify({'error': 'Label is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                if user_role != 'admin':
                    cursor.execute("SELECT owner FROM categories_master WHERE category_id = %s", (category_id,))
                    row = cursor.fetchone()
                    if not row:
                        return jsonify({'error': 'Category not found'}), 404
                    if row['owner'] != username:
                        return jsonify({'error': 'Access denied'}), 403

                cursor.execute("""
                               UPDATE categories_master
                               SET label = %s, color = %s, icon = %s
                               WHERE category_id = %s
                               """, (label, color, icon, category_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                if user_role != 'admin':
                    cursor.execute("SELECT owner FROM categories_master WHERE category_id = %s", (category_id,))
                    row = cursor.fetchone()
                    if not row:
                        return jsonify({'error': 'Category not found'}), 404
                    if row['owner'] != username:
                        return jsonify({'error': 'Access denied'}), 403

                cursor.execute("DELETE FROM categories_master WHERE category_id = %s", (category_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


# ================================
# Tags
# ================================

@taxonomy_bp.route('/api/tags', methods=['GET', 'POST'])
@token_required
def manage_tags(payload):
    """Get list of tags or create a new one"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Auto-seed tags table from tasks.tags if table is empty
                cursor.execute("SELECT COUNT(*) as cnt FROM tags")
                if cursor.fetchone()['cnt'] == 0:
                    cursor.execute("SELECT DISTINCT tags FROM tasks WHERE tags IS NOT NULL AND tags != ''")
                    all_tag_names = set()
                    for row in cursor.fetchall():
                        for t in row['tags'].split(','):
                            t = t.strip()
                            if t:
                                all_tag_names.add(t)
                    for tag_name in all_tag_names:
                        cursor.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (tag_name,))
                    connection.commit()

                if user_role == 'limited':
                    cursor.execute("""
                        SELECT id, name, color FROM tags
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """, (username,))
                else:
                    cursor.execute("SELECT id, name, color FROM tags ORDER BY name")

                return jsonify(cursor.fetchall())
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color', '#0d6efd')
            owner = username if user_role != 'admin' else None

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("INSERT INTO tags (name, color, owner) VALUES (%s, %s, %s)", (name, color, owner))
                connection.commit()

                return jsonify({'id': cursor.lastrowid, 'name': name, 'color': color}), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Tag already exists'}), 409
            return jsonify({'error': str(e)}), 500


@taxonomy_bp.route('/api/tags/<int:tag_id>', methods=['PUT', 'DELETE'])
@token_required
def update_delete_tag(payload, tag_id):
    """Update or delete a tag"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'PUT':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color')

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                if user_role != 'admin':
                    cursor.execute("SELECT owner FROM tags WHERE id = %s", (tag_id,))
                    row = cursor.fetchone()
                    if not row:
                        return jsonify({'error': 'Tag not found'}), 404
                    if row['owner'] != username:
                        return jsonify({'error': 'Access denied'}), 403

                cursor.execute("UPDATE tags SET name = %s, color = %s WHERE id = %s", (name, color, tag_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                if user_role != 'admin':
                    cursor.execute("SELECT owner FROM tags WHERE id = %s", (tag_id,))
                    row = cursor.fetchone()
                    if not row:
                        return jsonify({'error': 'Tag not found'}), 404
                    if row['owner'] != username:
                        return jsonify({'error': 'Access denied'}), 403

                cursor.execute("DELETE FROM tags WHERE id = %s", (tag_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


# ================================
# Clients
# ================================

@taxonomy_bp.route('/api/clients', methods=['GET', 'POST'])
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
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """, (username,))
                    clients_from_table = cursor.fetchall()

                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND created_by = %s
                          AND client NOT IN (SELECT name FROM clients WHERE owner = %s OR owner IS NULL)
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
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            owner = username if user_role != 'admin' else None

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
            return jsonify({'error': str(e)}), 500
