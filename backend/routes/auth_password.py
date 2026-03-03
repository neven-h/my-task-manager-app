from flask import Blueprint, request, jsonify, current_app
from config import (
    limiter, mail, get_db_connection, FRONTEND_URL,
    DEBUG, handle_error,
)
from flask_mail import Message
import uuid
from datetime import datetime, timedelta

auth_password_bp = Blueprint('auth_password', __name__)


@auth_password_bp.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Check if email is configured
        email_configured = bool(current_app.config.get('MAIL_USERNAME') and current_app.config.get('MAIL_PASSWORD'))

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if user exists
            cursor.execute("SELECT id, username, email FROM users WHERE email = %s AND is_active = TRUE", (email,))
            user = cursor.fetchone()

            if not user:
                # Don't reveal if email exists or not (security)
                return jsonify({
                    'success': True,
                    'message': 'If that email is registered, you will receive a password reset link'
                })

            # Check rate limiting (max 3 requests per hour)
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM password_reset_tokens
                WHERE user_id = %s
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            """, (user['id'],))
            result = cursor.fetchone()
            if result['count'] >= 3:
                # Return same generic response as "user not found" to avoid leaking user existence
                return jsonify({
                    'success': True,
                    'message': 'If that email is registered, you will receive a password reset link'
                })

            # Generate secure token
            token = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(minutes=10)

            # Save token to database
            cursor.execute("""
                INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (user['id'], token, expires_at))
            connection.commit()

            # Try to send email if configured
            if email_configured:
                try:
                    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
                    msg = Message(
                        subject="Password Reset Request",
                        recipients=[user['email']],
                        body=f"""Hello {user['username']},

You requested a password reset for your account.

Click the link below to reset your password (valid for 10 minutes):
{reset_url}

If you didn't request this, please ignore this email.

Best regards,
Task Tracker Team"""
                    )

                    mail.send(msg)

                    return jsonify({
                        'success': True,
                        'message': 'If that email is registered, you will receive a password reset link'
                    })
                except Exception as mail_error:
                    print(f"Email sending failed: {mail_error}")
                    # If email fails, return token in response for development
                    if DEBUG:
                        return jsonify({
                            'success': True,
                            'message': 'Email service unavailable. Use this token directly',
                            'token': token,
                            'reset_url': f"{FRONTEND_URL}/reset-password?token={token}"
                        })
                    else:
                        return jsonify({
                            'error': 'Email service is temporarily unavailable. Please contact administrator.'
                        }), 503
            else:
                # Email not configured - return token for development/testing
                current_app.logger.warning("Email not configured. Password reset unavailable in production.")
                if DEBUG:
                    return jsonify({
                        'success': True,
                        'message': 'Email not configured. Use this reset link',
                        'token': token,
                        'reset_url': f"{FRONTEND_URL}/reset-password?token={token}"
                    })
                else:
                    return jsonify({
                        'error': 'Email service is not configured. Please contact administrator.'
                    }), 503

    except Exception as e:
        print(f"Forgot password error: {e}")
        return handle_error(e, "Failed to process password reset request")
