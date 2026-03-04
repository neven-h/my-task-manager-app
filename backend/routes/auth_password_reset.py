from flask import Blueprint, request, jsonify, current_app
from config import limiter, get_db_connection, validate_password
import bcrypt
from datetime import datetime

auth_password_reset_bp = Blueprint('auth_password_reset', __name__)


@auth_password_reset_bp.route('/api/auth/verify-token', methods=['GET'])
@limiter.limit("10 per minute")
def verify_reset_token():
    """Verify if a password reset token is valid."""
    try:
        token = request.args.get('token', '')
        if not token:
            return jsonify({'valid': False, 'error': 'Token is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
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

            return jsonify({'valid': True, 'username': token_data['username']})

    except Exception as e:
        current_app.logger.error('verify_token error: %s', e, exc_info=True)
        return jsonify({'valid': False, 'error': 'An error occurred'}), 500


@auth_password_reset_bp.route('/api/auth/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    """Reset password using a valid token."""
    try:
        data = request.json
        token = data.get('token', '')
        new_password = data.get('password', '')

        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400

        is_valid, error_msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
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

            password_hash = bcrypt.hashpw(
                new_password.encode('utf-8'), bcrypt.gensalt()
            ).decode('utf-8')

            cursor.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (password_hash, token_data['user_id'])
            )
            cursor.execute(
                "UPDATE password_reset_tokens SET used = TRUE WHERE id = %s",
                (token_data['id'],)
            )
            connection.commit()

            return jsonify({'success': True, 'message': 'Password reset successfully'})

    except Exception as e:
        current_app.logger.error('reset_password error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
