"""
Shared utility helpers: task serialization, error handling, file validation, CSV sanitization.
"""
import os
from flask import jsonify


# ==================== DEBUG FLAG ====================

DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'


# ==================== FILE UPLOAD HELPERS ====================

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
ALLOWED_TASK_ATTACHMENT_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip'
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_task_attachment(filename):
    """Allow images and common document types for task attachments."""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_TASK_ATTACHMENT_EXTENSIONS


# ==================== CSV SANITIZATION ====================

def sanitize_csv_field(value):
    """
    Sanitize a field for CSV export to prevent formula injection.
    Prepends a single quote to values starting with dangerous characters.
    """
    if isinstance(value, str):
        if value and value[0] in ('=', '+', '-', '@', '\t', '\r', '\n'):
            value = "'" + value
        return value.replace('"', '""')
    return value


# ==================== ERROR HANDLING ====================

def handle_error(e: Exception, default_message: str = "Internal server error", status_code: int = 500):
    """
    Return a safe error response. Never exposes internal exception details to clients.
    """
    import logging
    logging.getLogger(__name__).error('%s: %s', default_message, e, exc_info=True)
    return jsonify({'error': default_message}), status_code


# ==================== TASK SERIALIZATION ====================

def serialize_task(task: dict) -> dict:
    """
    Convert a task database record to a JSON-serializable dict.
    Modifies in-place and returns the dict for convenience.
    """
    if task.get('task_date'):
        task['task_date'] = task['task_date'].isoformat()
    if task.get('task_time'):
        task['task_time'] = str(task['task_time'])
    if task.get('created_at'):
        task['created_at'] = task['created_at'].isoformat()
    if task.get('updated_at'):
        task['updated_at'] = task['updated_at'].isoformat()
    if task.get('duration'):
        task['duration'] = float(task['duration'])

    tags_value = task.get('tags')
    task['tags'] = [t.strip() for t in tags_value.split(',') if t.strip()] if tags_value else []

    categories_value = task.get('categories')
    if categories_value:
        task['categories'] = [c.strip() for c in categories_value.split(',') if c.strip()]
    else:
        task['categories'] = [task.get('category', 'other')]

    return task
