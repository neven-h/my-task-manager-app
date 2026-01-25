from decimal import Decimal
from typing import Union
import uuid
import secrets

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import mysql.connector
from mysql.connector import Error, MySQLConnection
from mysql.connector.pooling import PooledMySQLConnection, MySQLConnectionPool
from datetime import datetime, date, timedelta
import csv
import io
from contextlib import contextmanager
import pandas as pd
from mysql.connector.pooling import PooledMySQLConnection
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
import chardet
from dotenv import load_dotenv
import re
import bcrypt
import jwt
from functools import wraps
from cryptography.fernet import Fernet
import base64
import pyotp
import qrcode
from io import BytesIO

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Security Configuration
# Check if running in CI environment (for build/syntax checks)
IS_CI = os.getenv('CI', 'false').lower() == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'

# Use default keys for CI/build checks, require real keys for actual runtime
if IS_CI:
    app.config['SECRET_KEY'] = 'ci-build-key-not-for-production'
    JWT_SECRET_KEY = 'ci-jwt-key-not-for-production'
else:
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        raise ValueError("SECRET_KEY environment variable must be set")

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable must be set")

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Data Encryption Configuration for Bank Transactions
# CRITICAL: This key encrypts sensitive bank transaction data at rest
if IS_CI:
    # Generate a valid 32-byte Fernet key for CI
    DATA_ENCRYPTION_KEY = base64.urlsafe_b64encode(b'ci-encrypt-key-32-bytes-long' + b'\x00' * 4)
else:
    encryption_key = os.getenv('DATA_ENCRYPTION_KEY')
    if not encryption_key:
        raise ValueError("DATA_ENCRYPTION_KEY environment variable must be set for production")
    try:
        # Validate it's a proper base64 Fernet key
        DATA_ENCRYPTION_KEY = encryption_key.encode()
        Fernet(DATA_ENCRYPTION_KEY)  # Test if valid
    except Exception as e:
        raise ValueError(f"DATA_ENCRYPTION_KEY is invalid. Generate with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'")

# Initialize encryption cipher
cipher_suite = Fernet(DATA_ENCRYPTION_KEY)

def encrypt_field(value: str) -> str:
    """Encrypt a sensitive field value"""
    if not value:
        return value
    try:
        encrypted = cipher_suite.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {e}")
        raise

def decrypt_field(encrypted_value: str) -> str:
    """Decrypt a sensitive field value"""
    if not encrypted_value:
        return encrypted_value
    try:
        decoded = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
        decrypted = cipher_suite.decrypt(decoded)
        return decrypted.decode('utf-8')
    except Exception as e:
        # If decryption fails, might be legacy plaintext data
        print(f"Decryption warning: {e}")
        return encrypted_value  # Return as-is for migration purposes

def log_bank_transaction_access(username: str, action: str, transaction_ids: str = None, month_year: str = None):
    """Log access to bank transactions for security audit"""
    try:
        ip_address = request.remote_addr if request else None
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO bank_transaction_audit_log
                (username, action, transaction_ids, month_year, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, action, transaction_ids, month_year, ip_address))
            connection.commit()
    except Exception as e:
        # Don't fail the request if audit logging fails
        print(f"Audit logging error: {e}")

# Configure CORS - allow frontend origins
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3004')
CORS(app,
     origins=[FRONTEND_URL, 'http://localhost:3004', 'http://localhost:3005', 'https://drpitz.club', 'https://www.drpitz.club'],
     supports_credentials=True,
     max_age=3600)

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Configure email
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME'))
mail = Mail(app)

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'


# Security Headers Middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'

    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # Enable XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Strict Transport Security (HSTS) - only in production
    if not DEBUG and request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' " + FRONTEND_URL + ";"
    )

    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Permissions Policy
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

    return response


def sanitize_csv_field(value):
    """
    Sanitize a field for CSV export to prevent CSV/Formula injection.
    If the value is a string and begins with one of the dangerous characters
    (=, +, -, @, tab, carriage return, line feed), a single quote is prepended.
    Double quotes within the value are escaped by doubling them.
    """
    if isinstance(value, str):
        if value and value[0] in ('=', '+', '-', '@', '\t', '\r', '\n'):
            value = "'" + value
        return value.replace('"', '""')
    return value


# Database configuration - uses environment variables in production, defaults for local dev
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'task_tracker'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

# PERFORMANCE OPTIMIZATION: Connection pooling
# Creating a database connection is expensive (~30-50ms). By reusing connections
# from a pool, subsequent queries avoid this overhead, improving response times.
# Pool size of 5 is suitable for moderate traffic; increase for high-traffic scenarios.
def _get_validated_pool_size():
    """Get and validate the DB_POOL_SIZE environment variable."""
    try:
        size = int(os.getenv('DB_POOL_SIZE', 5))
        if size < 1:
            print(f"Warning: DB_POOL_SIZE must be at least 1, using default of 5")
            return 5
        if size > 32:
            print(f"Warning: DB_POOL_SIZE {size} is very large, consider reducing for stability")
        return size
    except ValueError:
        print(f"Warning: Invalid DB_POOL_SIZE value, using default of 5")
        return 5

DB_POOL_SIZE = _get_validated_pool_size()
_db_pool = None


def _get_db_pool():
    """Lazily initialize and return the database connection pool.
    
    Lazy initialization allows the app to start even if the database
    is temporarily unavailable. The pool is created on first use.
    """
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = MySQLConnectionPool(
                pool_name="task_tracker_pool",
                pool_size=DB_POOL_SIZE,
                pool_reset_session=True,
                **DB_CONFIG
            )
            print(f"Database connection pool initialized (size: {DB_POOL_SIZE})")
        except Error as e:
            print(f"Failed to create connection pool: {e}")
            # Fall back to non-pooled connections if pool creation fails
            return None
    return _db_pool


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


DB_NAME_PATTERN = re.compile(r'^[A-Za-z0-9_]+$')


def sanitize_db_name(name: str) -> str:
    """Ensure database name only contains safe characters."""
    if not name or not DB_NAME_PATTERN.fullmatch(name):
        raise ValueError('Invalid database name; use letters, numbers, and underscores only')
    return name


# Hardcoded users with hashed passwords (for backward compatibility)
# These passwords are hashed with bcrypt for security
# In production, migrate all users to the database
# PERFORMANCE: Cache hashed passwords to avoid expensive bcrypt.gensalt() on every startup
_USERS_CACHE = None


