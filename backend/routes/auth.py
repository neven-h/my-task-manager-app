from flask import Blueprint, request, jsonify, current_app
from config import (
    limiter, mail, get_db_connection, USERS, FRONTEND_URL,
    DEBUG, handle_error, validate_password,
    generate_jwt_token, verify_jwt_token,
)
from flask_mail import Message
from mysql.connector import Error
import bcrypt
import re
import uuid
from datetime import datetime, timedelta
import pyotp
import qrcode
from io import BytesIO
import base64

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint that reports app and database status."""
    db_ok = False
    db_error = None
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            db_ok = True
    except Exception as e:
        db_error = str(e)

    status = "healthy" if db_ok else "degraded"
    code = 200 if db_ok else 503
    result = {"status": status, "database": "connected" if db_ok else "unavailable"}
    if db_error:
        result["database_error"] = db_error
    return jsonify(result), code


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
        # Log the error but don't expose internal details to the client
        print(f"Login error: {e}")
        if DEBUG:
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/api/auth/signup', methods=['POST'])
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


@auth_bp.route('/api/auth/forgot-password', methods=['POST'])
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
                return jsonify({'error': 'Too many reset requests. Please try again later'}), 429

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
                print(f"Email not configured. Reset token: {token}")
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


@auth_bp.route('/api/auth/verify-token', methods=['GET'])
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
        print(f"Verify token error: {e}")
        return jsonify({'valid': False, 'error': str(e)}), 500


@auth_bp.route('/api/auth/reset-password', methods=['POST'])
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
        print(f"Reset password error: {e}")
        return jsonify({'error': str(e)}), 500


# ================================
# Two-Factor Authentication (2FA) Endpoints
# ================================

@auth_bp.route('/api/auth/2fa/setup', methods=['POST'])
def setup_2fa():
    """Generate a new 2FA secret and QR code for user to scan"""
    try:
        data = request.json
        username = data.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

        # Check if this is a hardcoded user (not in database)
        if username in USERS:
            return jsonify({
                'error': '2FA is not available for legacy accounts. Please create a new account via Sign Up to use 2FA.'
            }), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get user
            cursor.execute("""
                SELECT id, email, two_factor_enabled
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found in database. Please sign up for a new account.'}), 404

            # Generate a new secret
            secret = pyotp.random_base32()

            # Create TOTP URI for QR code
            app_name = "Task Manager"
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user['email'],
                issuer_name=app_name
            )

            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)

            # Convert to base64
            import base64 as b64
            qr_code_base64 = b64.b64encode(buffer.getvalue()).decode('utf-8')

            # Store the secret temporarily (will be activated when user verifies)
            cursor.execute("""
                UPDATE users
                SET two_factor_secret = %s
                WHERE id = %s
            """, (secret, user['id']))
            connection.commit()

            return jsonify({
                'success': True,
                'secret': secret,
                'qr_code': f'data:image/png;base64,{qr_code_base64}',
                'already_enabled': user.get('two_factor_enabled', False)
            })

    except Exception as e:
        print(f"2FA setup error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/2fa/enable', methods=['POST'])
def enable_2fa():
    """Enable 2FA after user verifies the code"""
    try:
        data = request.json
        username = data.get('username')
        code = data.get('code', '').strip()

        if not username or not code:
            return jsonify({'error': 'Username and code are required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get user with secret
            cursor.execute("""
                SELECT id, two_factor_secret
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user or not user.get('two_factor_secret'):
                return jsonify({'error': 'No 2FA setup found. Please setup 2FA first.'}), 400

            # Verify the code
            totp = pyotp.TOTP(user['two_factor_secret'])
            if not totp.verify(code, valid_window=1):
                return jsonify({'error': 'Invalid verification code'}), 401

            # Enable 2FA
            cursor.execute("""
                UPDATE users
                SET two_factor_enabled = TRUE
                WHERE id = %s
            """, (user['id'],))
            connection.commit()

            return jsonify({
                'success': True,
                'message': '2FA enabled successfully. If you lose your phone, you can disable 2FA from any logged-in device using your password.'
            })

    except Exception as e:
        print(f"2FA enable error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/2fa/verify', methods=['POST'])
def verify_2fa():
    """Verify 2FA code during login and return JWT token"""
    try:
        data = request.json
        username = data.get('username')
        code = data.get('code', '').strip()

        if not username or not code:
            return jsonify({'error': 'Username and code are required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get user
            cursor.execute("""
                SELECT id, username, role, two_factor_secret, two_factor_enabled
                FROM users
                WHERE username = %s
            """, (username,))
            user = cursor.fetchone()

            if not user or not user.get('two_factor_enabled'):
                return jsonify({'error': 'User not found or 2FA not enabled'}), 404

            # Verify TOTP code
            totp = pyotp.TOTP(user['two_factor_secret'])
            if totp.verify(code, valid_window=1):
                # Valid TOTP code
                token = generate_jwt_token(user['username'], user['role'])
                return jsonify({
                    'success': True,
                    'username': user['username'],
                    'role': user['role'],
                    'token': token
                })

            # Invalid code
            return jsonify({'error': 'Invalid verification code. If you lost your phone, disable 2FA from a logged-in device.'}), 401

    except Exception as e:
        print(f"2FA verify error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/2fa/disable', methods=['POST'])
def disable_2fa():
    """Disable 2FA (requires password verification)"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

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
        print(f"2FA disable error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/2fa/status', methods=['GET'])
def get_2fa_status():
    """Get 2FA status for a user"""
    try:
        username = request.args.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

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
        print(f"2FA status error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/user-info', methods=['GET'])
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
        print(f"User info error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/change-password', methods=['POST'])
def change_password():
    """Change user password"""
    try:
        data = request.json
        username = data.get('username')
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not username or not current_password or not new_password:
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
        print(f"Change password error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/api/auth/delete-account', methods=['POST'])
def delete_account():
    """Delete user account permanently"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

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
            
            # Delete user's tasks (uses created_by column with username)
            cursor.execute("DELETE FROM tasks WHERE created_by = %s", (username,))
            
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
        print(f"Delete account error: {e}")
        return jsonify({'error': str(e)}), 500


