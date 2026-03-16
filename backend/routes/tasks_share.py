import logging
import os
import json as _json
import urllib.request
import urllib.error

from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, DEBUG, app, FRONTEND_URL
from email.utils import parseaddr

logger = logging.getLogger(__name__)

tasks_share_bp = Blueprint('tasks_share', __name__)


@tasks_share_bp.route('/api/tasks/<int:task_id>/share', methods=['POST'])
@token_required
def share_task(payload, task_id):
    """Share a task via email using Resend API (same approach as forgot-password)."""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

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

            if user_role != 'admin' and task.get('created_by') != username:
                return jsonify({'error': 'Access denied'}), 403

            task_date = task['task_date'].strftime('%B %d, %Y') if task.get('task_date') else 'Not set'
            notes = task.get('notes', '')

            email_body = f"""A task has been shared with you from Dr. Pitz club.

Task: {task['title']}
Status: {task.get('status', 'pending').capitalize()}
Category: {task.get('category', 'None')}
Date: {task_date}

Description:
{task.get('description', 'No description')}

{('Notes: ' + notes) if notes else ''}

View your tasks at {FRONTEND_URL}

Best regards,
Dr. Pitz club Team"""

            email_html = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1a1a2e;">Task Shared With You</h2>
  <p>A task has been shared with you from <strong>Dr. Pitz club</strong>.</p>
  <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;">
    <h3 style="margin:0 0 8px;color:#1a1a2e;">{task['title']}</h3>
    <p style="margin:4px 0;font-size:0.9em;"><strong>Status:</strong> {task.get('status', 'pending').capitalize()}</p>
    <p style="margin:4px 0;font-size:0.9em;"><strong>Category:</strong> {task.get('category', 'None')}</p>
    <p style="margin:4px 0;font-size:0.9em;"><strong>Date:</strong> {task_date}</p>
    <p style="margin:12px 0 4px;font-size:0.9em;"><strong>Description:</strong></p>
    <p style="margin:0;font-size:0.9em;color:#555;">{task.get('description', 'No description')}</p>
    {f'<p style="margin:12px 0 0;font-size:0.85em;color:#666;"><strong>Notes:</strong> {notes}</p>' if notes else ''}
  </div>
  <p style="margin:24px 0;">
    <a href="{FRONTEND_URL}"
       style="background:#0d6efd;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
      View Tasks
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:0.8em;color:#aaa;">Dr. Pitz club Team</p>
</body>
</html>"""

            # ── Option 1: Resend HTTP API (works on Railway — no SMTP needed) ──
            resend_api_key = os.environ.get('RESEND_API_KEY', '').strip()
            if resend_api_key:
                payload_json = _json.dumps({
                    'from': 'Dr. Pitz club <noreply@drpitz.club>',
                    'to': [email],
                    'subject': f"Task Shared: {task['title']}",
                    'text': email_body,
                    'html': email_html,
                }).encode()
                req = urllib.request.Request(
                    'https://api.resend.com/emails',
                    data=payload_json,
                    headers={
                        'Authorization': f'Bearer {resend_api_key}',
                        'Content-Type': 'application/json',
                        'User-Agent': 'resend-python/2.0.0',
                    },
                    method='POST',
                )
                try:
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        logger.info('Resend: task share delivered to %s (status %s)', email, resp.status)
                    return jsonify({'success': True, 'message': f'Task shared successfully with {email}'})
                except urllib.error.HTTPError as exc:
                    body = exc.read().decode(errors='replace')
                    logger.error('Resend: HTTP %s — %s', exc.code, body)
                    return jsonify({'error': 'Failed to send email. Please try again later.'}), 503
                except Exception as exc:
                    logger.error('Resend: failed — %s: %s', type(exc).__name__, exc)
                    return jsonify({'error': 'Failed to send email. Please try again later.'}), 503

            # ── Option 2: no email provider configured ──
            if DEBUG:
                return jsonify({'success': True, 'message': f'Email not configured (debug mode). Task "{task["title"]}" would be shared with {email}'})
            return jsonify({'error': 'Email service is not configured. Please contact administrator.'}), 503

    except Exception as e:
        logger.error('share_task error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to share task'}), 500