def _get_hardcoded_users():
    """Load hardcoded users with bcrypt-hashed passwords from environment variables.
    
    PERFORMANCE OPTIMIZATION: Password hashes are cached to avoid the expensive
    bcrypt.gensalt() operation on every function call. bcrypt is intentionally slow
    (for security), so caching the results significantly improves startup time.
    
    Returns:
        dict: Dictionary of users with their password hashes and roles.
              Returns empty dict in CI environment or if initialization fails.
    """
    global _USERS_CACHE
    
    # Return cached users if already computed
    if _USERS_CACHE is not None:
        return _USERS_CACHE
    
    # In CI environment, return empty dict (users come from database)
    if IS_CI:
        _USERS_CACHE = {}
        return _USERS_CACHE

    required_passwords = ['USER_PITZ_PASSWORD']
    if not all(os.getenv(var) for var in required_passwords):
        raise ValueError(f"{' and '.join(required_passwords)} must be set")

    try:
        # Compute hashes once and cache them
        users = {
            'pitz': {
                'password_hash': bcrypt.hashpw(os.getenv('USER_PITZ_PASSWORD').encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                'role': 'admin'
            }
        }
        # Only set cache after successful computation
        _USERS_CACHE = users
        return _USERS_CACHE
    except Exception as e:
        print(f"Error computing password hashes: {e}")
        raise


USERS = _get_hardcoded_users()


# Error Handling Helper
def handle_error(e: Exception, default_message: str = "Internal server error", status_code: int = 500):
    """
    Securely handle errors by logging them and returning safe error messages
    Only exposes detailed error information in DEBUG mode
    """
    print(f"Error: {str(e)}")  # Log for debugging
    if DEBUG:
        return jsonify({'error': f'{default_message}: {str(e)}'}), status_code
    return jsonify({'error': default_message}), status_code


# Password Validation Helper
def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength requirements.
    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one number'
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, 'Password must contain at least one symbol'
    return True, ''


# Task Serialization Helper
def serialize_task(task: dict) -> dict:
    """
    Convert task database record to JSON-serializable format.
    Handles datetime conversion and comma-separated strings to arrays.
    
    Note: This function modifies the task dictionary in-place and also returns it
    for convenience in chaining or comprehension usage.
    """
    if task.get('task_date'):
        task['task_date'] = task['task_date'].isoformat()
    if task.get('task_time'):
        task['task_time'] = str(task['task_time'])
    if task.get('created_at'):
        task['created_at'] = task['created_at'].isoformat()
    if task.get('updated_at'):
        task['updated_at'] = task['updated_at'].isoformat()
    if task.get('duration'):
        task['duration'] = float(task['duration'])
    # Convert tags from comma-separated string to array
    tags_value = task.get('tags')
    if tags_value:
        task['tags'] = [t.strip() for t in tags_value.split(',') if t.strip()]
    else:
        task['tags'] = []
    # Convert categories from comma-separated string to array
    categories_value = task.get('categories')
    if categories_value:
        task['categories'] = [c.strip() for c in categories_value.split(',') if c.strip()]
    else:
        task['categories'] = [task.get('category', 'other')]
    return task


# JWT Helper Functions
def generate_jwt_token(username: str, role: str) -> str:
    """Generate a secure JWT token for authenticated users"""
    payload = {
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {'valid': True, 'payload': payload}
    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}
    except jwt.InvalidTokenError as e:
        return {'valid': False, 'error': f'Invalid token: {str(e)}'}


def token_required(f):
    """Decorator to require valid JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401

        result = verify_jwt_token(token)
        if not result['valid']:
            return jsonify({'error': result.get('error', 'Invalid token')}), 401

        # Pass the payload to the decorated function
        return f(result['payload'], *args, **kwargs)

    return decorated


@contextmanager
def get_db_connection():
    """Context manager for database connections.
    
    PERFORMANCE OPTIMIZATION: Uses connection pooling when available.
    Pooled connections are reused instead of creating new ones each time,
    which saves ~30-50ms per request. When the connection is closed,
    it's returned to the pool for reuse rather than being destroyed.
    
    Falls back to creating individual connections if the pool is unavailable.
    """
    connection = None
    pool = _get_db_pool()
    try:
        if pool:
            # Get connection from pool (fast - reuses existing connection)
            connection = pool.get_connection()
        else:
            # Fall back to creating new connection (slower, but works without pool)
            connection = mysql.connector.connect(**DB_CONFIG)
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            # When using pooling, close() returns the connection to the pool
            # When not using pooling, close() destroys the connection
            connection.close()


def init_db():
    """Initialize database and create tables"""
    connection = None
    cursor = None
    try:
        # Connect without database to create it
        temp_config = DB_CONFIG.copy()
        db_name = sanitize_db_name(temp_config.pop('database'))

        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor()

        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.execute(f"USE `{db_name}`")

        # Create tasks table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS tasks
                       (
                           id
                           INT
                           AUTO_INCREMENT
                           PRIMARY
                           KEY,
                           title
                           VARCHAR
                       (
                           255
                       ) NOT NULL,
                           description TEXT,
                           category VARCHAR
                       (
                           50
                       ) NOT NULL,
                           client VARCHAR
                       (
                           255
                       ),
                           task_date DATE NOT NULL,
                           task_time TIME,
                           duration DECIMAL
                       (
                           5,
                           2
                       ),
                           status ENUM
                       (
                           'completed',
                           'uncompleted'
                       ) DEFAULT 'uncompleted',
                           categories TEXT,
                           tags TEXT,
                           notes TEXT,
                           shared BOOLEAN DEFAULT FALSE,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           INDEX idx_date
                       (
                           task_date
                       ),
                           INDEX idx_category
                       (
                           category
                       ),
                           INDEX idx_status
                       (
                           status
                       ),
                           INDEX idx_client
                       (
                           client
                       ),
                           INDEX idx_shared
                       (
                           shared
                       ),
                           FULLTEXT idx_search
                       (
                           title,
                           description,
                           notes
                       )
                           )
                       """)

        # Add shared column if it doesn't exist (for existing databases)
        try:
            cursor.execute("""
                           ALTER TABLE tasks
                               ADD COLUMN shared BOOLEAN DEFAULT FALSE
                           """)
            print("Added shared column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                raise

        # Add created_by column if it doesn't exist
        try:
            cursor.execute("""
                           ALTER TABLE tasks
                               ADD COLUMN created_by VARCHAR(255)
                           """)
            print("Added created_by column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                raise

        # Add created_by index
        try:
            cursor.execute("""
                           ALTER TABLE tasks
                               ADD INDEX idx_created_by (created_by)
                           """)
            print("Added created_by index to tasks")
        except Error as e:
            if 'Duplicate key' in str(e):
                pass  # Index already exists
            else:
                pass  # Ignore other errors for index creation
                print(f"Note: {e}")

        # Add index for shared column if it doesn't exist
        try:
            cursor.execute("CREATE INDEX idx_shared ON tasks(shared)")
            print("Added index for shared column")
        except Error as e:
            if 'Duplicate' in str(e):
                pass  # Index already exists
            else:
                print(f"Note: {e}")

        # In the init_db() function, add this after the shared column is added (around line 130):

        # Add created_by column if it doesn't exist
        try:
            cursor.execute("""
                           ALTER TABLE tasks
                               ADD COLUMN created_by VARCHAR(50) DEFAULT NULL
                           """)
            print("Added created_by column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Add index for created_by column if it doesn't exist
        try:
            cursor.execute("CREATE INDEX idx_created_by ON tasks(created_by)")
            print("Added index for created_by column")
        except Error as e:
            if 'Duplicate' in str(e):
                pass  # Index already exists
            else:
                print(f"Note: {e}")

        # Add is_draft column for draft/auto-save functionality
        try:
            cursor.execute("""
                           ALTER TABLE tasks
                               ADD COLUMN is_draft BOOLEAN DEFAULT FALSE
                           """)
            print("Added is_draft column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Add index for draft column
        try:
            cursor.execute("CREATE INDEX idx_draft ON tasks(is_draft)")
            print("Added index for is_draft column")
        except Error as e:
            if 'Duplicate' in str(e):
                pass  # Index already exists
            else:
                print(f"Note: {e}")

        # Create bank_transactions table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS bank_transactions
                       (
                           id
                           INT
                           AUTO_INCREMENT
                           PRIMARY
                           KEY,
                           account_number
                           VARCHAR
                       (
                           50
                       ),
                           transaction_date DATE NOT NULL,
                           description VARCHAR
                       (
                           500
                       ) NOT NULL,
                           amount DECIMAL
                       (
                           10,
                           2
                       ) NOT NULL,
                           month_year VARCHAR
                       (
                           7
                       ) NOT NULL,
                           transaction_type ENUM
                       (
                           'credit',
                           'cash'
                       ) DEFAULT 'credit',
                           upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           INDEX idx_transaction_date
                       (
                           transaction_date
                       ),
                           INDEX idx_month_year
                       (
                           month_year
                       ),
                           INDEX idx_account
                       (
                           account_number
                       ),
                           INDEX idx_transaction_type
                       (
                           transaction_type
                       )
                           )
                       """)

        # Add transaction_type column if it doesn't exist (for existing databases)
        try:
            cursor.execute("""
                           ALTER TABLE bank_transactions
                               ADD COLUMN transaction_type ENUM('credit', 'cash') DEFAULT 'credit'
                           """)
            print("Added transaction_type column to bank_transactions")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Add uploaded_by column to bank_transactions
        try:
            cursor.execute("""
                           ALTER TABLE bank_transactions
                               ADD COLUMN uploaded_by VARCHAR(255)
                           """)
            print("Added uploaded_by column to bank_transactions")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Add index for uploaded_by
        try:
            cursor.execute("""
                           ALTER TABLE bank_transactions
                               ADD INDEX idx_uploaded_by (uploaded_by)
                           """)
            print("Added uploaded_by index to bank_transactions")
        except Error as e:
            if 'Duplicate key' in str(e):
                pass  # Index already exists
            else:
                pass  # Ignore other errors for index creation

        # Create users table for authentication
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'shared', 'limited') DEFAULT 'limited',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_email (email),
                INDEX idx_username (username)
            )
        """)
        print("Created users table")

        # Create password_reset_tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_expires (expires_at)
            )
        """)
        print("Created password_reset_tokens table")

        # Add 2FA columns to users table (one at a time for MySQL compatibility)
        try:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN two_factor_secret VARCHAR(32)
            """)
            print("Added two_factor_secret column to users table")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"2FA secret column migration note: {e}")

        try:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE
            """)
            print("Added two_factor_enabled column to users table")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"2FA enabled column migration note: {e}")

        # Create audit log table for bank transaction access
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bank_transaction_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                action VARCHAR(50) NOT NULL,
                transaction_ids TEXT,
                month_year VARCHAR(7),
                ip_address VARCHAR(45),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_timestamp (timestamp),
                INDEX idx_action (action)
            )
        """)
        print("Created bank_transaction_audit_log table")

        # Migrate bank_transactions to support encrypted data (larger field sizes)
        try:
            cursor.execute("""
                ALTER TABLE bank_transactions
                    MODIFY COLUMN account_number TEXT,
                    MODIFY COLUMN description TEXT,
                    MODIFY COLUMN amount TEXT
            """)
            print("Migrated bank_transactions columns to TEXT for encryption support")
        except Error as e:
            if 'Duplicate column' in str(e) or 'already exists' in str(e).lower():
                pass  # Already migrated
            else:
                print(f"Migration note: {e}")

        # Create tags table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS tags
                       (
                           id
                           INT
                           AUTO_INCREMENT
                           PRIMARY
                           KEY,
                           name
                           VARCHAR
                       (
                           100
                       ) NOT NULL UNIQUE,
                           color VARCHAR
                       (
                           7
                       ) DEFAULT '#0d6efd',
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           INDEX idx_name
                       (
                           name
                       )
                           )
                       """)

        # Create categories_master table for user-defined categories
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS categories_master
                       (
                           id
                           INT
                           AUTO_INCREMENT
                           PRIMARY
                           KEY,
                           category_id
                           VARCHAR
                       (
                           50
                       ) NOT NULL UNIQUE,
                           label VARCHAR
                       (
                           100
                       ) NOT NULL,
                           color VARCHAR
                       (
                           7
                       ) DEFAULT '#0d6efd',
                           icon VARCHAR
                       (
                           50
                       ),
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           INDEX idx_category_id
                       (
                           category_id
                       )
                           )
                       """)

        # Add owner column to categories_master table for user isolation
        try:
            cursor.execute("""
                ALTER TABLE categories_master
                ADD COLUMN owner VARCHAR(255)
            """)
            print("Added owner column to categories_master table")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Categories owner column migration note: {e}")

        # Insert default categories if table is empty
        cursor.execute("SELECT COUNT(*) FROM categories_master")
        if cursor.fetchone()[0] == 0:
            default_categories = [
                ('insurance', 'Insurance Lawsuits', '#0d6efd', '⚖️'),
                ('emails', 'Email Management', '#6610f2', '📧'),
                ('customer-support', 'Customer Support', '#0dcaf0', '🎧'),
                ('banking', 'Bank Accounts', '#198754', '🏦'),
                ('scheduling', 'Scheduling', '#ffc107', '📅'),
                ('documentation', 'Documentation', '#fd7e14', '📄'),
                ('phone-calls', 'Phone Calls', '#20c997', '📞'),
                ('research', 'Research', '#6f42c1', '🔍'),
                ('nursing', 'Nursing', '#d63384', '⚕️'),
                ('moshe', 'Moshe', '#dc3545', '👤'),
                ('other', 'Other Tasks', '#6c757d', '📝')
            ]
            cursor.executemany("""
                               INSERT INTO categories_master (category_id, label, color, icon)
                               VALUES (%s, %s, %s, %s)
                               """, default_categories)
            print("Inserted default categories")

        # Create clients table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS clients
                       (
                           id
                           INT
                           AUTO_INCREMENT
                           PRIMARY
                           KEY,
                           name
                           VARCHAR
                       (
                           255
                       ) NOT NULL UNIQUE,
                           email VARCHAR
                       (
                           255
                       ),
                           phone VARCHAR
                       (
                           50
                       ),
                           notes TEXT,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           INDEX idx_name
                       (
                           name
                       )
                           )
                       """)

        # Create users table for authentication
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS users
                       (
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           email VARCHAR(255) UNIQUE NOT NULL,
                           username VARCHAR(255) UNIQUE NOT NULL,
                           password_hash VARCHAR(255) NOT NULL,
                           role ENUM('admin', 'shared', 'limited') DEFAULT 'limited',
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           is_active BOOLEAN DEFAULT TRUE,
                           INDEX idx_email (email),
                           INDEX idx_username (username)
                       )
                       """)
        print("Created users table")

        # Create password_reset_tokens table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS password_reset_tokens
                       (
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           user_id INT NOT NULL,
                           token VARCHAR(255) UNIQUE NOT NULL,
                           expires_at DATETIME NOT NULL,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           used BOOLEAN DEFAULT FALSE,
                           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                           INDEX idx_token (token),
                           INDEX idx_expires (expires_at),
                           INDEX idx_user_id (user_id)
                       )
                       """)
        print("Created password_reset_tokens table")

        connection.commit()
        print("Database initialized successfully")

    except Error as e:
        print(f"Error initializing database: {e}")
    finally:
        if connection and connection.is_connected():
            if cursor:
                cursor.close()
            connection.close()


@app.route('/api/login', methods=['POST'])
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


@app.route('/api/auth/signup', methods=['POST'])
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


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Check if email is configured
        email_configured = bool(app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

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


@app.route('/api/auth/verify-token', methods=['GET'])
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


@app.route('/api/auth/reset-password', methods=['POST'])
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

@app.route('/api/auth/2fa/setup', methods=['POST'])
def setup_2fa():
    """Generate a new 2FA secret and QR code for user to scan"""
    try:
        data = request.json
        username = data.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

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
                return jsonify({'error': 'User not found'}), 404

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


@app.route('/api/auth/2fa/enable', methods=['POST'])
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


@app.route('/api/auth/2fa/verify', methods=['POST'])
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


@app.route('/api/auth/2fa/disable', methods=['POST'])
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


@app.route('/api/auth/2fa/status', methods=['GET'])
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


# ================================
# Tasks Endpoints
# ================================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks with optional filtering"""
    try:
        # Get query parameters
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        shared_only = request.args.get('shared')  # For users with 'shared' role
        username = request.args.get('username')  # NEW: Get username from query
        user_role = request.args.get('role')  # NEW: Get role from query
        include_drafts = request.args.get('include_drafts', 'false')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            # Exclude drafts by default unless explicitly requested
            if include_drafts != 'true':
                query += " AND (is_draft = FALSE OR is_draft IS NULL)"

            # NEW: Filter based on user role
            if user_role == 'shared':
                # 'shared' role: only see tasks marked as shared
                query += " AND shared = TRUE"
            elif user_role == 'limited':
                # 'limited' role: only see their own tasks (created_by must match)
                query += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)
            # 'admin' role: see everything (no additional filter)

            # Log for debugging
            if DEBUG:
                print(f"User: {username}, Role: {user_role}, Query: {query}, Params: {params}")

            # If shared_only is explicitly requested (backward compatibility)
            if shared_only == 'true':
                query += " AND shared = TRUE"

            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)

            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)

            query += " ORDER BY task_date DESC, task_time DESC, created_at DESC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            # Convert datetime objects to strings and tags to array using helper
            for task in tasks:
                serialize_task(task)

            return jsonify(tasks)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.json

        # NEW: Get username from request
        username = data.get('username')

        # Set default time to current time if not provided
        task_time = data.get('task_time')
        if not task_time:
            task_time = datetime.now().strftime('%H:%M:%S')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                    """

            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]  # First category is primary
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_str = ','.join(tags) if isinstance(tags, list) else tags

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                task_time,
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False)),
                username  # NEW: Store creator
            )

            cursor.execute(query, values)
            connection.commit()

            task_id = cursor.lastrowid

            return jsonify({
                'id': task_id,
                'message': 'Task created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update an existing task"""
    try:
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                    UPDATE tasks
                    SET title       = %s, \
                        description = %s, \
                        category    = %s, \
                        categories  = %s, \
                        client      = %s,
                        task_date   = %s, \
                        task_time   = %s, \
                        duration    = %s,
                        status      = %s, \
                        tags        = %s, \
                        notes       = %s, \
                        shared      = %s, \
                        is_draft    = %s
                    WHERE id = %s \
                    """
            # Note: We're NOT updating created_by - it stays with original creator

            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')

            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_str = ','.join(tags) if isinstance(tags, list) else tags

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                data.get('task_time'),
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False)),
                task_id
            )

            cursor.execute(query, values)
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404

            return jsonify({'message': 'Task updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404

            return jsonify({'message': 'Task deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/<int:task_id>/toggle-status', methods=['PATCH'])
def toggle_task_status(task_id):
    """Toggle task completion status"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Get current status
            cursor.execute("SELECT status FROM tasks WHERE id = %s", (task_id,))
            result = cursor.fetchone()

            if not result:
                return jsonify({'error': 'Task not found'}), 404

            # Toggle between completed and uncompleted
            current_status = result[0]
            new_status = 'completed' if current_status == 'uncompleted' else 'uncompleted'

            cursor.execute(
                "UPDATE tasks SET status = %s WHERE id = %s",
                (new_status, task_id)
            )
            connection.commit()

            return jsonify({
                'message': 'Status updated successfully',
                'status': new_status
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/<int:task_id>/duplicate', methods=['POST'])
def duplicate_task(task_id):
    """Duplicate an existing task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get the original task
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            original_task = cursor.fetchone()

            if not original_task:
                return jsonify({'error': 'Task not found'}), 404

            # Create a duplicate with modified title and today's date
            cursor = connection.cursor()
            query = """
                    INSERT INTO tasks
                    (title, description, category, categories, client, task_date, task_time,
                     duration, status, tags, notes, shared, is_draft)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                    """

            # Add "Copy of" prefix to title
            new_title = f"Copy of {original_task['title']}"

            # Use today's date and current time
            today = datetime.now().date()
            current_time = datetime.now().time()

            values = (
                new_title,
                original_task['description'],
                original_task['category'],
                original_task['categories'],
                original_task['client'],
                today,
                current_time,
                original_task['duration'],
                'uncompleted',  # New tasks start as uncompleted
                original_task['tags'],
                original_task['notes'],
                original_task['shared'],
                False  # Duplicates should not be created as drafts
            )

            cursor.execute(query, values)
            connection.commit()

            new_task_id = cursor.lastrowid

            return jsonify({
                'message': 'Task duplicated successfully',
                'id': new_task_id
            }), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


# noinspection DuplicatedCode
@app.route('/api/drafts', methods=['GET'])
def get_drafts():
    """Get all draft tasks"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                    SELECT *
                    FROM tasks
                    WHERE is_draft = TRUE
                    ORDER BY updated_at DESC \
                    """

            cursor.execute(query)
            drafts = cursor.fetchall()

            # Convert datetime objects to strings and tags to array using helper
            for draft in drafts:
                serialize_task(draft)

            return jsonify(drafts)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export tasks to CSV"""
    try:
        # Get filtering parameters (same as get_tasks)
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query (same logic as get_tasks)
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)

            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)

            query += " ORDER BY task_date DESC, task_time DESC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            # Create CSV
            output = io.StringIO()
            if tasks:
                fieldnames = list(tasks[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for task in tasks:
                    # sanitize each value to prevent formula injection
                    safe_row = {k: sanitize_csv_field(task.get(k)) for k in fieldnames}
                    writer.writerow(safe_row)

            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/hours-report', methods=['GET'])
def export_hours_report():
    """Export tasks to CSV in hours report format (compatible with Google Sheets billable hours format)"""
    try:
        # Get filtering parameters
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query (same logic as get_tasks)
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)

            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)

            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")

            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])

            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)

            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)

            query += " ORDER BY task_date ASC, task_time ASC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            # Create CSV in hours report format
            output = io.StringIO()

            # Define hours report format columns
            fieldnames = ['Date', 'Client', 'Task', 'Category', 'Hours', 'Status', 'Notes']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            # Transform tasks into hours report format
            for task in tasks:
                # Parse categories from JSON if it's a string
                categories_str = ''
                if task.get('categories'):
                    try:
                        import json
                        categories_list = json.loads(task['categories']) if isinstance(task['categories'], str) else \
                        task['categories']
                        categories_str = ', '.join(categories_list) if isinstance(categories_list, list) else str(
                            categories_list)
                    except:
                        categories_str = str(task['categories'])

                writer.writerow({
                    'Date': task['task_date'].strftime('%Y-%m-%d') if hasattr(task['task_date'], 'strftime') else str(
                        task['task_date']),
                    'Client': task.get('client', ''),
                    'Task': task.get('title', ''),
                    'Category': categories_str,
                    'Hours': task.get('duration', ''),
                    'Status': task.get('status', ''),
                    'Notes': task.get('notes', '')
                })

            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'hours_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/import/hours-report', methods=['POST'])
