from flask import Blueprint, request, jsonify, current_app
from config import limiter, get_db_connection, app, FRONTEND_URL, DEBUG
import hashlib
import os
import secrets
import smtplib
import threading
import urllib.request
import urllib.error
import json as _json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta

auth_forgot_password_bp = Blueprint('auth_forgot_password', __name__)


@auth_forgot_password_bp.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    """Initiate password reset - sends email with reset link."""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        success_msg = 'If that email is registered, you will receive a password reset link shortly.'

        user = None
        token = None
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, email, username FROM users WHERE email = %s", (email,)
            )
            user = cursor.fetchone()

            if not user:
                return jsonify({'message': success_msg})

            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expires_at = datetime.now() + timedelta(hours=1)

            # Invalidate any existing tokens for this user
            cursor.execute(
                "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s AND used = FALSE",
                (user['id'],)
            )
            # Store the SHA-256 hash — raw token is only sent in the email link
            cursor.execute(
                "INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (%s, %s, %s, FALSE)",
                (user['id'], token_hash, expires_at)
            )
            connection.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

        email_body = (
            f"Hello {user['username']},\n\n"
            "You requested a password reset for your Task Tracker account.\n\n"
            f"Click the link below to reset your password:\n{reset_url}\n\n"
            "This link will expire in 1 hour.\n\n"
            "If you did not request this reset, please ignore this email.\n\n"
            "Best regards,\nTask Tracker Team"
        )

        # ── Option 1: Resend HTTP API (preferred on Railway — bypasses SMTP block) ──
        resend_api_key = os.environ.get('RESEND_API_KEY', '').strip()
        if resend_api_key:
            payload = _json.dumps({
                'from': 'Task Tracker <noreply@drpitz.club>',
                'to': [user['email']],
                'subject': 'Password Reset Request - Task Tracker',
                'text': email_body,
            }).encode()
            req = urllib.request.Request(
                'https://api.resend.com/emails',
                data=payload,
                headers={
                    'Authorization': f'Bearer {resend_api_key}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    current_app.logger.info(
                        'Resend: delivered to %s (status %s)', user['email'], resp.status
                    )
            except urllib.error.HTTPError as exc:
                body = exc.read().decode(errors='replace')
                current_app.logger.error(
                    'Resend: HTTP %s — %s', exc.code, body, exc_info=True
                )
            except Exception as exc:
                current_app.logger.error(
                    'Resend: failed — %s: %s', type(exc).__name__, exc, exc_info=True
                )
            return jsonify({'message': success_msg})

        # ── Option 2: SMTP fallback (for local dev; Railway blocks SMTP ports) ──
        smtp_user = app.config.get('MAIL_USERNAME', '')
        smtp_password = app.config.get('MAIL_PASSWORD', '')
        smtp_server = app.config.get('MAIL_SERVER', 'smtp.gmail.com')
        smtp_port = int(app.config.get('MAIL_PORT', 465))
        use_ssl = app.config.get('MAIL_USE_SSL', True)
        use_tls = app.config.get('MAIL_USE_TLS', False)

        if not (smtp_user and smtp_password):
            current_app.logger.warning(
                'Password reset requested but neither RESEND_API_KEY nor SMTP credentials configured'
            )
            if DEBUG:
                current_app.logger.debug('Reset URL (debug only): %s', reset_url)
            return jsonify({'message': success_msg})

        mime_msg = MIMEMultipart()
        mime_msg['From'] = smtp_user
        mime_msg['To'] = user['email']
        mime_msg['Subject'] = 'Password Reset Request - Task Tracker'
        mime_msg.attach(MIMEText(email_body, 'plain'))

        send_error = []

        def _send():
            try:
                current_app.logger.info(
                    'SMTP: connecting to %s:%s (ssl=%s tls=%s user=%s)',
                    smtp_server, smtp_port, use_ssl, use_tls, smtp_user,
                )
                if use_ssl:
                    conn = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15)
                else:
                    conn = smtplib.SMTP(smtp_server, smtp_port, timeout=15)
                    if use_tls:
                        conn.starttls()
                with conn:
                    conn.login(smtp_user, smtp_password)
                    conn.send_message(mime_msg)
                current_app.logger.info('SMTP: delivered to %s', user['email'])
            except Exception as exc:
                send_error.append(exc)
                current_app.logger.error(
                    'SMTP: failed — %s: %s', type(exc).__name__, exc, exc_info=True
                )

        t = threading.Thread(target=_send, daemon=True)
        t.start()
        t.join(timeout=16)

        if t.is_alive():
            current_app.logger.warning(
                'SMTP: thread still alive after 16 s (server=%s port=%s)',
                smtp_server, smtp_port,
            )
        elif send_error:
            current_app.logger.error(
                'SMTP: reset email to %s failed: %s', user['email'], send_error[0]
            )

        return jsonify({'message': success_msg})

    except Exception as e:
        current_app.logger.error('forgot_password error: %s', e, exc_info=True)
        return jsonify({'error': 'An error occurred processing your request'}), 500
