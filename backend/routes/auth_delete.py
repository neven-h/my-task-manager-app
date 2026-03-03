from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, USERS
from mysql.connector import Error
import bcrypt

auth_delete_bp = Blueprint('auth_delete', __name__)


@auth_delete_bp.route('/api/auth/delete-account', methods=['POST'])
@token_required
def delete_account(payload):
    """Delete user account permanently"""
    try:
        username = payload['username']
        data = request.json
        password = data.get('password')

        if not password:
            return jsonify({'error': 'Password is required'}), 400

        # Check if this is a hardcoded user (cannot delete)
        if username in USERS:
            return jsonify({
                'error': 'Account deletion is not available for legacy accounts.'
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

            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Invalid password'}), 401

            user_id = user['id']

            # Delete user's related data first (foreign key constraints)
            # Delete password reset tokens (uses user_id foreign key)
            cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,))

            # Reassign tasks to admin instead of deleting them — prevents accidental data loss.
            # Tasks created by this user are preserved under the 'pitz' admin account.
            cursor.execute(
                "UPDATE tasks SET created_by = 'pitz' WHERE created_by = %s",
                (username,)
            )
            
            # Delete user's stock portfolio tabs and entries (uses owner column)
            cursor.execute("DELETE FROM stock_portfolio WHERE created_by = %s", (username,))
            cursor.execute("DELETE FROM portfolio_tabs WHERE owner = %s", (username,))
            
            # Delete user's transaction tabs (uses owner column)
            cursor.execute("DELETE FROM transaction_tabs WHERE owner = %s", (username,))
            
            # Delete user's bank transactions (uses username column)
            cursor.execute("DELETE FROM bank_transactions WHERE username = %s", (username,))
            
            # Delete user's watched stocks (uses username column)
            cursor.execute("DELETE FROM watched_stocks WHERE username = %s", (username,))
            
            # Delete user's yahoo portfolio (uses username column)
            cursor.execute("DELETE FROM yahoo_portfolio WHERE username = %s", (username,))
            
            # Delete user's tags (uses owner column)
            cursor.execute("DELETE FROM tags WHERE owner = %s", (username,))
            
            # Delete user's categories (uses owner column)
            cursor.execute("DELETE FROM categories_master WHERE owner = %s", (username,))
            
            # Delete user's clients (uses owner column)
            cursor.execute("DELETE FROM clients WHERE owner = %s", (username,))

            # Finally, delete the user
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            
            connection.commit()

            return jsonify({
                'success': True,
                'message': 'Account deleted successfully'
            })

    except Exception as e:
        current_app.logger.error('delete_account error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