def import_hours_report():
    """Import tasks from hours report CSV or Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Read the file based on extension
            if filename.endswith('.csv'):
                # Try different encodings for Hebrew support
                encodings_to_try = [
                    'utf-8-sig', 'utf-8', 'windows-1255', 'iso-8859-8', 'cp1255',
                    'cp1252', 'windows-1252', 'latin-1', 'iso-8859-1'
                ]

                df = None
                for encoding in encodings_to_try:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        print(f"Successfully read file with encoding: {encoding}")
                        break
                    except (UnicodeDecodeError, UnicodeError, LookupError):
                        continue

                if df is None:
                    df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file.'}), 400

            # Expected columns: Date, Client, Task, Category, Hours, Status, Notes
            required_columns = ['Date', 'Task']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400

            # Process and import tasks
            imported_count = 0
            errors = []

            with get_db_connection() as connection:
                cursor = connection.cursor()

                for index, row in df.iterrows():
                    try:
                        # Parse date
                        task_date = pd.to_datetime(row['Date'], errors='coerce')
                        if pd.isna(task_date):
                            errors.append(f"Row {index + 2}: Invalid date")
                            continue

                        # Get task details
                        title = str(row['Task']).strip() if pd.notna(row['Task']) else ''
                        if not title:
                            errors.append(f"Row {index + 2}: Missing task title")
                            continue

                        client = str(row.get('Client', '')).strip() if pd.notna(row.get('Client')) else ''
                        category = str(row.get('Category', 'other')).strip() if pd.notna(
                            row.get('Category')) else 'other'
                        duration = row.get('Hours')
                        status = str(row.get('Status', 'completed')).strip().lower() if pd.notna(
                            row.get('Status')) else 'completed'
                        notes = str(row.get('Notes', '')).strip() if pd.notna(row.get('Notes')) else ''

                        # Handle duration - convert to float or None
                        if pd.notna(duration) and duration != '':
                            try:
                                duration = float(duration)
                            except (ValueError, TypeError):
                                duration = None
                        else:
                            duration = None

                        # Insert into database
                        query = """
                                INSERT INTO tasks
                                (title, description, category, categories, client, task_date, task_time,
                                 duration, status, tags, notes)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                                """

                        values = (
                            title,
                            '',  # description
                            category,
                            category,  # categories
                            client,
                            task_date.strftime('%Y-%m-%d'),
                            '00:00:00',  # default time
                            duration,
                            status if status in ['completed', 'uncompleted'] else 'completed',
                            '',  # tags
                            notes
                        )

                        cursor.execute(query, values)
                        imported_count += 1

                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                        continue

                connection.commit()

            # Clean up uploaded file
            os.remove(file_path)

            result = {
                'message': f'Successfully imported {imported_count} task(s)',
                'imported_count': imported_count
            }

            if errors:
                result['errors'] = errors[:10]  # Return first 10 errors
                if len(errors) > 10:
                    result['additional_errors'] = len(errors) - 10

            return jsonify(result), 200

        except Exception as e:
            # Clean up file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about tasks - FILTERED BY USER ROLE"""
    try:
        # CRITICAL: Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username or not user_role:
            return jsonify({'error': 'Unauthorized: username and role required'}), 401
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build WHERE clause based on role
            where_clause = "WHERE 1=1"
            params = []
            
            if user_role == 'shared':
                where_clause += " AND shared = TRUE"
            elif user_role == 'limited':
                where_clause += " AND created_by = %s AND created_by IS NOT NULL"
                params.append(username)
            # admin: no additional filter

            # Overall stats
            query = f"""
                SELECT COUNT(*) as total_tasks,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                       SUM(CASE WHEN status = 'uncompleted' THEN 1 ELSE 0 END) as uncompleted_tasks,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
            """
            cursor.execute(query, params)
            overall = cursor.fetchone()

            # Stats by category
            query = f"""
                SELECT category,
                       COUNT(*) as count,
                       SUM(duration) as total_duration,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM tasks
                {where_clause}
                GROUP BY category
                ORDER BY count DESC
            """
            cursor.execute(query, params)
            by_category = cursor.fetchall()

            # Stats by client
            query = f"""
                SELECT client,
                       COUNT(*) as count,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
                AND client IS NOT NULL AND client != ''
                GROUP BY client
                ORDER BY count DESC
                LIMIT 10
            """
            cursor.execute(query, params)
            by_client = cursor.fetchall()

            # Monthly stats
            query = f"""
                SELECT DATE_FORMAT(task_date, '%Y-%m') as month,
                       COUNT(*) as count,
                       SUM(duration) as total_duration
                FROM tasks
                {where_clause}
                GROUP BY month
                ORDER BY month DESC
                LIMIT 12
            """
            cursor.execute(query, params)
            monthly = cursor.fetchall()

            # Convert Decimal to float
            if overall['total_duration']:
                overall['total_duration'] = float(overall['total_duration'])

            for item in by_category:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            for item in by_client:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            for item in monthly:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])

            return jsonify({
                'overall': overall,
                'by_category': by_category,
                'by_client': by_client,
                'monthly': monthly
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories', methods=['GET', 'POST'])
def manage_categories():
    """Get list of categories or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own categories OR categories with no owner (shared)
                    query = """
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY label
                    """
                    cursor.execute(query, (username,))
                else:
                    # Admin and shared users see all categories
                    cursor.execute("""
                        SELECT category_id as id, label, color, icon
                        FROM categories_master
                        ORDER BY label
                    """)

                categories = cursor.fetchall()
                return jsonify(categories)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            category_id = data.get('id', '').strip().lower().replace(' ', '-')
            label = data.get('label', '').strip()
            color = data.get('color', '#0d6efd')
            icon = data.get('icon', '📝')
            owner = data.get('owner')  # Get owner from request

            if not category_id or not label:
                return jsonify({'error': 'Category ID and label are required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO categories_master (category_id, label, color, icon, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (category_id, label, color, icon, owner))
                connection.commit()

                return jsonify({
                    'id': category_id,
                    'label': label,
                    'color': color,
                    'icon': icon
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Category already exists'}), 409
            return jsonify({'error': str(e)}), 500


@app.route('/api/categories/<category_id>', methods=['PUT', 'DELETE'])
def update_delete_category(category_id):
    """Update or delete a category"""
    if request.method == 'PUT':
        try:
            data = request.json
            label = data.get('label', '').strip()
            color = data.get('color')
            icon = data.get('icon')

            if not label:
                return jsonify({'error': 'Label is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               UPDATE categories_master
                               SET label = %s,
                                   color = %s,
                                   icon  = %s
                               WHERE category_id = %s
                               """, (label, color, icon, category_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               DELETE
                               FROM categories_master
                               WHERE category_id = %s
                               """, (category_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/tags', methods=['GET', 'POST'])
def manage_tags():
    """Get list of tags or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own tags OR tags with no owner (shared)
                    query = """
                        SELECT id, name, color
                        FROM tags
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """
                    cursor.execute(query, (username,))
                else:
                    # Admin and shared users see all tags
                    cursor.execute("""
                        SELECT id, name, color
                        FROM tags
                        ORDER BY name
                    """)

                tags = cursor.fetchall()
                return jsonify(tags)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color', '#0d6efd')
            owner = data.get('owner')  # Get owner from request

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO tags (name, color, owner)
                               VALUES (%s, %s, %s)
                               """, (name, color, owner))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'color': color
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Tag already exists'}), 409
            return jsonify({'error': str(e)}), 500


@app.route('/api/tags/<int:tag_id>', methods=['PUT', 'DELETE'])
def update_delete_tag(tag_id):
    """Update or delete a tag"""
    if request.method == 'PUT':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color')

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               UPDATE tags
                               SET name  = %s,
                                   color = %s
                               WHERE id = %s
                               """, (name, color, tag_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               DELETE
                               FROM tags
                               WHERE id = %s
                               """, (tag_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/clients', methods=['GET', 'POST'])
def manage_clients_list():
    """Get list of clients or create a new one"""
    if request.method == 'GET':
        try:
            username = request.args.get('username')
            user_role = request.args.get('role')

            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Build query based on user role
                if user_role == 'limited':
                    # Limited users only see their own clients OR clients with no owner
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        WHERE owner = %s OR owner IS NULL
                        ORDER BY name
                    """, (username,))
                    clients_from_table = cursor.fetchall()

                    # Also get clients from their own tasks
                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND created_by = %s
                          AND client NOT IN (SELECT name FROM clients WHERE owner = %s OR owner IS NULL)
                        ORDER BY client
                    """, (username, username))
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]
                else:
                    # Admin and shared users see all clients
                    cursor.execute("""
                        SELECT name, email, phone, notes, created_at, updated_at
                        FROM clients
                        ORDER BY name
                    """)
                    clients_from_table = cursor.fetchall()

                    # Also get clients that only exist in tasks table
                    cursor.execute("""
                        SELECT DISTINCT client
                        FROM tasks
                        WHERE client IS NOT NULL
                          AND client != ''
                          AND client NOT IN (SELECT name FROM clients)
                        ORDER BY client
                    """)
                    clients_from_tasks = [row['client'] for row in cursor.fetchall()]

                # Combine both lists
                all_clients = clients_from_table + [{'name': c} for c in clients_from_tasks]

                return jsonify(all_clients)

        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            owner = data.get('owner')  # Get owner from request

            if not name:
                return jsonify({'error': 'Client name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                               INSERT INTO clients (name, email, phone, notes, owner)
                               VALUES (%s, %s, %s, %s, %s)
                               """, (
                                   name,
                                   data.get('email', ''),
                                   data.get('phone', ''),
                                   data.get('notes', ''),
                                   owner
                               ))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'email': data.get('email', ''),
                    'phone': data.get('phone', ''),
                    'notes': data.get('notes', '')
                }), 201

        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Client already exists'}), 409
            return jsonify({'error': str(e)}), 500


