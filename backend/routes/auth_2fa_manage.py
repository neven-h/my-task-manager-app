from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error
import bcrypt

auth_2fa_manage_bp = Blueprint('auth_2fa_manage', __name__)


@auth_2fa_manage_bp.route('/api/auth/2fa/disable', methods=['POST'])
@token_required
def disable_2fa(payload):
    """Disable 2FA (requires password verification)"""
    try:
        username = payload['username']
        data = request.json
        password = data.get('password')

        if not password:
            return jsonify({'error': 'Password is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get user
            cursor.execute("""
                SELECT id, password_hash, two_factor_enabled
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Invalid password'}), 401

            # Disable 2FA
            cursor.execute("""
                UPDATE users
                SET two_factor_enabled = FALSE,
                    two_factor_secret = NULL
                WHERE id = %s
            """, (user['id'],))
            connection.commit()

            return jsonify({
                'success': True,
                'message': '2FA disabled successfully. You can now log in with just your password.'
            })

    except Exception as e:
        current_app.logger.error('2fa disable error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@auth_2fa_manage_bp.route('/api/auth/2fa/status', methods=['GET'])
@token_required
def get_2fa_status(payload):
    """Get 2FA status for the authenticated user"""
    try:
        username = payload['username']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT two_factor_enabled
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found'}), 404

            return jsonify({
                'enabled': user.get('two_factor_enabled', False)
            })

    except Exception as e:
        current_app.logger.error('2fa status error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
