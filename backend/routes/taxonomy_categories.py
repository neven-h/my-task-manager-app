from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

taxonomy_categories_bp = Blueprint('taxonomy_categories', __name__)


# ================================
# Categories
# ================================

@taxonomy_categories_bp.route('/api/categories', methods=['GET', 'POST'])
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
                    # Limited users only see their own categories
                    cursor.execute("""
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        WHERE owner = %s
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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            category_id = data.get('id', '').strip().lower().replace(' ', '-')
            label = data.get('label', '').strip()
            color = data.get('color', '#0d6efd')
            icon = data.get('icon', '\U0001f4dd')
            owner = username

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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500


@taxonomy_categories_bp.route('/api/categories/<category_id>', methods=['PUT', 'DELETE'])
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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

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
            current_app.logger.error('taxonomy db error: %s', e, exc_info=True)
            return jsonify({'error': 'A database error occurred'}), 500
