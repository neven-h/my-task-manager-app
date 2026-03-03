from flask import Blueprint, request, jsonify, current_app
from config import (
    limiter, get_db_connection, USERS,
    DEBUG, handle_error, validate_password,
    generate_jwt_token, verify_jwt_token, token_required,
)
import bcrypt
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint that reports app and database status."""
    db_ok = False
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            db_ok = True
    except Exception as e:
        current_app.logger.error('health_check db error: %s', e, exc_info=True)

    status = "healthy" if db_ok else "degraded"
    result = {"status": status, "database": "connected" if db_ok else "unavailable"}
    return jsonify(result), 200


@auth_bp.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")  # Rate limit: max 10 login attempts per minute
def login():
    """Authenticate user and return role - checks database first, then hardcoded users"""
    try:
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username and password are required'
            }), 400

        # First, check database for registered users
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, username, email, password_hash, role, is_active,
                       two_factor_enabled, two_factor_secret
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if user:
                # Check if user is active
                if not user['is_active']:
                    return jsonify({
                        'success': False,
                        'error': 'Account is disabled'
                    }), 401

                # Verify password with bcrypt
                if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                    # Check if 2FA is enabled
                    if user.get('two_factor_enabled'):
                        # Don't return token yet, require 2FA verification
                        return jsonify({
                            'success': True,
                            'requires_2fa': True,
                            'username': user['username'],
                            'temp_auth': True
                        })

                    # No 2FA, generate secure JWT token
                    token = generate_jwt_token(user['username'], user['role'])
                    return jsonify({
                        'success': True,
                        'username': user['username'],
                        'role': user['role'],
                        'token': token,
                        'requires_2fa': False
                    })

        # Fallback to hardcoded users (backward compatibility)
        if username in USERS:
            if bcrypt.checkpw(password.encode('utf-8'), USERS[username]['password_hash'].encode('utf-8')):
                # Generate secure JWT token
                token = generate_jwt_token(username, USERS[username]['role'])
                return jsonify({
                    'success': True,
                    'username': username,
                    'role': USERS[username]['role'],
                    'token': token
                })

        return jsonify({
            'success': False,
            'error': 'Invalid username or password'
        }), 401
    except Exception as e:
        current_app.logger.error('login error: %s', e, exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/api/auth/signup', methods=['POST'])
@limiter.limit("5 per hour")
def signup():
    """Register a new user"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # Validate email format
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength using helper
        is_valid, error_msg = validate_password(password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Validate username
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({'error': 'Email already registered'}), 409
            
            # Check if username already exists
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({'error': 'Username already taken'}), 409
            
            # Hash password with bcrypt
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Insert new user (default role is 'limited')
            cursor.execute("""
                INSERT INTO users (email, username, password_hash, role, is_active)
                VALUES (%s, %s, %s, 'limited', TRUE)
            """, (email, username, password_hash))
            connection.commit()
            
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'username': username
            }), 201

    except Exception as e:
        return handle_error(e, "Failed to create account")
