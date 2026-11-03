from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

task_folders_bp = Blueprint('task_folders', __name__)

COLOR_DEFAULT = '#0000FF'


def _clean_payload(data):
    """Return ((name, color, categories), None), or (None, message) when the body is invalid."""
    name = (data.get('name') or '').strip()
    if not name or len(name) > 100:
        return None, 'Folder name is required (max 100 characters)'
    color = data.get('color') or COLOR_DEFAULT
    if not (isinstance(color, str) and len(color) == 7 and color.startswith('#')):
        color = COLOR_DEFAULT
    categories = data.get('categories') or []
    if not isinstance(categories, list):
        return None, 'categories must be a list'
    categories = sorted({str(c).strip()[:50] for c in categories if str(c).strip()})
    return (name, color, categories), None


def _set_categories(cursor, folder_id, owner, categories):
    """Make the folder hold exactly these categories, moving them out of any other folder."""
    cursor.execute("DELETE FROM task_folder_categories WHERE folder_id = %s AND owner = %s", (folder_id, owner))
    if not categories:
        return
    placeholders = ', '.join(['%s'] * len(categories))
    cursor.execute(
        f"DELETE FROM task_folder_categories WHERE owner = %s AND category_id IN ({placeholders})",
        (owner, *categories),
    )
    cursor.executemany(
        "INSERT INTO task_folder_categories (folder_id, owner, category_id) VALUES (%s, %s, %s)",
        [(folder_id, owner, c) for c in categories],
    )


def _list_folders(cursor, owner):
    cursor.execute(
        "SELECT id, name, color, position FROM task_folders WHERE owner = %s ORDER BY position, name",
        (owner,),
    )
    folders = cursor.fetchall()
    cursor.execute("SELECT folder_id, category_id FROM task_folder_categories WHERE owner = %s", (owner,))
    by_folder = {}
    for row in cursor.fetchall():
        by_folder.setdefault(row['folder_id'], []).append(row['category_id'])
    for f in folders:
        f['categories'] = sorted(by_folder.get(f['id'], []))
    return folders


@task_folders_bp.route('/api/task-folders', methods=['GET', 'POST'])
@token_required
def manage_folders(payload):
    """List the user's folders or create one."""
    owner = payload['username']
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if request.method == 'GET':
                return jsonify(_list_folders(cursor, owner))

            cleaned, problem = _clean_payload(request.json or {})
            if problem:
                return jsonify({'error': problem}), 400
            name, color, categories = cleaned
            cursor.execute("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM task_folders WHERE owner = %s", (owner,))
            position = cursor.fetchone()['pos']
            cursor.execute(
                "INSERT INTO task_folders (owner, name, color, position) VALUES (%s, %s, %s, %s)",
                (owner, name, color, position),
            )
            folder_id = cursor.lastrowid
            _set_categories(cursor, folder_id, owner, categories)
            connection.commit()
            return jsonify({'id': folder_id, 'name': name, 'color': color, 'position': position, 'categories': categories}), 201
    except Error as e:
        current_app.logger.error('task folders db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@task_folders_bp.route('/api/task-folders/<int:folder_id>', methods=['PUT', 'DELETE'])
@token_required
def update_delete_folder(payload, folder_id):
    """Rename/recolor a folder and replace its categories, or delete it (its tasks are kept)."""
    owner = payload['username']
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id FROM task_folders WHERE id = %s AND owner = %s", (folder_id, owner))
            if not cursor.fetchone():
                return jsonify({'error': 'Folder not found'}), 404

            if request.method == 'DELETE':
                cursor.execute("DELETE FROM task_folders WHERE id = %s AND owner = %s", (folder_id, owner))
                connection.commit()
                return jsonify({'success': True})

            cleaned, problem = _clean_payload(request.json or {})
            if problem:
                return jsonify({'error': problem}), 400
            name, color, categories = cleaned
            cursor.execute(
                "UPDATE task_folders SET name = %s, color = %s WHERE id = %s AND owner = %s",
                (name, color, folder_id, owner),
            )
            _set_categories(cursor, folder_id, owner, categories)
            connection.commit()
            return jsonify({'success': True})
    except Error as e:
        current_app.logger.error('task folders db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
