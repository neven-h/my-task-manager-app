from flask import Blueprint, request, jsonify, current_app
from config import limiter, get_db_connection, validate_password, app, mail, FRONTEND_URL, DEBUG
import bcrypt
import secrets
from datetime import datetime, timedelta
from mysql.connector import Error

auth_password_reset_bp = Blueprint('auth_password_reset', __name__)


@auth_password_reset_bp.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    """Initiate password reset - sends email with reset link"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Always return success to prevent email enumeration
        success_message = 'If that email is registered, you will receive a password reset link shortly.'

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Look up user by email
            cursor.execute("SELECT id, email, username FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user:
                # Don't reveal that user doesn't exist
                return jsonify({'message': success_message})

            # Generate secure token
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=1)

            # Invalidate any existing tokens for this user
            cursor.execute(
                "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s AND used = FALSE",
                (user['id'],)
            )

            # Insert new token
            cursor.execute("""
                INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
                VALUES (%s, %s, %s, FALSE)
            """, (user['id'], token, expires_at))
            connection.commit()

            reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

            # Check if email is configured
            email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

            if not email_configured:
                if DEBUG:
                    # In debug mode, return the token directly for testing
                    return jsonify({
                        'message': success_message,
                        'debug_info': 'Email not configured - showing token for testing',
                        'token': token,
                        'reset_url': reset_url
                    })
                else:
                    current_app.logger.warning('Password reset requested but email not configured')
                    return jsonify({'message': success_message})

            # Send password reset email
            try:
                from flask_mail import Message
                msg = Message(
                    subject="Password Reset Request - Task Tracker",
                    recipients=[user['email']],
                    body=f"""Hello {user['username']},

You requested a password reset for your Task Tracker account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
Task Tracker Team"""
                )
                mail.send(msg)
                current_app.logger.info(f"Password reset email sent to {email}")
                return jsonify({'message': success_message})

            except Exception as mail_error:
                current_app.logger.error(f"Failed to send password reset email: {mail_error}")
                if DEBUG:
                    return jsonify({
                        'message': success_message,
                        'debug_info': f'Email send failed: {mail_error}',
                        'token': token,
                        'reset_url': reset_url
                    })
                return jsonify({'message': success_message})

    except Exception as e:
        current_app.logger.error('forgot_password error: %s', e, exc_info=True)
        return jsonify({'error': 'An error occurred processing your request'}), 500


@auth_password_reset_bp.route('/api/auth/verify-token', methods=['GET'])
@limiter.limit("10 per minute")
def verify_reset_token():
    """Verify if reset token is valid"""
    try:
        token = request.args.get('token', '')

        if not token:
            return jsonify({'valid': False, 'error': 'Token is required'}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Check if token exists and is valid
            cursor.execute("""
                SELECT t.id, t.expires_at, t.used, u.username
                FROM password_reset_tokens t
                JOIN users u ON t.user_id = u.id
                WHERE t.token = %s
            """, (token,))
            token_data = cursor.fetchone()
            
            if not token_data:
                return jsonify({'valid': False, 'error': 'Invalid token'})
            
            if token_data['used']:
                return jsonify({'valid': False, 'error': 'Token already used'})
            
            if datetime.now() > token_data['expires_at']:
                return jsonify({'valid': False, 'error': 'Token expired'})
            
            return jsonify({
                'valid': True,
                'username': token_data['username']
            })
            
    except Exception as e:
        current_app.logger.error('verify_token error: %s', e, exc_info=True)
        return jsonify({'valid': False, 'error': 'An error occurred'}), 500


@auth_password_reset_bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password with valid token"""
    try:
        data = request.json
        token = data.get('token', '')
        new_password = data.get('password', '')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400
        
        # Validate password strength using helper
        is_valid, error_msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify token is valid
            cursor.execute("""
                SELECT t.id, t.user_id, t.expires_at, t.used
                FROM password_reset_tokens t
                WHERE t.token = %s
            """, (token,))
            token_data = cursor.fetchone()
            
            if not token_data:
                return jsonify({'error': 'Invalid token'}), 400
            
            if token_data['used']:
                return jsonify({'error': 'Token already used'}), 400
            
            if datetime.now() > token_data['expires_at']:
                return jsonify({'error': 'Token expired'}), 400
            
            # Hash new password
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update user password
            cursor.execute("""
                UPDATE users 
                SET password_hash = %s 
                WHERE id = %s
            """, (password_hash, token_data['user_id']))
            
            # Mark token as used
            cursor.execute("""
                UPDATE password_reset_tokens 
                SET used = TRUE 
                WHERE id = %s
            """, (token_data['id'],))
            
            connection.commit()
            
            return jsonify({
                'success': True,
                'message': 'Password reset successfully'
            })
            
    except Exception as e:
        current_app.logger.error('reset_password error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
