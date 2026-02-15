from flask import Blueprint, request, jsonify, send_file, current_app, redirect
from config import (
    get_db_connection, TASK_ATTACHMENTS_FOLDER,
    allowed_task_attachment, CLOUDINARY_ENABLED,
)
import cloudinary.uploader
from mysql.connector import Error
from werkzeug.utils import secure_filename
import os
import uuid

attachments_bp = Blueprint('attachments', __name__)


def _attachment_to_json(row):
    """Convert attachment row to JSON with url path for frontend."""
    url = row.get('cloudinary_url') or f"/api/tasks/attachments/{row['id']}/file"
    return {
        'id': row['id'],
        'filename': row['filename'],
        'content_type': row.get('content_type') or '',
        'file_size': row.get('file_size'),
        'url': url,
    }


@attachments_bp.route('/api/tasks/<int:task_id>/attachments', methods=['GET'])
def get_task_attachments(task_id):
    """List attachments for a task."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, filename, content_type, file_size, cloudinary_url FROM task_attachments WHERE task_id = %s ORDER BY id",
                (task_id,)
            )
            rows = cursor.fetchall()
        return jsonify([_attachment_to_json(r) for r in rows])
    except Error as e:
        return jsonify({'error': str(e)}), 500


@attachments_bp.route('/api/tasks/<int:task_id>/attachments', methods=['POST'])
def upload_task_attachment(task_id):
    """Upload a file or image attachment for a task."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_task_attachment(file.filename):
            return jsonify({'error': 'File type not allowed for task attachments'}), 400

        # Ensure task exists
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Task not found'}), 404

        content_type = file.content_type or ''
        original_filename = secure_filename(file.filename)
        cloudinary_url = None
        cloudinary_public_id = None
        stored_name = None
        file_size = None

        print(f"[UPLOAD] filename={original_filename} content_type={content_type} CLOUDINARY_ENABLED={CLOUDINARY_ENABLED}", flush=True)

        if CLOUDINARY_ENABLED:
            resource_type = 'image' if content_type.startswith('image/') else 'raw'
            print(f"[UPLOAD] Uploading to Cloudinary resource_type={resource_type}", flush=True)
            upload_result = cloudinary.uploader.upload(
                file,
                folder='task_attachments',
                resource_type=resource_type,
                use_filename=True,
                unique_filename=True,
            )
            cloudinary_url = upload_result.get('secure_url')
            cloudinary_public_id = upload_result.get('public_id')
            file_size = upload_result.get('bytes', 0)
            stored_name = cloudinary_public_id
            print(f"[UPLOAD] Cloudinary success url={cloudinary_url}", flush=True)
        else:
            ext = (file.filename.rsplit('.', 1)[1].lower()) if '.' in file.filename else ''
            stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
            upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, stored_name)
            file.save(file_path)
            file_size = os.path.getsize(file_path)

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """INSERT INTO task_attachments
                   (task_id, filename, stored_filename, content_type, file_size, cloudinary_url, cloudinary_public_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (task_id, original_filename, stored_name, content_type, file_size, cloudinary_url, cloudinary_public_id)
            )
            connection.commit()
            att_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, filename, content_type, file_size, cloudinary_url FROM task_attachments WHERE id = %s",
                (att_id,)
            )
            row = cursor.fetchone()
        return jsonify(_attachment_to_json(row)), 201
    except Error as e:
        print(f"[UPLOAD] DB error: {e}", flush=True)
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        import traceback
        print(f"[UPLOAD] Exception: {traceback.format_exc()}", flush=True)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@attachments_bp.route('/api/tasks/attachments/<int:attachment_id>/file', methods=['GET'])
def serve_task_attachment(attachment_id):
    """Serve an attachment file by id."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT stored_filename, filename, content_type, cloudinary_url FROM task_attachments WHERE id = %s",
                (attachment_id,)
            )
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        if row.get('cloudinary_url'):
            return redirect(row['cloudinary_url'])
        upload_dir = current_app.config.get('TASK_ATTACHMENTS_FOLDER', TASK_ATTACHMENTS_FOLDER)
        path = os.path.join(upload_dir, row['stored_filename'])
        if not os.path.isfile(path):
            return jsonify({'error': 'File not found'}), 404
        return send_file(
            path,
            mimetype=row.get('content_type') or 'application/octet-stream',
            as_attachment=False,
            download_name=row['filename']
        )
    except Error as e:
        return jsonify({'error': str(e)}), 500


@attachments_bp.route('/api/tasks/<int:task_id>/attachments/<int:attachment_id>', methods=['DELETE'])
def delete_task_attachment(task_id, attachment_id):
    """Delete an attachment."""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
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
        return jsonify({'error': str(e)}), 500
