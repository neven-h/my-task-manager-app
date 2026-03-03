from flask import Blueprint, request, jsonify, current_app
from config import (
    get_db_connection, USERS,
    verify_jwt_token, token_required,
)
from mysql.connector import Error
import bcrypt

auth_account_bp = Blueprint('auth_account', __name__)


@auth_account_bp.route('/api/auth/user-info', methods=['GET'])
def get_user_info():
    """Get user information including email - requires authentication"""
    try:
        # Verify JWT token from Authorization header
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        token_result = verify_jwt_token(token)
        if not token_result['valid']:
            return jsonify({'error': token_result.get('error', 'Invalid token')}), 401
        
        # Get username from token payload - users can only access their own info
        authenticated_username = token_result['payload'].get('username')
        requested_username = request.args.get('username')
        
        # If no username provided, use the authenticated user's username
        if not requested_username:
            requested_username = authenticated_username
        
        # Security: Users can only access their own information
        if requested_username != authenticated_username:
            return jsonify({'error': 'Access denied: You can only view your own account information'}), 403

        # Check if this is a hardcoded user
        if requested_username in USERS:
            return jsonify({
                'username': requested_username,
                'email': None,
                'is_legacy_account': True
            })

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT username, email
                FROM users
                WHERE username = %s
            """, (requested_username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found'}), 404

            return jsonify({
                'username': user['username'],
                'email': user['email'],
                'is_legacy_account': False
            })

    except Exception as e:
        current_app.logger.error('user_info error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@auth_account_bp.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password(payload):
    """Change user password"""
    try:
        username = payload['username']
        data = request.json
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'error': 'All fields are required'}), 400

        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400

        # Check if this is a hardcoded user (cannot change password)
        if username in USERS:
            return jsonify({
                'error': 'Password change is not available for legacy accounts. Please create a new account via Sign Up.'
            }), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get user
            cursor.execute("""
                SELECT id, password_hash
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Verify current password
            if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Current password is incorrect'}), 401

            # Hash new password
            new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Update password
            cursor.execute("""
                UPDATE users
                SET password_hash = %s
                WHERE id = %s
            """, (new_password_hash, user['id']))
            connection.commit()

            return jsonify({
                'success': True,
                'message': 'Password changed successfully'
            })

    except Exception as e:
        current_app.logger.error('change_password error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
