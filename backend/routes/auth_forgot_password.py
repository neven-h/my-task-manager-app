from flask import Blueprint, request, jsonify, current_app
from config import limiter, get_db_connection, app, mail, FRONTEND_URL, DEBUG
import hashlib
import secrets
import socket
import threading
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
        email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

        if not email_configured:
            current_app.logger.warning('Password reset requested but email not configured')
            if DEBUG:
                current_app.logger.debug('Password reset URL (debug only, email not configured): %s', reset_url)
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

            # Flask-Mail 0.10.0 has no timeout support — mail.send() can block
            # indefinitely and get killed by gunicorn's 30 s worker timeout.
            # Run the send in a daemon thread with a 10 s join so the HTTP
            # response is always returned promptly regardless of SMTP latency.
            send_error = []

            def _send():
                # Give every socket op in this thread a hard 25 s deadline
                # so gunicorn never has to kill the whole worker process.
                socket.setdefaulttimeout(25)
                try:
                    with app.app_context():
                        app.logger.info(
                            'SMTP: connecting to %s:%s (tls=%s, user=%s)',
                            app.config.get('MAIL_SERVER'),
                            app.config.get('MAIL_PORT'),
                            app.config.get('MAIL_USE_TLS'),
                            app.config.get('MAIL_USERNAME'),
                        )
                        mail.send(msg)
                        app.logger.info('SMTP: password reset email delivered to %s', user['email'])
                except Exception as exc:
                    send_error.append(exc)
                    app.logger.error('SMTP: send failed — %s: %s', type(exc).__name__, exc, exc_info=True)
                finally:
                    socket.setdefaulttimeout(None)

            t = threading.Thread(target=_send, daemon=True)
            t.start()
            t.join(timeout=10)

            if t.is_alive():
                # Thread still blocked on SMTP after 10 s — return now.
                # The daemon thread keeps running; if SMTP eventually succeeds
                # the "delivered" log line will appear in Railway logs.
                current_app.logger.warning(
                    'SMTP: still connecting after 10 s (server=%s port=%s) — '
                    'returning success response now; email may arrive late',
                    app.config.get('MAIL_SERVER'),
                    app.config.get('MAIL_PORT'),
                )
            elif send_error:
                current_app.logger.error('SMTP: reset email to %s failed: %s', user['email'], send_error[0])
                if DEBUG:
                    current_app.logger.debug('Reset URL (debug only, email send failed): %s', reset_url)
            else:
                current_app.logger.info("SMTP: password reset email sent to %s", email)

            return jsonify({'message': success_msg})
        except Exception as mail_error:
            current_app.logger.error('Failed to send reset email: %s', mail_error, exc_info=True)
            if DEBUG:
                current_app.logger.debug('Reset URL (debug only, email send failed): %s', reset_url)
            return jsonify({'message': success_msg})

    except Exception as e:
        current_app.logger.error('forgot_password error: %s', e, exc_info=True)
        return jsonify({'error': 'An error occurred processing your request'}), 500
