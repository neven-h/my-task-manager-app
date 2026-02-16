"""
Authentication helpers: JWT, token decorators, password validation, hardcoded users.
"""
import os
import re
import bcrypt
import jwt
from functools import wraps
from datetime import datetime, timedelta

from flask import request, jsonify


# ==================== JWT CONFIGURATION ====================

IS_CI = os.getenv('CI', 'false').lower() == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'

if IS_CI:
    JWT_SECRET_KEY = 'ci-jwt-key-not-for-production'
else:
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable must be set")

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24


# ==================== JWT HELPERS ====================

def generate_jwt_token(username: str, role: str) -> str:
    """Generate a secure JWT token for authenticated users."""
    payload = {
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        if token.startswith('Bearer '):
            token = token[7:]
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {'valid': True, 'payload': payload}
    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}
    except jwt.InvalidTokenError as e:
        return {'valid': False, 'error': f'Invalid token: {str(e)}'}


def token_required(f):
    """Decorator to require valid JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        result = verify_jwt_token(token)
        if not result['valid']:
            return jsonify({'error': result.get('error', 'Invalid token')}), 401
        return f(result['payload'], *args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require valid JWT token AND admin role for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        result = verify_jwt_token(token)
        if not result['valid']:
            return jsonify({'error': result.get('error', 'Invalid token')}), 401
        payload = result['payload']
        if payload.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(payload, *args, **kwargs)
    return decorated


# ==================== PASSWORD VALIDATION ====================

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength. Returns (is_valid, error_message)."""
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one number'
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, 'Password must contain at least one symbol'
    return True, ''


# ==================== HARDCODED USERS ====================

_USERS_CACHE = None


def _get_hardcoded_users():
    """Load hardcoded users with bcrypt-hashed passwords from environment variables.

    Hashes are cached to avoid the expensive bcrypt.gensalt() on every call.
    """
    global _USERS_CACHE
    if _USERS_CACHE is not None:
        return _USERS_CACHE

    if IS_CI:
        _USERS_CACHE = {}
        return _USERS_CACHE

    required_passwords = ['USER_PITZ_PASSWORD']
    if not all(os.getenv(var) for var in required_passwords):
        raise ValueError(f"{' and '.join(required_passwords)} must be set")

    try:
        users = {
            'pitz': {
                'password_hash': bcrypt.hashpw(
                    os.getenv('USER_PITZ_PASSWORD').encode('utf-8'),
                    bcrypt.gensalt()
                ).decode('utf-8'),
                'role': 'admin'
            }
        }
        _USERS_CACHE = users
        return _USERS_CACHE
    except Exception as e:
        print(f"Error computing password hashes: {e}")
        raise


USERS = _get_hardcoded_users()
