from flask import Blueprint, request, jsonify, current_app
from config import (
    limiter, get_db_connection, USERS,
    generate_jwt_token, token_required,
)
import pyotp
import qrcode
from io import BytesIO
import base64

auth_2fa_bp = Blueprint('auth_2fa', __name__)


# ================================
# Two-Factor Authentication (2FA) Endpoints
# ================================

@auth_2fa_bp.route('/api/auth/2fa/setup', methods=['POST'])
@limiter.limit("10 per minute")
@token_required
def setup_2fa(payload):
    """Generate a new 2FA secret and QR code for user to scan"""
    try:
        username = payload['username']

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
        current_app.logger.error('2fa setup error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@auth_2fa_bp.route('/api/auth/2fa/enable', methods=['POST'])
@limiter.limit("5 per minute")
@token_required
def enable_2fa(payload):
    """Enable 2FA after user verifies the code"""
    try:
        username = payload['username']
        data = request.json
        code = data.get('code', '').strip()

        if not code:
            return jsonify({'error': 'Verification code is required'}), 400

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
        current_app.logger.error('2fa enable error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@auth_2fa_bp.route('/api/auth/2fa/verify', methods=['POST'])
@limiter.limit("5 per minute")
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
                return jsonify({'error': 'Invalid username or verification code'}), 401

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
        current_app.logger.error('2fa verify error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