# ============ BANK TRANSACTIONS ENDPOINTS ============

def clean_transaction_data(df):
    """Clean transaction data from uploaded file"""
    print(f"[CLEAN] Before cleaning: {len(df)} rows", flush=True)

    # Remove rows where all columns are empty
    df = df.dropna(how='all')
    print(f"[CLEAN] After removing empty rows: {len(df)} rows", flush=True)

    # Don't drop rows based on columns yet - let the main parser handle it
    # Just remove completely empty rows

    # Reset index
    df = df.reset_index(drop=True)

    print(f"[CLEAN] First 3 rows after cleaning:", flush=True)
    for i in range(min(3, len(df))):
        print(f"  Row {i}: {df.iloc[i].tolist()}", flush=True)

    return df


def parse_cash_transaction_file(file_path):
    """Parse CSV file for cash transactions (handles header row and different column orders)"""
    try:
        print(f"\n{'=' * 60}", flush=True)
        print(f"[CASH TRANSACTIONS] Starting to parse file", flush=True)

        # Try Hebrew encodings
        encodings_to_try = ['utf-8-sig', 'utf-8', 'windows-1255', 'cp1255', 'iso-8859-8']

        df = None
        for encoding in encodings_to_try:
            try:
                # Read with header to check column names
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"[SUCCESS] Read cash CSV with encoding: {encoding}", flush=True)
                print(f"[COLUMNS] Found columns: {list(df.columns)}", flush=True)
                break
            except Exception as e:
                print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                continue

        if df is None:
            df = pd.read_csv(file_path, encoding='utf-8', errors='replace')

        # Remove completely empty rows
        df = df.dropna(how='all')

        # Filter out rows that are totals (contain "סה״כ" anywhere)
        for col in df.columns:
            df = df[~df[col].astype(str).str.contains('סה״כ', na=False)]

        print(f"[CLEAN] After removing totals: {len(df)} rows", flush=True)

        if len(df) == 0:
            raise ValueError("No valid transactions found in file")

        # Try to identify columns by content or header names
        # Common Hebrew headers: שם כרטיס (card), תאריך (date), שם בית עסק (business), סכום קנייה (amount)
        date_col = None
        amount_col = None
        desc_col = None
        account_col = None

        # Check column headers for Hebrew names
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if 'תאריך' in col_str or 'date' in col_str.lower():
                date_col = i
            elif 'סכום' in col_str or 'amount' in col_str.lower():
                amount_col = i
            elif 'בית עסק' in col_str or 'description' in col_str.lower() or 'עסק' in col_str:
                desc_col = i
            elif 'כרטיס' in col_str or 'חשבון' in col_str or 'account' in col_str.lower():
                account_col = i

        # If headers didn't work, try to detect by content
        if date_col is None:
            date_pattern = r'\d{2}\.\d{2}\.\d{4}'
            for i in range(len(df.columns)):
                sample_values = df.iloc[:5, i].astype(str)
                if sample_values.str.match(date_pattern).any():
                    date_col = i
                    break

        if amount_col is None:
            for i in range(len(df.columns)):
                if i == date_col:
                    continue
                sample_values = df.iloc[:5, i].astype(str).str.replace(',', '').str.replace('"', '')
                try:
                    pd.to_numeric(sample_values, errors='raise')
                    amount_col = i
                    break
                except:
                    continue

        # Default assignments if still not found
        if date_col is None:
            date_col = 1  # Common position for date
        if amount_col is None:
            amount_col = 3  # Common position for amount
        if desc_col is None:
            desc_col = 2  # Common position for description
        if account_col is None:
            account_col = 0  # Common position for account

        print(f"[COLUMNS] Using: date={date_col}, amount={amount_col}, desc={desc_col}, account={account_col}",
              flush=True)

        # Create structured dataframe
        transactions = []
        for idx, row in df.iterrows():
            try:
                # Get date
                date_str = str(row.iloc[date_col]).strip()
                # Skip if not a valid date
                if not pd.notna(row.iloc[date_col]) or date_str in ['', 'nan', 'NaN']:
                    continue

                transaction_date = pd.to_datetime(date_str, format='%d.%m.%Y', errors='coerce')
                if pd.isna(transaction_date):
                    # Try other date formats
                    transaction_date = pd.to_datetime(date_str, errors='coerce')
                if pd.isna(transaction_date):
                    print(f"[SKIP] Row {idx}: Invalid date '{date_str}'", flush=True)
                    continue

                # Get amount (remove commas and quotes)
                amount_str = str(row.iloc[amount_col]).strip().replace(',', '').replace('"', '')
                if not amount_str or amount_str in ['nan', 'NaN', '']:
                    continue
                amount = float(amount_str)

                # Get description
                description = str(row.iloc[desc_col]).strip() if pd.notna(row.iloc[desc_col]) else 'משיכת מזומן'
                if description in ['nan', 'NaN', '']:
                    description = 'משיכת מזומן'

                # Get account number
                account_number = str(row.iloc[account_col]).strip() if pd.notna(row.iloc[account_col]) else ''
                if account_number in ['nan', 'NaN']:
                    account_number = ''

                # Month year
                month_year = transaction_date.strftime('%Y-%m')

                transactions.append({
                    'transaction_date': transaction_date,
                    'amount': amount,
                    'account_number': account_number,
                    'description': description,
                    'month_year': month_year,
                    'transaction_type': 'cash'
                })
                print(f"[PARSED] {transaction_date.strftime('%Y-%m-%d')}: {description} = {amount}", flush=True)
            except Exception as e:
                print(f"[SKIP ROW {idx}] Error: {e}", flush=True)
                continue

        if not transactions:
            raise ValueError("No valid transactions could be parsed from the file")

        result_df = pd.DataFrame(transactions)
        print(f"[CASH TRANSACTIONS] Successfully parsed {len(result_df)} transactions", flush=True)

        return result_df

    except Exception as e:
        print(f"[ERROR] Cash transaction parsing failed: {str(e)}", flush=True)
        raise ValueError(f"Error parsing cash transaction file: {str(e)}")


