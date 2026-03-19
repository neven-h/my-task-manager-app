from flask import Blueprint, request, jsonify, send_file, current_app, redirect
from config import (
    get_db_connection, TASK_ATTACHMENTS_FOLDER, CLOUDINARY_ENABLED,
    token_required, verify_jwt_token,
)
import cloudinary.uploader
from mysql.connector import Error
import os

attachments_serve_bp = Blueprint('attachments_serve', __name__)


@attachments_serve_bp.route('/api/tasks/attachments/<int:attachment_id>/file', methods=['GET'])
def serve_task_attachment(attachment_id):
    """Serve an attachment file by id.

    Accepts auth via Authorization header OR ?token= query param.
    The query-param form is needed because <img src> / <a href> cannot
    send custom headers.
    """
    token = request.headers.get('Authorization') or request.args.get('token')
    if not token:
        return jsonify({'error': 'Authentication token is missing'}), 401
    result = verify_jwt_token(token)
    if not result['valid']:
        return jsonify({'error': result.get('error', 'Invalid token')}), 401
    payload = result['payload']
    username = payload.get('username')
    user_role = payload.get('role', 'limited')
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            if user_role == 'admin':
                cursor.execute(
                    "SELECT ta.stored_filename, ta.filename, ta.content_type, ta.cloudinary_url "
                    "FROM task_attachments ta WHERE ta.id = %s",
                    (attachment_id,)
                )
            else:
                cursor.execute(
                    "SELECT ta.stored_filename, ta.filename, ta.content_type, ta.cloudinary_url "
                    "FROM task_attachments ta "
                    "JOIN tasks t ON ta.task_id = t.id "
                    "WHERE ta.id = %s AND t.created_by = %s",
                    (attachment_id, username)
                )
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        if row.get('cloudinary_url'):
            return redirect(row['cloudinary_url'])
        upload_dir = os.path.realpath(current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER))
        path = os.path.realpath(os.path.join(upload_dir, row['stored_filename']))
        if not path.startswith(upload_dir + os.sep):
            return jsonify({'error': 'File not found'}), 404
        if not os.path.isfile(path):
            return jsonify({'error': 'File not found'}), 404
        return send_file(
            path,
            mimetype=row.get('content_type') or 'application/octet-stream',
            as_attachment=False,
            download_name=row['filename']
        )
    except Error as e:
        current_app.logger.error('attachments db error on serve: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@attachments_serve_bp.route('/api/tasks/<int:task_id>/attachments/<int:attachment_id>', methods=['DELETE'])
@token_required
def delete_task_attachment(payload, task_id, attachment_id):
    """Delete an attachment."""
    username = payload.get('username')
    user_role = payload.get('role', 'limited')
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            # Verify task ownership before allowing deletion
            if user_role == 'admin':
                cursor.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
            else:
                cursor.execute("SELECT id FROM tasks WHERE id = %s AND created_by = %s", (task_id, username))
            if not cursor.fetchone():
                return jsonify({'error': 'Task not found'}), 404
            cursor.execute(
                "SELECT stored_filename, cloudinary_public_id, content_type FROM task_attachments WHERE id = %s AND task_id = %s",
                (attachment_id, task_id)
            )
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        if CLOUDINARY_ENABLED and row.get('cloudinary_public_id'):
            try:
                resource_type = 'image' if (row.get('content_type') or '').startswith('image/') else 'raw'
                cloudinary.uploader.destroy(row['cloudinary_public_id'], resource_type=resource_type)
            except Exception:
                pass
        else:
            upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
            path = os.path.join(upload_dir, row['stored_filename'] or '')
            if os.path.isfile(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM task_attachments WHERE id = %s AND task_id = %s", (attachment_id, task_id))
            connection.commit()
        return jsonify({'message': 'Attachment deleted'})
    except Error as e:
        current_app.logger.error('attachments db error on delete: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
