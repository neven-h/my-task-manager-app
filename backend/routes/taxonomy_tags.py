from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

taxonomy_tags_bp = Blueprint('taxonomy_tags', __name__)


# ================================
# Tags
# ================================

@taxonomy_tags_bp.route('/api/tags', methods=['GET', 'POST'])
@token_required
def manage_tags(payload):
    """Get list of tags or create a new one"""
    username = payload['username']
    user_role = payload['role']

    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Auto-seed tags from tasks only for this user if they have no tags yet
                cursor.execute("SELECT COUNT(*) as cnt FROM tags WHERE owner = %s", (username,))
                if cursor.fetchone()['cnt'] == 0:
                    cursor.execute("""
                        SELECT DISTINCT tags FROM tasks
                        WHERE tags IS NOT NULL AND tags != '' AND created_by = %s
                    """, (username,))
                    all_tag_names = set()
                    for row in cursor.fetchall():
                        for t in row['tags'].split(','):
                            t = t.strip()
                            if t:
                                all_tag_names.add(t)
                    for tag_name in all_tag_names:
                        cursor.execute("INSERT IGNORE INTO tags (name, owner) VALUES (%s, %s)", (tag_name, username))
                    connection.commit()

                cursor.execute("""
                    SELECT id, name, color FROM tags
                    WHERE owner = %s
                    ORDER BY name
                """, (username,))
                return jsonify(cursor.fetchall())
        except Error as e:
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color', '#0d6efd')
            owner = username

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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500


@taxonomy_tags_bp.route('/api/tags/<int:tag_id>', methods=['PUT', 'DELETE'])
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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500
