from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, DEBUG, app, mail, FRONTEND_URL
from mysql.connector import Error
from email.utils import parseaddr

tasks_share_bp = Blueprint('tasks_share', __name__)


@tasks_share_bp.route('/api/tasks/<int:task_id>/share', methods=['POST'])
@token_required
def share_task(payload, task_id):
    """Share a task via email"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Validate email without a ReDoS-prone regex: parseaddr returns an
        # empty string for the address part when the format is invalid.
        if len(email) > 254 or '@' not in email or '.' not in email.split('@')[-1]:
            return jsonify({'error': 'Invalid email address'}), 400
        _, parsed_addr = parseaddr(email)
        if not parsed_addr or parsed_addr != email:
            return jsonify({'error': 'Invalid email address'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            task = cursor.fetchone()

            if not task:
                return jsonify({'error': 'Task not found'}), 404

            # Ownership check: non-admin users can only share their own tasks
            if user_role != 'admin' and task.get('created_by') != username:
                return jsonify({'error': 'Access denied'}), 403

            email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

            if not email_configured:
                if DEBUG:
                    return jsonify({'success': True, 'message': f'Email not configured (debug mode). Task "{task["title"]}" would be shared with {email}'})
                else:
                    return jsonify({'error': 'Email service is not configured. Please contact administrator.'}), 503

            task_date = task['task_date'].strftime('%B %d, %Y') if task.get('task_date') else 'Not set'
            notes = task.get('notes', '')

            try:
                from flask_mail import Message
                msg = Message(
                    subject=f"Task Shared: {task['title']}",
                    recipients=[email],
                    body=f"""A task has been shared with you from Task Tracker.

Task: {task['title']}
Status: {task.get('status', 'pending').capitalize()}
Category: {task.get('category', 'None')}
Date: {task_date}

Description:
{task.get('description', 'No description')}

{('Notes: ' + notes) if notes else ''}

View your tasks at {FRONTEND_URL}

Best regards,
Task Tracker Team"""
                )
                mail.send(msg)
                return jsonify({'success': True, 'message': f'Task shared successfully with {email}'})
            except Exception as mail_error:
                print(f"Email sending failed: {mail_error}")
                if DEBUG:
                    return jsonify({'success': True, 'message': f'Email service error (debug mode). Task "{task["title"]}" would be shared with {email}'})
                else:
                    return jsonify({'error': 'Failed to send email. Please try again later.'}), 503

    except Exception as e:
        print(f"Share task error: {e}")
        return jsonify({'error': 'Failed to share task'}), 500