def parse_transaction_file(file_path, transaction_type='credit'):
    """Parse CSV or Excel file and return cleaned dataframe"""
    try:
        # If it's marked as cash transaction, use special parser
        if transaction_type == 'cash':
            return parse_cash_transaction_file(file_path)

        # Otherwise use standard credit card transaction parser
        # Determine file type and read accordingly
        if file_path.endswith('.csv'):
            # Use chardet to detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                result = chardet.detect(raw_data)
                detected_encoding = result['encoding']
                confidence = result['confidence']

                print(f"\n{'=' * 60}", flush=True)
                print(f"[ENCODING DEBUG] File: {file_path}", flush=True)
                print(f"[CHARDET] Detected: {detected_encoding} (confidence: {confidence})", flush=True)

                # Show first 200 bytes in hex for debugging
                print(f"[RAW BYTES] First 200 bytes (hex): {raw_data[:200].hex()}", flush=True)

                # Try to decode first line with different encodings to see which looks right
                first_line_end = raw_data.find(b'\n')
                if first_line_end > 0:
                    first_line_bytes = raw_data[:first_line_end]
                    print(f"[FIRST LINE BYTES] {first_line_bytes.hex()}", flush=True)
                    for test_enc in ['windows-1255', 'utf-8', 'iso-8859-8', 'cp1255']:
                        try:
                            decoded = first_line_bytes.decode(test_enc)
                            print(f"[TEST DECODE {test_enc}] {decoded}", flush=True)
                        except:
                            print(f"[TEST DECODE {test_enc}] FAILED", flush=True)

                # Map common encodings to their variants
                encoding_map = {
                    'ISO-8859-8': 'windows-1255',  # Hebrew ISO -> Windows Hebrew
                    'ISO-8859-1': 'cp1252',  # Latin-1 -> Windows-1252
                    'ascii': 'utf-8'  # ASCII -> UTF-8
                }

                # Try detected encoding first, then its mapped variant
                encodings_to_try = []
                if detected_encoding:
                    encodings_to_try.append(detected_encoding)
                    if detected_encoding.upper() in encoding_map:
                        encodings_to_try.append(encoding_map[detected_encoding.upper()])

                # Add Hebrew encodings as backup (since detection can be unreliable for Hebrew)
                encodings_to_try.extend([
                    'windows-1255',
                    'cp1255',
                    'iso-8859-8',
                    'utf-8-sig',
                    'utf-8',
                    'cp1252',
                    'windows-1252',
                    'latin-1'
                ])

                # Remove duplicates while preserving order
                seen = set()
                encodings_to_try = [x for x in encodings_to_try if x and not (x in seen or seen.add(x))]

            df = None
            used_encoding = None
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    used_encoding = encoding
                    print(f"[SUCCESS] Read CSV with encoding: {encoding}", flush=True)

                    # Debug: show first description value
                    if len(df) > 0 and len(df.columns) >= 3:
                        first_desc = df.iloc[0, 2] if len(df.columns) > 2 else "N/A"
                        print(f"[FIRST DESCRIPTION] {first_desc}", flush=True)
                        print(f"[FIRST DESC BYTES] {str(first_desc).encode('utf-8').hex()}", flush=True)

                    break
                except (UnicodeDecodeError, UnicodeError, LookupError) as e:
                    print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                    continue

            if df is None:
                # If all encodings fail, try with errors='replace'
                df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
                used_encoding = 'utf-8-replace'
                print(f"[FALLBACK] Using UTF-8 with error replacement", flush=True)
        else:
            df = pd.read_excel(file_path)

        # Clean the data
        df = clean_transaction_data(df)

        # Ensure we have the expected columns
        if len(df.columns) < 4:
            raise ValueError("File must have at least 4 columns: Account Number, Date, Description, Amount")

        # Rename columns to standard names
        df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])

        # Parse dates - handle DD.MM.YYYY format
        print(f"[PARSE] Before date parsing: {len(df)} rows", flush=True)
        df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%d.%m.%Y', errors='coerce')
        print(f"[PARSE] After date parsing, rows with NaT dates: {df['transaction_date'].isna().sum()}", flush=True)

        # Convert amount to float
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        print(f"[PARSE] After amount parsing, rows with NaN amounts: {df['amount'].isna().sum()}", flush=True)

        # Show first 3 rows before dropping
        print(f"[PARSE] First 3 rows before dropping NaN:", flush=True)
        for i in range(min(3, len(df))):
            print(
                f"  Row {i}: date={df.iloc[i]['transaction_date']}, desc={df.iloc[i]['description']}, amt={df.iloc[i]['amount']}",
                flush=True)

        # Remove rows with invalid dates or amounts
        df = df.dropna(subset=['transaction_date', 'amount'])
        print(f"[PARSE] After dropping NaN: {len(df)} rows remaining", flush=True)

        # Add month_year column
        df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')

        # Add transaction_type column
        df['transaction_type'] = transaction_type

        return df

    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")


