from flask import Blueprint, request, jsonify, current_app
from config import limiter, get_db_connection, app, mail, FRONTEND_URL, DEBUG
import secrets
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
            expires_at = datetime.now() + timedelta(hours=1)

            # Invalidate any existing tokens for this user
            cursor.execute(
                "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s AND used = FALSE",
                (user['id'],)
            )
            cursor.execute(
                "INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (%s, %s, %s, FALSE)",
                (user['id'], token, expires_at)
            )
            connection.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

        if not email_configured:
            if DEBUG:
                return jsonify({
                    'message': success_msg,
                    'debug_info': 'Email not configured - showing token for testing',
                    'token': token, 'reset_url': reset_url
                })
            current_app.logger.warning('Password reset requested but email not configured')
            return jsonify({'message': success_msg})

        try:
            from flask_mail import Message
            msg = Message(
                subject="Password Reset Request - Task Tracker",
                recipients=[user['email']],
                body=(
                    f"Hello {user['username']},\n\n"
                    "You requested a password reset for your Task Tracker account.\n\n"
                    f"Click the link below to reset your password:\n{reset_url}\n\n"
                    "This link will expire in 1 hour.\n\n"
                    "If you did not request this reset, please ignore this email.\n\n"
                    "Best regards,\nTask Tracker Team"
                )
            )
            mail.send(msg)
            current_app.logger.info("Password reset email sent to %s", email)
            return jsonify({'message': success_msg})
        except Exception as mail_error:
            current_app.logger.error('Failed to send reset email: %s', mail_error, exc_info=True)
            if DEBUG:
                return jsonify({
                    'message': success_msg,
                    'debug_info': 'Email send failed - see server logs',
                    'token': token, 'reset_url': reset_url
                })
            return jsonify({'message': success_msg})

    except Exception as e:
        current_app.logger.error('forgot_password error: %s', e, exc_info=True)
        return jsonify({'error': 'An error occurred processing your request'}), 500