@app.route('/api/transactions/upload', methods=['POST'])
def upload_transactions():
    """Upload and parse bank transaction file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        transaction_type = request.form.get('transaction_type', 'credit')  # Get transaction type from form

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Parse the file with transaction type
            df = parse_transaction_file(file_path, transaction_type)

            # Calculate total amount
            total_amount = float(df['amount'].sum())

            # Convert to list of dictionaries for JSON response
            transactions = []
            for idx, row in df.iterrows():
                desc_value = str(row['description'])

                # Debug first transaction
                if idx == 0:
                    print(f"[FIRST TRANSACTION DEBUG]", flush=True)
                    print(f"  Description value: {desc_value}", flush=True)
                    print(f"  Description type: {type(desc_value)}", flush=True)
                    print(f"  Description bytes: {desc_value.encode('utf-8').hex()}", flush=True)
                    print(f"  Description repr: {repr(desc_value)}", flush=True)

                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': desc_value,
                    'amount': float(row['amount']),
                    'month_year': row['month_year'],
                    'transaction_type': row.get('transaction_type', transaction_type)
                })

            response_data = {
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'temp_filename': filename,  # Return filename for re-encoding attempts
                'transaction_type': transaction_type
            }

            # Debug the JSON response
            if transactions:
                print(f"[JSON RESPONSE DEBUG]", flush=True)
                print(f"  First transaction description: {transactions[0]['description']}", flush=True)
                import json
                json_str = json.dumps(transactions[0], ensure_ascii=False)
                print(f"  First transaction JSON: {json_str}", flush=True)
                print(f"  JSON bytes: {json_str.encode('utf-8').hex()}", flush=True)
                print(f"{'=' * 60}\n", flush=True)

            return jsonify(response_data)

        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@app.route('/api/transactions/encoding-preview', methods=['POST'])
def encoding_preview():
    """Show previews of file with different encodings to let user choose"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f'preview_{filename}')
        file.save(file_path)

        # List of encodings to try
        encodings_to_test = [
            'utf-8',
            'windows-1255',  # Hebrew Windows
            'iso-8859-8',  # Hebrew ISO
            'cp1255',  # Hebrew Code Page
            'utf-16',
            'windows-1252',  # Western European
            'iso-8859-1',  # Latin-1
        ]

        previews = []

        for encoding in encodings_to_test:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                df = clean_transaction_data(df)

                if len(df.columns) >= 4:
                    # Get first 3 rows, 3rd column (description)
                    descriptions = []
                    for i in range(min(3, len(df))):
                        try:
                            desc = str(df.iloc[i, 2])  # 3rd column
                            descriptions.append(desc)
                        except:
                            descriptions.append("N/A")

                    previews.append({
                        'encoding': encoding,
                        'success': True,
                        'samples': descriptions
                    })
            except Exception as e:
                previews.append({
                    'encoding': encoding,
                    'success': False,
                    'error': str(e)[:100]
                })

        # Keep the file for when user selects an encoding
        return jsonify({
            'success': True,
            'temp_filename': filename,
            'previews': previews
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@app.route('/api/transactions/upload-with-encoding', methods=['POST'])
def upload_with_encoding():
    """Upload file with user-selected encoding"""
    try:
        data = request.json
        temp_filename = data.get('temp_filename')
        selected_encoding = data.get('encoding', 'utf-8')

        if not temp_filename:
            return jsonify({'error': 'No temp filename provided'}), 400

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f'preview_{temp_filename}')

        if not os.path.exists(file_path):
            return jsonify({'error': 'Temporary file not found'}), 400

        try:
            # Parse with selected encoding
            df = pd.read_csv(file_path, encoding=selected_encoding)
            df = clean_transaction_data(df)

            if len(df.columns) < 4:
                raise ValueError("File must have at least 4 columns")

            df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])
            df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%d.%m.%Y', errors='coerce')
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            df = df.dropna(subset=['transaction_date', 'amount'])
            df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')

            # Convert to transactions list
            transactions = []
            for _, row in df.iterrows():
                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': str(row['description']),
                    'amount': float(row['amount']),
                    'month_year': row['month_year']
                })

            total_amount = float(df['amount'].sum())

            return jsonify({
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'encoding_used': selected_encoding
            })

        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@app.route('/api/transactions/save', methods=['POST'])
def save_transactions():
    """Save parsed transactions to database with encryption"""
    try:
        data = request.json
        transactions = data.get('transactions', [])
        username = data.get('username')  # Get uploader username

        if not transactions:
            return jsonify({'error': 'No transactions to save'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Insert transactions with encryption on sensitive fields
            query = """
                    INSERT INTO bank_transactions
                    (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """

            transaction_ids = []
            for trans in transactions:
                # Encrypt sensitive fields
                encrypted_account = encrypt_field(trans.get('account_number', ''))
                encrypted_description = encrypt_field(trans['description'])
                encrypted_amount = encrypt_field(str(trans['amount']))

                values = (
                    encrypted_account,
                    trans['transaction_date'],
                    encrypted_description,
                    encrypted_amount,
                    trans['month_year'],
                    trans.get('transaction_type', 'credit'),
                    username
                )
                cursor.execute(query, values)
                transaction_ids.append(str(cursor.lastrowid))

            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='SAVE',
                transaction_ids=','.join(transaction_ids[:10]) + ('...' if len(transaction_ids) > 10 else ''),
                month_year=transactions[0].get('month_year')
            )

            return jsonify({
                'success': True,
                'message': f'{len(transactions)} transactions saved successfully (encrypted)'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/months', methods=['GET'])
def get_transaction_months():
    """Get list of months with saved transactions (filtered by user role)"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT month_year,
                       COUNT(*) as transaction_count,
                       SUM(amount) as total_amount,
                       MIN(transaction_date) as start_date,
                       MAX(transaction_date) as end_date,
                       MAX(upload_date) as last_upload
                FROM bank_transactions
                WHERE 1=1
            """
            params = []
            
            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all
            
            query += " GROUP BY month_year ORDER BY month_year DESC"
            
            cursor.execute(query, params)
            months = cursor.fetchall()

            # Convert Decimal to float
            for month in months:
                if month['total_amount']:
                    month['total_amount'] = float(month['total_amount'])
                if month['start_date']:
                    month['start_date'] = month['start_date'].isoformat()
                if month['end_date']:
                    month['end_date'] = month['end_date'].isoformat()
                if month['last_upload']:
                    month['last_upload'] = month['last_upload'].isoformat()

            return jsonify(months)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/all', methods=['GET'])
def get_all_transactions():
    """Get all transactions (filtered by user role) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT id,
                       account_number,
                       transaction_date,
                       description,
                       amount,
                       month_year,
                       transaction_type,
                       upload_date,
                       uploaded_by
                FROM bank_transactions
                WHERE 1=1
            """
            params = []

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all transactions

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

            # Decrypt sensitive fields and convert types
            for trans in transactions:
                # Decrypt sensitive fields
                trans['account_number'] = decrypt_field(trans['account_number'])
                trans['description'] = decrypt_field(trans['description'])
                trans['amount'] = decrypt_field(trans['amount'])

                # Convert types after decryption
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    try:
                        trans['amount'] = float(trans['amount'])
                    except (ValueError, TypeError):
                        trans['amount'] = 0.0
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='VIEW_ALL',
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/<month_year>', methods=['GET'])
def get_transactions_by_month(month_year):
    """Get all transactions for a specific month (filtered by user role) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query based on role
            query = """
                SELECT id,
                       account_number,
                       transaction_date,
                       description,
                       amount,
                       month_year,
                       transaction_type,
                       upload_date,
                       uploaded_by
                FROM bank_transactions
                WHERE month_year = %s
            """
            params = [month_year]

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

            query += " ORDER BY transaction_date DESC, id DESC"

            cursor.execute(query, params)
            transactions = cursor.fetchall()

            # Decrypt sensitive fields and convert types
            for trans in transactions:
                # Decrypt sensitive fields
                trans['account_number'] = decrypt_field(trans['account_number'])
                trans['description'] = decrypt_field(trans['description'])
                trans['amount'] = decrypt_field(trans['amount'])

                # Convert types after decryption
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    try:
                        trans['amount'] = float(trans['amount'])
                    except (ValueError, TypeError):
                        trans['amount'] = 0.0
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='VIEW_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {len(transactions)}"
            )

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a specific transaction with audit logging"""
    try:
        username = request.args.get('username', 'unknown')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM bank_transactions WHERE id = %s", (transaction_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Transaction not found'}), 404

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/month/<month_year>', methods=['DELETE'])
def delete_month_transactions(month_year):
    """Delete all transactions for a specific month with audit logging"""
    try:
        username = request.args.get('username', 'unknown')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM bank_transactions WHERE month_year = %s", (month_year,))
            deleted_count = cursor.rowcount
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='DELETE_MONTH',
                month_year=month_year,
                transaction_ids=f"Count: {deleted_count}"
            )

            return jsonify({
                'message': f'{deleted_count} transactions deleted successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update a specific transaction with encryption"""
    try:
        data = request.json
        username = data.get('username', 'unknown')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                    UPDATE bank_transactions
                    SET transaction_date = %s,
                        description      = %s,
                        amount           = %s,
                        month_year       = %s,
                        account_number   = %s,
                        transaction_type = %s
                    WHERE id = %s
                    """

            cursor.execute(query, (
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                encrypted_account,
                data.get('transaction_type', 'credit'),
                transaction_id
            ))
            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='UPDATE',
                transaction_ids=str(transaction_id)
            )

            return jsonify({'message': 'Transaction updated successfully (encrypted)'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/manual', methods=['POST'])
def add_manual_transaction():
    """Add a transaction manually with encryption"""
    try:
        data = request.json
        username = data.get('username', 'admin')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                    INSERT INTO bank_transactions
                    (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """

            cursor.execute(query, (
                encrypted_account,
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                data.get('transaction_type', 'credit'),
                username
            ))
            connection.commit()

            transaction_id = cursor.lastrowid

            # Audit log
            log_bank_transaction_access(
                username=username,
                action='MANUAL_ADD',
                transaction_ids=str(transaction_id),
                month_year=data.get('month_year')
            )

            return jsonify({
                'message': 'Transaction added successfully (encrypted)',
                'id': transaction_id
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/descriptions', methods=['GET'])
def get_all_descriptions():
    """Get all unique transaction descriptions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("""
                           SELECT DISTINCT description
                           FROM bank_transactions
                           WHERE description IS NOT NULL
                             AND description != ''
                           ORDER BY description
                           """)

            descriptions = [row[0] for row in cursor.fetchall()]
            return jsonify(descriptions)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transactions/stats', methods=['GET'])
def get_transaction_stats():
    """Get transaction statistics including cash vs credit breakdown (filtered by user role)"""
    try:
        # Get optional date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build filters
            filters = []
            params = []
            
            if start_date:
                filters.append("transaction_date >= %s")
                params.append(start_date)
            if end_date:
                filters.append("transaction_date <= %s")
                params.append(end_date)
            if user_role == 'limited':
                filters.append("uploaded_by = %s")
                params.append(username)
            
            where_clause = " AND ".join(filters) if filters else "1=1"

            # Overall stats by type
            cursor.execute(f"""
                SELECT 
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    MIN(transaction_date) as first_date,
                    MAX(transaction_date) as last_date
                FROM bank_transactions
                WHERE {where_clause}
                GROUP BY transaction_type
            """, params)

            by_type = cursor.fetchall()

            # Convert Decimal to float
            for item in by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])
                if item['avg_amount']:
                    item['avg_amount'] = float(item['avg_amount'])
                if item['first_date']:
                    item['first_date'] = item['first_date'].isoformat()
                if item['last_date']:
                    item['last_date'] = item['last_date'].isoformat()

            # Monthly breakdown by type
            cursor.execute(f"""
                SELECT 
                    month_year,
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount
                FROM bank_transactions
                WHERE {where_clause}
                GROUP BY month_year, transaction_type
                ORDER BY month_year DESC, transaction_type
            """, params)

            monthly_by_type = cursor.fetchall()

            # Convert Decimal to float
            for item in monthly_by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])

            return jsonify({
                'by_type': by_type,
                'monthly_by_type': monthly_by_type
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ============ CLIENT MANAGEMENT ENDPOINTS ============

@app.route('/api/clients/manage', methods=['GET'])
def get_all_clients_with_stats():
    """Get all clients with their billable hours statistics"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT client,
                                  COUNT(*)                                                     as task_count,
                                  SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as total_hours,
                                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)        as completed_tasks
                           FROM tasks
                           WHERE client IS NOT NULL
                             AND client != ''
                           GROUP BY client
                           ORDER BY client


                           """)

            clients = cursor.fetchall()

            # Convert Decimal to float for JSON serialization
            for client in clients:
                if client.get('total_hours') is not None:
                    client['total_hours'] = float(client['total_hours'])
                else:
                    client['total_hours'] = 0.0

            return jsonify(clients)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clients/<client_name>', methods=['PUT'])
def rename_client(client_name):
    """Rename a client across all tasks"""
    try:
        data = request.json
        new_name = data.get('new_name')

        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("UPDATE tasks SET client = %s WHERE client = %s", (new_name, client_name))
            connection.commit()

            return jsonify({
                'message': f'Client renamed successfully',
                'updated_count': cursor.rowcount
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clients/<client_name>', methods=['DELETE'])
def delete_client(client_name):
    """Delete all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM tasks WHERE client = %s", (client_name,))
            connection.commit()

            return jsonify({
                'message': f'{cursor.rowcount} tasks deleted successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clients/<client_name>/tasks', methods=['GET'])
def get_client_tasks(client_name):
    """Get all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                           SELECT *
                           FROM tasks
                           WHERE client = %s
                           ORDER BY task_date DESC, task_time DESC
                           """, (client_name,))

            tasks = cursor.fetchall()

            # Convert datetime objects to strings
            for task in tasks:
                if task.get('task_date'):
                    task['task_date'] = task['task_date'].strftime('%Y-%m-%d')
                if task.get('task_time'):
                    task['task_time'] = str(task['task_time'])

            return jsonify(tasks)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/migrate-user-ownership', methods=['POST'])
def migrate_user_ownership():
    """Add owner column to categories_master, tags, and clients tables for user isolation"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Add owner column to categories_master if it doesn't exist
            cursor.execute("""
                ALTER TABLE categories_master
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            # Add owner column to tags if it doesn't exist
            cursor.execute("""
                ALTER TABLE tags
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            # Add owner column to clients if it doesn't exist
            cursor.execute("""
                ALTER TABLE clients
                ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT NULL,
                ADD INDEX IF NOT EXISTS idx_owner (owner)
            """)

            connection.commit()

            return jsonify({
                'success': True,
                'message': 'Database migrated successfully - user ownership columns added'
            })

    except Error as e:
        print(f"Migration error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/migrate-encrypt-transactions', methods=['POST'])
def migrate_encrypt_transactions():
    """
    CRITICAL SECURITY MIGRATION: Encrypt existing bank transaction data

    This endpoint encrypts all existing plaintext bank transactions.
    Only needs to be run ONCE after deploying encryption changes.

    WARNING: This operation cannot be easily reversed. Ensure DATA_ENCRYPTION_KEY
    is properly backed up before running!
    """
    try:
        admin_password = request.json.get('admin_password')

        # Require admin authentication
        if not admin_password or admin_password != os.getenv('MIGRATION_PASSWORD'):
            return jsonify({'error': 'Unauthorized - invalid admin password'}), 403

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get all transactions
            cursor.execute("""
                SELECT id, account_number, description, amount
                FROM bank_transactions
            """)
            transactions = cursor.fetchall()

            if not transactions:
                return jsonify({
                    'success': True,
                    'message': 'No transactions to encrypt',
                    'encrypted_count': 0
                })

            encrypted_count = 0
            already_encrypted_count = 0

            for trans in transactions:
                try:
                    # Try to decrypt - if it works, it's already encrypted
                    decrypt_field(trans['account_number'])
                    decrypt_field(trans['description'])
                    decrypt_field(trans['amount'])
                    already_encrypted_count += 1
                    continue
                except:
                    # Decryption failed, so it's plaintext - encrypt it
                    encrypted_account = encrypt_field(trans['account_number'] or '')
                    encrypted_description = encrypt_field(trans['description'])
                    encrypted_amount = encrypt_field(str(trans['amount']))

                    cursor.execute("""
                        UPDATE bank_transactions
                        SET account_number = %s,
                            description = %s,
                            amount = %s
                        WHERE id = %s
                    """, (encrypted_account, encrypted_description, encrypted_amount, trans['id']))

                    encrypted_count += 1

            connection.commit()

            # Audit log
            log_bank_transaction_access(
                username='system',
                action='ENCRYPT_MIGRATION',
                transaction_ids=f"Encrypted: {encrypted_count}, Already encrypted: {already_encrypted_count}"
            )

            return jsonify({
                'success': True,
                'message': f'Migration completed successfully',
                'encrypted_count': encrypted_count,
                'already_encrypted_count': already_encrypted_count,
                'total_transactions': len(transactions)
            })

    except Exception as e:
        print(f"Encryption migration error: {e}")
        return jsonify({'error': f'Migration failed: {str(e)}'}), 500


# Initialize database on import (works with gunicorn)
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
