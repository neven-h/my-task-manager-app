from decimal import Decimal
from typing import Union
import uuid
import secrets
import time

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
import yfinance as yf
import json
import threading
import urllib.request
import urllib.parse

# Load environment variables
load_dotenv()

# ==================== YAHOO FINANCE CACHE & HELPERS ====================

# In-memory cache for stock data to reduce API calls and improve reliability
_stock_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 120  # Cache stock info for 2 minutes


def _get_cached_stock_info(ticker_symbol):
    """Get cached stock info or return None if expired/missing."""
    with _cache_lock:
        cached = _stock_cache.get(ticker_symbol)
        if cached and (time.time() - cached['timestamp']) < CACHE_TTL_SECONDS:
            return cached['data']
    return None


def _set_cached_stock_info(ticker_symbol, data):
    """Store stock info in cache."""
    with _cache_lock:
        _stock_cache[ticker_symbol] = {
            'data': data,
            'timestamp': time.time()
        }


def _fetch_stock_info_robust(ticker_symbol):
    """
    Fetch stock info with multiple fallback strategies.
    Returns a dict with price data or raises an exception.
    """
    # Check cache first
    cached = _get_cached_stock_info(ticker_symbol)
    if cached:
        return cached

    stock = yf.Ticker(ticker_symbol)
    info = {}

    # Strategy 1: Try .info (the standard approach)
    try:
        raw_info = stock.info
        if raw_info and isinstance(raw_info, dict) and raw_info.get('symbol'):
            info = raw_info
    except Exception:
        pass

    # Strategy 2: If .info failed or returned no price, try fast_info
    if not info.get('currentPrice') and not info.get('regularMarketPrice'):
        try:
            fi = stock.fast_info
            if fi:
                info['currentPrice'] = getattr(fi, 'last_price', None)
                info['previousClose'] = getattr(fi, 'previous_close', None)
                info['regularMarketPrice'] = getattr(fi, 'last_price', None)
                info['currency'] = getattr(fi, 'currency', info.get('currency', 'USD'))
                info['exchange'] = getattr(fi, 'exchange', info.get('exchange', ''))
                info['marketState'] = info.get('marketState', 'UNKNOWN')
                if not info.get('symbol'):
                    info['symbol'] = ticker_symbol
        except Exception:
            pass

    # Strategy 3: If still no price, try history() for the last trading day
    if not info.get('currentPrice') and not info.get('regularMarketPrice'):
        try:
            hist = stock.history(period='5d')
            if hist is not None and not hist.empty:
                last_row = hist.iloc[-1]
                info['currentPrice'] = float(last_row['Close'])
                info['previousClose'] = float(hist.iloc[-2]['Close']) if len(hist) > 1 else None
                if not info.get('symbol'):
                    info['symbol'] = ticker_symbol
                info['marketState'] = info.get('marketState', 'CLOSED')
                info['currency'] = info.get('currency', 'USD')
                info['exchange'] = info.get('exchange', '')
        except Exception:
            pass

    if not info or (not info.get('currentPrice') and not info.get('regularMarketPrice') and not info.get('previousClose')):
        raise ValueError(f'Unable to fetch data for ticker: {ticker_symbol}')

    # Compute derived fields
    current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
    previous_close = info.get('previousClose')
    change = info.get('regularMarketChange')
    if change is None and current_price and previous_close:
        change = current_price - previous_close
    change_percent = info.get('regularMarketChangePercent')
    if change_percent is None and change is not None and previous_close and previous_close != 0:
        change_percent = (change / previous_close) * 100

    result = {
        'symbol': info.get('symbol', ticker_symbol),
        'longName': info.get('longName') or info.get('shortName', ticker_symbol),
        'shortName': info.get('shortName', ticker_symbol),
        'currentPrice': current_price,
        'previousClose': previous_close,
        'change': change,
        'changePercent': change_percent,
        'currency': info.get('currency', 'USD'),
        'marketState': info.get('marketState', 'UNKNOWN'),
        'exchange': info.get('exchange', ''),
    }

    _set_cached_stock_info(ticker_symbol, result)
    return result


def _yahoo_search_tickers(query):
    """
    Search for tickers using Yahoo Finance's search/autocomplete API.
    Returns a list of matching results.
    """
    results = []
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={urllib.parse.quote(query)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            quotes = data.get('quotes', [])
            for q in quotes:
                if q.get('quoteType') in ('EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY'):
                    results.append({
                        'ticker': q.get('symbol', ''),
                        'name': q.get('longname') or q.get('shortname', q.get('symbol', '')),
                        'exchange': q.get('exchange', ''),
                        'currency': q.get('currency', 'USD'),
                        'quoteType': q.get('quoteType', ''),
                    })
    except Exception as e:
        print(f"Yahoo search API error: {e}")
    return results

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
    # Use a deterministic 32-byte key for CI (must be exactly 32 bytes before base64 encoding)
    # This ensures consistent behavior across CI runs
    DATA_ENCRYPTION_KEY = base64.urlsafe_b64encode(b'0' * 32)  # 32 bytes = 44 chars when base64-encoded
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
# Default to Vite's common local dev port (3000)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Allow common local dev origins + production domains
# (Fixes local dev when Vite runs on :3000)
ALLOWED_FRONTEND_ORIGINS = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3004',
    'http://localhost:3005',
    'https://drpitz.club',
    'https://www.drpitz.club',
]

# Remove duplicates while preserving order
_seen = set()
ALLOWED_FRONTEND_ORIGINS = [o for o in ALLOWED_FRONTEND_ORIGINS if not (o in _seen or _seen.add(o))]

CORS(
    app,
    origins=ALLOWED_FRONTEND_ORIGINS,
    supports_credentials=True,
    max_age=3600,
)

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
        "connect-src " + " ".join(["'self'"] + ALLOWED_FRONTEND_ORIGINS) + ";"
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


DB_CONNECT_MAX_RETRIES = int(os.getenv('DB_CONNECT_MAX_RETRIES', 3))
DB_CONNECT_BASE_DELAY = float(os.getenv('DB_CONNECT_BASE_DELAY', 1.0))


def _reset_db_pool():
    """Reset the connection pool so it will be re-created on next use."""
    global _db_pool
    _db_pool = None


@contextmanager
def get_db_connection():
    """Context manager for database connections with retry logic.

    PERFORMANCE OPTIMIZATION: Uses connection pooling when available.
    Pooled connections are reused instead of creating new ones each time,
    which saves ~30-50ms per request. When the connection is closed,
    it's returned to the pool for reuse rather than being destroyed.

    RELIABILITY: Retries with exponential backoff when the database is
    temporarily unavailable (e.g. after a container restart). Resets
    the connection pool on failure so stale connections are discarded.

    Falls back to creating individual connections if the pool is unavailable.
    """
    connection = None
    last_error = None

    for attempt in range(DB_CONNECT_MAX_RETRIES):
        try:
            pool = _get_db_pool()
            if pool:
                connection = pool.get_connection()
            else:
                connection = mysql.connector.connect(**DB_CONFIG)
            break
        except Error as e:
            last_error = e
            _reset_db_pool()
            if attempt < DB_CONNECT_MAX_RETRIES - 1:
                delay = DB_CONNECT_BASE_DELAY * (2 ** attempt)
                print(f"Database connection attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)

    if connection is None:
        print(f"Database connection failed after {DB_CONNECT_MAX_RETRIES} attempts: {last_error}")
        raise last_error

    try:
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
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

        # Create transaction_tabs table for organizing transactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transaction_tabs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_owner (owner)
            )
        """)
        print("Created transaction_tabs table")

        # Add tab_id column to bank_transactions
        try:
            cursor.execute("""
                ALTER TABLE bank_transactions
                    ADD COLUMN tab_id INT
            """)
            print("Added tab_id column to bank_transactions")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note adding tab_id column: {e}")

        try:
            cursor.execute("""
                ALTER TABLE bank_transactions
                    ADD INDEX idx_tab_id (tab_id)
            """)
            print("Added tab_id index to bank_transactions")
        except Error as e:
            if 'Duplicate key' in str(e):
                pass  # Index already exists
            else:
                print(f"Note adding tab_id index: {e}")

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

        # Migrate bank_transactions to support encrypted data (larger field sizes).
        # Drop indexes that block TEXT conversion, then alter each column
        # individually so a failure in one doesn't block the others.
        for idx_name in ('idx_account',):
            try:
                cursor.execute(f"DROP INDEX {idx_name} ON bank_transactions")
                print(f"Dropped index {idx_name}")
            except Error:
                pass  # Already dropped or never existed

        for col, col_def in (
            ('account_number', 'TEXT'),
            ('description', 'TEXT'),
            ('amount', 'TEXT'),
        ):
            try:
                cursor.execute(
                    f"ALTER TABLE bank_transactions MODIFY COLUMN {col} {col_def}"
                )
                print(f"Migrated bank_transactions.{col} to {col_def}")
            except Error as e:
                # Column may already be the right type
                if 'already' not in str(e).lower():
                    print(f"Migration note ({col}): {e}")

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

        # Create portfolio_tabs table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS portfolio_tabs
                       (
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           owner VARCHAR(255) NOT NULL,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           INDEX idx_owner (owner)
                       )
                       """)
        print("Created portfolio_tabs table")

        # Create stock_portfolio table
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS stock_portfolio
                       (
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           ticker_symbol VARCHAR(20),
                           percentage DECIMAL(5,2),
                           value_ils DECIMAL(12,2) NOT NULL,
                           base_price DECIMAL(12,2),
                           entry_date DATE NOT NULL,
                           tab_id INT,
                           created_by VARCHAR(255),
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           INDEX idx_entry_date (entry_date),
                           INDEX idx_name (name),
                           INDEX idx_ticker_symbol (ticker_symbol),
                           INDEX idx_created_by (created_by),
                           INDEX idx_tab_id (tab_id),
                           FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE
                       )
                       """)
        print("Created stock_portfolio table")
        
        # Create watched_stocks table for Yahoo Finance watchlist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watched_stocks
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                ticker_symbol VARCHAR(20) NOT NULL,
                stock_name VARCHAR(255),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_ticker (username, ticker_symbol),
                INDEX idx_username (username),
                INDEX idx_ticker_symbol (ticker_symbol)
            )
        """)
        print("Created watched_stocks table")

        # Create yahoo_portfolio table for imported Yahoo Finance holdings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yahoo_portfolio
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                ticker_symbol VARCHAR(20) NOT NULL,
                stock_name VARCHAR(255),
                quantity DECIMAL(14,4) DEFAULT 0,
                avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'USD',
                notes TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                INDEX idx_username (username)
            )
        """)
        print("Created yahoo_portfolio table")

        # Add columns if they don't exist (for existing databases)
        # Check and add tab_id
        try:
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'tab_id'")
            if cursor.fetchone()['count'] == 0:
                cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN tab_id INT")
                connection.commit()
                print("Added tab_id column to stock_portfolio")
        except Exception as e:
            print(f"Note: tab_id column check/add failed (may already exist): {e}")
        
        # Check and add base_price
        try:
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'base_price'")
            if cursor.fetchone()['count'] == 0:
                cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN base_price DECIMAL(12,2)")
                connection.commit()
                print("Added base_price column to stock_portfolio")
        except Exception as e:
            print(f"Note: base_price column check/add failed (may already exist): {e}")
        
        # Check and add ticker_symbol
        try:
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
            if cursor.fetchone()['count'] == 0:
                cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN ticker_symbol VARCHAR(20)")
                connection.commit()
                print("Added ticker_symbol column to stock_portfolio")
        except Exception as e:
            print(f"Note: ticker_symbol column check/add failed (may already exist): {e}")
        
        # Check and add currency
        try:
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'currency'")
            if cursor.fetchone()['count'] == 0:
                cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN currency VARCHAR(3) DEFAULT 'ILS'")
                connection.commit()
                print("Added currency column to stock_portfolio")
        except Exception as e:
            print(f"Note: currency column check/add failed (may already exist): {e}")
        
        # Check and add units
        try:
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
            if cursor.fetchone()['count'] == 0:
                cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN units DECIMAL(12,4) DEFAULT 1")
                connection.commit()
                print("Added units column to stock_portfolio")
        except Exception as e:
            print(f"Note: units column check/add failed (may already exist): {e}")
        
        # Add indexes if they don't exist
        try:
            cursor.execute("SHOW INDEX FROM stock_portfolio WHERE Key_name = 'idx_tab_id'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE stock_portfolio ADD INDEX idx_tab_id (tab_id)")
                connection.commit()
        except Exception as e:
            print(f"Note: idx_tab_id index may already exist: {e}")
        
        try:
            cursor.execute("SHOW INDEX FROM stock_portfolio WHERE Key_name = 'idx_ticker_symbol'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE stock_portfolio ADD INDEX idx_ticker_symbol (ticker_symbol)")
                connection.commit()
        except Exception as e:
            print(f"Note: idx_ticker_symbol index may already exist: {e}")
        
        try:
            cursor.execute("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME LIKE '%tab_id%'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE stock_portfolio ADD FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE")
                connection.commit()
        except Exception as e:
            print(f"Note: Foreign key constraint may already exist: {e}")

        connection.commit()
        print("Database initialized successfully")

    except Error as e:
        print(f"Error initializing database: {e}")
    finally:
        if connection and connection.is_connected():
            if cursor:
                cursor.close()
            connection.close()


@app.route('/api/health', methods=['GET'])
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


# ==========================================
# STOCK PORTFOLIO ENDPOINTS
# ==========================================

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio_entries():
    """Get all portfolio entries with optional filtering"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        name = request.args.get('name')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if ticker_symbol column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
            has_ticker_symbol = cursor.fetchone()['count'] > 0
            
            if has_ticker_symbol:
                query = "SELECT * FROM stock_portfolio WHERE 1=1"
            else:
                query = "SELECT id, name, NULL as ticker_symbol, percentage, value_ils, base_price, entry_date, tab_id, created_by, created_at, updated_at, currency FROM stock_portfolio WHERE 1=1"
            params = []

            # Tab filtering
            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            # Role-based filtering
            if user_role == 'limited':
                query += " AND created_by = %s"
                params.append(username)

            # Date range filtering
            if start_date:
                query += " AND entry_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND entry_date <= %s"
                params.append(end_date)

            # Filter by stock name
            if name:
                query += " AND name LIKE %s"
                params.append(f"%{name}%")

            query += " ORDER BY entry_date DESC, id DESC"

            cursor.execute(query, params)
            entries = cursor.fetchall()

            # Serialize dates and decimals
            for entry in entries:
                if entry.get('entry_date'):
                    entry['entry_date'] = entry['entry_date'].isoformat()
                if entry.get('created_at'):
                    entry['created_at'] = entry['created_at'].isoformat()
                if entry.get('updated_at'):
                    entry['updated_at'] = entry['updated_at'].isoformat()
                if entry.get('percentage'):
                    entry['percentage'] = float(entry['percentage'])
                if entry.get('value_ils'):
                    entry['value_ils'] = float(entry['value_ils'])
                if entry.get('base_price'):
                    entry['base_price'] = float(entry['base_price'])

            return jsonify(entries)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio', methods=['POST'])
def create_portfolio_entry():
    """Create a new portfolio entry"""
    try:
        data = request.json
        username = data.get('username')
        tab_id = data.get('tab_id')
        stock_name = data.get('name')
        base_price = data.get('base_price')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if this is the first entry for this stock in this tab
            # If so, base_price should be set
            if base_price is None:
                check_query = """
                    SELECT COUNT(*) as count FROM stock_portfolio 
                    WHERE name = %s AND tab_id = %s
                """
                cursor.execute(check_query, (stock_name, tab_id))
                result = cursor.fetchone()
                is_first_entry = result['count'] == 0
            else:
                is_first_entry = False

            # Check which columns exist before building INSERT query
            cursor.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio'")
            existing_columns = {row['COLUMN_NAME'] for row in cursor.fetchall()}
            
            # Build INSERT query dynamically based on available columns
            columns = ['name', 'percentage', 'value_ils', 'base_price', 'entry_date', 'tab_id', 'created_by']
            values_list = [
                stock_name,
                data.get('percentage'),
                data.get('value_ils'),
                base_price if base_price else (data.get('value_ils') if is_first_entry else None),
                data.get('entry_date'),
                tab_id,
                username
            ]
            
            if 'ticker_symbol' in existing_columns:
                columns.append('ticker_symbol')
                values_list.append(data.get('ticker_symbol'))
            
            if 'currency' in existing_columns:
                columns.append('currency')
                values_list.append(data.get('currency', 'ILS'))
            
            if 'units' in existing_columns:
                columns.append('units')
                values_list.append(data.get('units', 1))
            
            query = f"""
                INSERT INTO stock_portfolio
                ({', '.join(columns)})
                VALUES ({', '.join(['%s'] * len(columns))})
            """
            
            values = tuple(values_list)

            cursor.execute(query, values)
            connection.commit()

            entry_id = cursor.lastrowid
            return jsonify({
                'id': entry_id,
                'message': 'Portfolio entry created successfully'
            }), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/<int:entry_id>', methods=['PUT'])
def update_portfolio_entry(entry_id):
    """Update an existing portfolio entry"""
    try:
        data = request.json
        username = request.args.get('username') or data.get('username')
        user_role = request.args.get('role') or data.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: limited users can only modify their own entries
            if user_role == 'limited' and entry['created_by'] != username:
                return jsonify({'error': 'Unauthorized: You can only modify your own portfolio entries'}), 403

            # Check which columns exist before building UPDATE query
            cursor.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio'")
            existing_columns = {row['COLUMN_NAME'] for row in cursor.fetchall()}
            
            # Build UPDATE query dynamically based on available columns
            base_price_val = data.get('base_price')
            if base_price_val == '' or (isinstance(base_price_val, str) and base_price_val.strip() == ''):
                base_price_val = None
            elif base_price_val is not None and base_price_val != '':
                try:
                    base_price_val = float(base_price_val)
                except (TypeError, ValueError):
                    base_price_val = None
            entry_date_val = data.get('entry_date')
            if isinstance(entry_date_val, str) and 'T' in entry_date_val:
                entry_date_val = entry_date_val.split('T')[0] if entry_date_val else None
            def _to_float(v, default=0):
                if v is None or v == '': return default
                try: return float(v)
                except (TypeError, ValueError): return default
            set_clauses = ['name = %s', 'percentage = %s', 'value_ils = %s', 'base_price = %s', 'entry_date = %s']
            values_list = [
                data.get('name'),
                _to_float(data.get('percentage')),
                _to_float(data.get('value_ils')),
                base_price_val,
                entry_date_val
            ]
            
            if 'ticker_symbol' in existing_columns:
                set_clauses.append('ticker_symbol = %s')
                values_list.append(data.get('ticker_symbol'))
            
            if 'currency' in existing_columns:
                set_clauses.append('currency = %s')
                values_list.append(data.get('currency', 'ILS'))
            
            if 'units' in existing_columns:
                set_clauses.append('units = %s')
                values_list.append(data.get('units', 1))
            
            values_list.append(entry_id)  # For WHERE clause
            
            update_query = f"""
                UPDATE stock_portfolio
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """
            
            values = tuple(values_list)
            
            cursor.execute(update_query, values)
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            return jsonify({'message': 'Portfolio entry updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/<int:entry_id>', methods=['DELETE'])
def delete_portfolio_entry(entry_id):
    """Delete a portfolio entry"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: limited users can only delete their own entries
            if user_role == 'limited' and entry['created_by'] != username:
                return jsonify({'error': 'Unauthorized: You can only delete your own portfolio entries'}), 403

            # Delete the entry
            cursor.execute("DELETE FROM stock_portfolio WHERE id = %s", (entry_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            return jsonify({'message': 'Portfolio entry deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/names', methods=['GET'])
def get_portfolio_stock_names():
    """Get all unique stock names for autocomplete"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT DISTINCT name FROM stock_portfolio WHERE 1=1"
            params = []

            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            if user_role == 'limited':
                query += " AND created_by = %s"
                params.append(username)

            query += " ORDER BY name ASC"

            cursor.execute(query, params)
            stocks = cursor.fetchall()

            return jsonify([stock['name'] for stock in stocks])

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/summary', methods=['GET'])
def get_portfolio_summary():
    """Get portfolio summary with total value and latest entries"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get latest entry for each stock
            # Build the subquery conditions to match the outer query filters
            subquery_conditions = "sp2.name = sp1.name AND sp2.tab_id = sp1.tab_id"
            params = []

            if tab_id:
                subquery_conditions += " AND sp2.tab_id = %s"
                params.append(tab_id)

            # Role-based filtering - apply to both outer query and subquery
            if user_role == 'limited':
                subquery_conditions += " AND sp2.created_by = %s"
                params.append(username)

            # Check if ticker_symbol column exists
            cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
            has_ticker_symbol = cursor.fetchone()['count'] > 0
            
            if has_ticker_symbol:
                query = f"""
                    SELECT name, ticker_symbol, percentage, value_ils, base_price, entry_date, created_by
                    FROM stock_portfolio sp1
                    WHERE entry_date = (
                        SELECT MAX(entry_date)
                        FROM stock_portfolio sp2
                        WHERE {subquery_conditions}
                    )
                """
            else:
                query = f"""
                    SELECT name, NULL as ticker_symbol, percentage, value_ils, base_price, entry_date, created_by
                    FROM stock_portfolio sp1
                    WHERE entry_date = (
                        SELECT MAX(entry_date)
                        FROM stock_portfolio sp2
                        WHERE {subquery_conditions}
                    )
                """

            # Apply same filters to outer query
            if tab_id:
                query += " AND sp1.tab_id = %s"
                params.append(tab_id)

            if user_role == 'limited':
                query += " AND sp1.created_by = %s"
                params.append(username)

            query += " GROUP BY name, tab_id ORDER BY value_ils DESC"

            cursor.execute(query, params)
            latest_entries = cursor.fetchall()

            # Calculate total value
            total_value = sum(float(entry['value_ils']) for entry in latest_entries)

            # Serialize
            for entry in latest_entries:
                if entry.get('entry_date'):
                    entry['entry_date'] = entry['entry_date'].isoformat()
                if entry.get('percentage'):
                    entry['percentage'] = float(entry['percentage'])
                if entry.get('value_ils'):
                    entry['value_ils'] = float(entry['value_ils'])
                if entry.get('base_price'):
                    entry['base_price'] = float(entry['base_price'])

            return jsonify({
                'total_value': total_value,
                'entries': latest_entries,
                'count': len(latest_entries)
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/stock-price', methods=['GET'])
def get_stock_price():
    """Get live stock price from Yahoo Finance"""
    try:
        ticker_symbol = request.args.get('ticker')
        if not ticker_symbol:
            return jsonify({'error': 'Ticker symbol is required'}), 400

        ticker_symbol = ticker_symbol.strip().upper()
        info = _fetch_stock_info_robust(ticker_symbol)

        return jsonify({
            'ticker': ticker_symbol,
            'name': info.get('longName', ticker_symbol),
            'currentPrice': info.get('currentPrice'),
            'previousClose': info.get('previousClose'),
            'change': info.get('change'),
            'changePercent': info.get('changePercent'),
            'currency': info.get('currency', 'USD'),
            'marketState': info.get('marketState', 'UNKNOWN'),
            'exchange': info.get('exchange', ''),
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': f'Failed to fetch stock price: {str(e)}'}), 500


@app.route('/api/portfolio/stock-prices', methods=['POST'])
def get_multiple_stock_prices():
    """Get live stock prices for multiple tickers from Yahoo Finance"""
    try:
        data = request.json
        tickers = data.get('tickers', [])

        if not tickers or not isinstance(tickers, list):
            return jsonify({'error': 'Tickers array is required'}), 400

        if len(tickers) > 50:
            return jsonify({'error': 'Maximum 50 tickers allowed per request'}), 400

        results = []
        for ticker in tickers:
            try:
                info = _fetch_stock_info_robust(ticker.strip().upper())
                results.append({
                    'ticker': ticker,
                    'name': info.get('longName', ticker),
                    'currentPrice': info.get('currentPrice'),
                    'previousClose': info.get('previousClose'),
                    'change': info.get('change'),
                    'changePercent': info.get('changePercent'),
                    'currency': info.get('currency', 'USD'),
                    'marketState': info.get('marketState', 'UNKNOWN'),
                    'exchange': info.get('exchange', ''),
                    'error': None
                })
            except Exception as e:
                results.append({
                    'ticker': ticker,
                    'name': ticker,
                    'currentPrice': None,
                    'previousClose': None,
                    'change': None,
                    'changePercent': None,
                    'currency': None,
                    'marketState': None,
                    'exchange': None,
                    'error': str(e)
                })

        return jsonify({
            'prices': results,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': f'Failed to fetch stock prices: {str(e)}'}), 500


@app.route('/api/portfolio/search-stocks', methods=['GET'])
def search_stocks():
    """Search for stocks by ticker symbol or name using Yahoo Finance"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        if len(query) < 1:
            return jsonify({'error': 'Search query must be at least 1 character'}), 400

        # Use Yahoo Finance search API for comprehensive results
        search_results = _yahoo_search_tickers(query)

        if search_results:
            return jsonify({'results': search_results})

        # Fallback: try direct ticker lookup if search API failed
        try:
            info = _fetch_stock_info_robust(query.upper())
            if info and info.get('symbol'):
                return jsonify({
                    'results': [{
                        'ticker': info.get('symbol', query.upper()),
                        'name': info.get('longName', query.upper()),
                        'exchange': info.get('exchange', ''),
                        'currency': info.get('currency', 'USD'),
                        'quoteType': 'EQUITY',
                    }]
                })
        except Exception:
            pass

        return jsonify({
            'results': [],
            'message': 'No stocks found. Try entering a valid ticker symbol (e.g., AAPL, TSLA, MSFT)'
        })

    except Exception as e:
        return jsonify({'error': f'Failed to search stocks: {str(e)}'}), 500


@app.route('/api/portfolio/watchlist', methods=['GET'])
def get_watchlist():
    """Get user's watchlist"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            query = "SELECT * FROM watched_stocks WHERE username = %s ORDER BY added_at DESC"
            cursor.execute(query, (username,))
            watchlist = cursor.fetchall()
            
            # Serialize dates
            for item in watchlist:
                if item.get('added_at'):
                    item['added_at'] = item['added_at'].isoformat()
            
            return jsonify(watchlist)
            
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/watchlist', methods=['POST'])
def add_to_watchlist():
    """Add a stock to user's watchlist"""
    try:
        data = request.json
        username = data.get('username')
        ticker_symbol = data.get('ticker_symbol', '').strip().upper()
        stock_name = data.get('stock_name', '')

        if not username:
            return jsonify({'error': 'Username is required'}), 400
        if not ticker_symbol:
            return jsonify({'error': 'Ticker symbol is required'}), 400

        # Verify stock exists using robust fetching
        try:
            info = _fetch_stock_info_robust(ticker_symbol)
            if not info or not info.get('symbol'):
                return jsonify({'error': 'Invalid ticker symbol'}), 400

            # Use the fetched name if not provided
            if not stock_name:
                stock_name = info.get('longName', ticker_symbol)
        except Exception as e:
            return jsonify({'error': f'Failed to verify stock: {str(e)}'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Check if already in watchlist
            check_query = "SELECT id FROM watched_stocks WHERE username = %s AND ticker_symbol = %s"
            cursor.execute(check_query, (username, ticker_symbol))
            existing = cursor.fetchone()

            if existing:
                return jsonify({'error': 'Stock already in watchlist'}), 400

            # Add to watchlist
            insert_query = """
                INSERT INTO watched_stocks (username, ticker_symbol, stock_name)
                VALUES (%s, %s, %s)
            """
            cursor.execute(insert_query, (username, ticker_symbol, stock_name))
            connection.commit()

            return jsonify({
                'id': cursor.lastrowid,
                'message': 'Stock added to watchlist successfully'
            }), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/watchlist/<int:watchlist_id>', methods=['DELETE'])
def remove_from_watchlist(watchlist_id):
    """Remove a stock from user's watchlist"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify ownership
            check_query = "SELECT username FROM watched_stocks WHERE id = %s"
            cursor.execute(check_query, (watchlist_id,))
            item = cursor.fetchone()
            
            if not item:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            # Authorization check: limited users can only remove their own items
            if user_role == 'limited' and item['username'] != username:
                return jsonify({'error': 'Unauthorized: You can only remove your own watchlist items'}), 403
            
            # Delete the item
            cursor.execute("DELETE FROM watched_stocks WHERE id = %s", (watchlist_id,))
            connection.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Watchlist item not found'}), 404
            
            return jsonify({'message': 'Stock removed from watchlist successfully'})
            
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/watchlist/prices', methods=['GET'])
def get_watchlist_prices():
    """Get live prices for all stocks in user's watchlist"""
    try:
        username = request.args.get('username')

        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get watchlist
            query = "SELECT ticker_symbol FROM watched_stocks WHERE username = %s"
            cursor.execute(query, (username,))
            watchlist = cursor.fetchall()

            tickers = [item['ticker_symbol'] for item in watchlist]

            if not tickers:
                return jsonify({'prices': []})

            # Fetch prices for all tickers using robust method
            results = []
            for ticker in tickers:
                try:
                    info = _fetch_stock_info_robust(ticker)
                    results.append({
                        'ticker': ticker,
                        'name': info.get('longName', ticker),
                        'currentPrice': info.get('currentPrice'),
                        'previousClose': info.get('previousClose'),
                        'change': info.get('change'),
                        'changePercent': info.get('changePercent'),
                        'currency': info.get('currency', 'USD'),
                        'marketState': info.get('marketState', 'UNKNOWN'),
                        'exchange': info.get('exchange', ''),
                        'error': None
                    })
                except Exception as e:
                    results.append({
                        'ticker': ticker,
                        'name': ticker,
                        'currentPrice': None,
                        'previousClose': None,
                        'change': None,
                        'changePercent': None,
                        'currency': None,
                        'marketState': None,
                        'exchange': None,
                        'error': str(e)
                    })

            return jsonify({
                'prices': results,
                'timestamp': datetime.now().isoformat()
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ==================== YAHOO FINANCE PORTFOLIO IMPORT ====================

@app.route('/api/portfolio/yahoo-import', methods=['POST'])
def import_yahoo_portfolio():
    """Import portfolio from Yahoo Finance CSV export.
    Accepts a CSV file with columns: Symbol, Current Price, Date, Time, Change, Open, High, Low, Volume, Trade Date
    OR the Holdings format: Symbol, Quantity, Price Paid, etc.
    Also accepts JSON body with manual ticker list.
    """
    try:
        username = request.form.get('username') or (request.json or {}).get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        imported = []
        errors = []

        # Handle CSV file upload
        if 'file' in request.files:
            file = request.files['file']
            if not file.filename:
                return jsonify({'error': 'No file selected'}), 400

            if not file.filename.lower().endswith('.csv'):
                return jsonify({'error': 'Only CSV files are supported'}), 400

            try:
                raw_data = file.read()
                detected = chardet.detect(raw_data)
                encoding = detected.get('encoding', 'utf-8')
                content = raw_data.decode(encoding)

                reader = csv.DictReader(io.StringIO(content))
                rows = list(reader)

                if not rows:
                    return jsonify({'error': 'CSV file is empty'}), 400

                headers_lower = [h.lower().strip() for h in (rows[0].keys() if rows else [])]

                for row in rows:
                    # Normalize keys to lowercase
                    row_lower = {k.lower().strip(): v.strip() if v else '' for k, v in row.items()}

                    ticker = row_lower.get('symbol', '').upper().strip()
                    if not ticker or ticker in ('', 'SYMBOL', '-'):
                        continue

                    quantity = 0
                    for qty_key in ['quantity', 'shares', 'qty', 'units', 'amount']:
                        if qty_key in row_lower and row_lower[qty_key]:
                            try:
                                quantity = float(row_lower[qty_key].replace(',', ''))
                                break
                            except ValueError:
                                pass

                    cost_basis = 0
                    for cost_key in ['price paid', 'cost basis', 'avg cost', 'purchase price', 'cost', 'price']:
                        if cost_key in row_lower and row_lower[cost_key]:
                            try:
                                cost_basis = float(row_lower[cost_key].replace(',', '').replace('$', ''))
                                break
                            except ValueError:
                                pass

                    currency = row_lower.get('currency', 'USD').upper() or 'USD'

                    # Validate ticker
                    stock_name = ticker
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                        if not currency or currency == 'USD':
                            currency = info.get('currency', 'USD')
                    except Exception:
                        pass

                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': quantity,
                        'cost_basis': cost_basis,
                        'currency': currency,
                    })

            except Exception as e:
                return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

        # Handle JSON body with manual ticker list
        elif request.is_json:
            data = request.json
            tickers = data.get('tickers', [])
            holdings = data.get('holdings', [])

            if holdings:
                for h in holdings:
                    ticker = h.get('ticker', '').strip().upper()
                    if not ticker:
                        continue
                    stock_name = h.get('name', ticker)
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                    except Exception:
                        pass
                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': float(h.get('quantity', 0)),
                        'cost_basis': float(h.get('cost_basis', 0)),
                        'currency': h.get('currency', 'USD'),
                    })
            elif tickers:
                for ticker in tickers:
                    ticker = ticker.strip().upper()
                    if not ticker:
                        continue
                    stock_name = ticker
                    try:
                        info = _fetch_stock_info_robust(ticker)
                        stock_name = info.get('longName', ticker)
                    except Exception:
                        pass
                    imported.append({
                        'ticker': ticker,
                        'name': stock_name,
                        'quantity': 0,
                        'cost_basis': 0,
                        'currency': 'USD',
                    })
        else:
            return jsonify({'error': 'CSV file or JSON data is required'}), 400

        if not imported:
            return jsonify({'error': 'No valid stocks found in the import data'}), 400

        # Save to database
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS yahoo_portfolio
                (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    ticker_symbol VARCHAR(20) NOT NULL,
                    stock_name VARCHAR(255),
                    quantity DECIMAL(14,4) DEFAULT 0,
                    avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'USD',
                    notes TEXT,
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                    INDEX idx_username (username)
                )
            """)

            saved_count = 0
            for item in imported:
                try:
                    cursor.execute("""
                        INSERT INTO yahoo_portfolio (username, ticker_symbol, stock_name, quantity, avg_cost_basis, currency)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            stock_name = VALUES(stock_name),
                            quantity = VALUES(quantity),
                            avg_cost_basis = VALUES(avg_cost_basis),
                            currency = VALUES(currency),
                            updated_at = CURRENT_TIMESTAMP
                    """, (username, item['ticker'], item['name'], item['quantity'], item['cost_basis'], item['currency']))
                    saved_count += 1
                except Exception as e:
                    errors.append(f"{item['ticker']}: {str(e)}")

            connection.commit()

        return jsonify({
            'message': f'Successfully imported {saved_count} holdings',
            'imported': imported,
            'errors': errors,
            'count': saved_count
        }), 201

    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


@app.route('/api/portfolio/yahoo-holdings', methods=['GET'])
def get_yahoo_holdings():
    """Get user's imported Yahoo Finance portfolio holdings with live prices."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS yahoo_portfolio
                (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    ticker_symbol VARCHAR(20) NOT NULL,
                    stock_name VARCHAR(255),
                    quantity DECIMAL(14,4) DEFAULT 0,
                    avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'USD',
                    notes TEXT,
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                    INDEX idx_username (username)
                )
            """)

            cursor.execute("SELECT * FROM yahoo_portfolio WHERE username = %s ORDER BY ticker_symbol ASC", (username,))
            holdings = cursor.fetchall()

            # Serialize decimals and dates
            for h in holdings:
                for k in ('quantity', 'avg_cost_basis'):
                    if h.get(k) is not None:
                        h[k] = float(h[k])
                for k in ('imported_at', 'updated_at'):
                    if h.get(k):
                        h[k] = h[k].isoformat()

            # Fetch live prices for all holdings
            enriched = []
            total_portfolio_value = 0
            total_cost_basis = 0
            total_gain_loss = 0

            for h in holdings:
                ticker = h['ticker_symbol']
                entry = {
                    'id': h['id'],
                    'ticker': ticker,
                    'name': h['stock_name'],
                    'quantity': h['quantity'],
                    'avgCostBasis': h['avg_cost_basis'],
                    'currency': h['currency'],
                    'notes': h.get('notes'),
                    'importedAt': h.get('imported_at'),
                    'updatedAt': h.get('updated_at'),
                }
                try:
                    info = _fetch_stock_info_robust(ticker)
                    current_price = info.get('currentPrice', 0) or 0
                    entry['currentPrice'] = current_price
                    entry['previousClose'] = info.get('previousClose')
                    entry['change'] = info.get('change')
                    entry['changePercent'] = info.get('changePercent')
                    entry['marketState'] = info.get('marketState', 'UNKNOWN')
                    entry['exchange'] = info.get('exchange', '')

                    # Calculate position value and gain/loss
                    qty = h['quantity'] or 0
                    cost = h['avg_cost_basis'] or 0
                    position_value = current_price * qty
                    position_cost = cost * qty
                    gain_loss = position_value - position_cost if cost > 0 and qty > 0 else 0
                    gain_loss_pct = ((current_price - cost) / cost * 100) if cost > 0 else 0

                    entry['positionValue'] = round(position_value, 2)
                    entry['positionCost'] = round(position_cost, 2)
                    entry['gainLoss'] = round(gain_loss, 2)
                    entry['gainLossPct'] = round(gain_loss_pct, 2)

                    total_portfolio_value += position_value
                    total_cost_basis += position_cost
                    total_gain_loss += gain_loss
                except Exception as e:
                    entry['currentPrice'] = None
                    entry['error'] = str(e)

                enriched.append(entry)

            return jsonify({
                'holdings': enriched,
                'summary': {
                    'totalValue': round(total_portfolio_value, 2),
                    'totalCost': round(total_cost_basis, 2),
                    'totalGainLoss': round(total_gain_loss, 2),
                    'totalGainLossPct': round((total_gain_loss / total_cost_basis * 100) if total_cost_basis > 0 else 0, 2),
                    'holdingsCount': len(enriched),
                },
                'timestamp': datetime.now().isoformat()
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['PUT'])
def update_yahoo_holding(holding_id):
    """Update a Yahoo Finance portfolio holding (quantity, cost basis, notes)."""
    try:
        data = request.json
        username = data.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Verify ownership
            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            existing = cursor.fetchone()
            if not existing:
                return jsonify({'error': 'Holding not found'}), 404

            updates = []
            params = []
            if 'quantity' in data:
                updates.append('quantity = %s')
                params.append(float(data['quantity']))
            if 'avg_cost_basis' in data:
                updates.append('avg_cost_basis = %s')
                params.append(float(data['avg_cost_basis']))
            if 'notes' in data:
                updates.append('notes = %s')
                params.append(data['notes'])

            if not updates:
                return jsonify({'error': 'No fields to update'}), 400

            params.append(holding_id)
            cursor.execute(f"UPDATE yahoo_portfolio SET {', '.join(updates)} WHERE id = %s", params)
            connection.commit()

            return jsonify({'message': 'Holding updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/yahoo-holdings/<int:holding_id>', methods=['DELETE'])
def delete_yahoo_holding(holding_id):
    """Remove a holding from Yahoo Finance portfolio."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("SELECT * FROM yahoo_portfolio WHERE id = %s AND username = %s", (holding_id, username))
            if not cursor.fetchone():
                return jsonify({'error': 'Holding not found'}), 404

            cursor.execute("DELETE FROM yahoo_portfolio WHERE id = %s", (holding_id,))
            connection.commit()

            return jsonify({'message': 'Holding removed successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio/yahoo-holdings/clear', methods=['DELETE'])
def clear_yahoo_holdings():
    """Clear all Yahoo Finance portfolio holdings for a user."""
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("DELETE FROM yahoo_portfolio WHERE username = %s", (username,))
            connection.commit()
            deleted = cursor.rowcount

            return jsonify({'message': f'Cleared {deleted} holdings', 'deleted': deleted})

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

                transaction_date = None
                for dfmt in ['%d.%m.%Y', '%d/%m/%Y', '%d/%m/%y', '%d.%m.%y', '%Y-%m-%d']:
                    transaction_date = pd.to_datetime(date_str, format=dfmt, errors='coerce')
                    if pd.notna(transaction_date):
                        break
                if pd.isna(transaction_date):
                    # Final fallback: let pandas infer
                    transaction_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
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

        # Parse dates - try multiple formats
        print(f"[PARSE] Before date parsing: {len(df)} rows", flush=True)

        # Try multiple date formats in order of specificity
        date_formats = [
            '%d.%m.%Y',   # DD.MM.YYYY (e.g., 03.02.2026)
            '%d/%m/%Y',   # DD/MM/YYYY (e.g., 03/02/2026)
            '%d/%m/%y',   # D/M/YY (e.g., 3/2/26)
            '%d.%m.%y',   # D.M.YY (e.g., 3.2.26)
            '%Y-%m-%d',   # YYYY-MM-DD (e.g., 2026-02-03)
        ]

        parsed_dates = None
        for fmt in date_formats:
            attempt = pd.to_datetime(df['transaction_date'], format=fmt, errors='coerce')
            valid_count = attempt.notna().sum()
            print(f"[PARSE] Format '{fmt}': {valid_count}/{len(df)} dates parsed", flush=True)
            if valid_count > 0 and (parsed_dates is None or valid_count > parsed_dates.notna().sum()):
                parsed_dates = attempt

        # Final fallback: let pandas infer the format
        if parsed_dates is None or parsed_dates.notna().sum() == 0:
            parsed_dates = pd.to_datetime(df['transaction_date'], dayfirst=True, errors='coerce')
            print(f"[PARSE] Fallback (dayfirst=True): {parsed_dates.notna().sum()}/{len(df)} dates parsed", flush=True)

        df['transaction_date'] = parsed_dates
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


# ==================== TRANSACTION TABS ENDPOINTS ====================

@app.route('/api/transaction-tabs', methods=['GET'])
def get_transaction_tabs():
    """Get all transaction tabs for the current user"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM transaction_tabs WHERE 1=1"
            params = []

            if user_role == 'limited':
                query += " AND owner = %s"
                params.append(username)

            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            tabs = cursor.fetchall()

            for tab in tabs:
                if tab.get('created_at'):
                    tab['created_at'] = tab['created_at'].isoformat()

            return jsonify(tabs)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transaction-tabs', methods=['POST'])
def create_transaction_tab():
    """Create a new transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        owner = data.get('username')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)",
                (name, owner)
            )
            connection.commit()

            tab_id = cursor.lastrowid
            return jsonify({
                'id': tab_id,
                'name': name,
                'owner': owner,
                'message': 'Tab created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transaction-tabs/<int:tab_id>', methods=['PUT'])
def update_transaction_tab(tab_id):
    """Rename a transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute(
                "UPDATE transaction_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transaction-tabs/<int:tab_id>', methods=['DELETE'])
def delete_transaction_tab(tab_id):
    """Delete a transaction tab and its associated transactions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Delete associated transactions first
            cursor.execute(
                "DELETE FROM bank_transactions WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_transactions = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM transaction_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_transactions} transactions'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transaction-tabs/orphaned', methods=['GET'])
def get_orphaned_transaction_count():
    """Get count of transactions with no tab_id (orphaned from before tabs existed)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
            result = cursor.fetchone()
            return jsonify({'count': result['count']})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transaction-tabs/<int:tab_id>/adopt', methods=['POST'])
def adopt_orphaned_transactions(tab_id):
    """Assign all transactions with tab_id=NULL to the specified tab"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("UPDATE bank_transactions SET tab_id = %s WHERE tab_id IS NULL", (tab_id,))
            adopted_count = cursor.rowcount
            connection.commit()
            return jsonify({'message': f'{adopted_count} transactions assigned to tab', 'count': adopted_count})
    except Error as e:
        return jsonify({'error': str(e)}), 500


# ==================== PORTFOLIO TABS ENDPOINTS ====================

@app.route('/api/portfolio-tabs', methods=['GET'])
def get_portfolio_tabs():
    """Get all portfolio tabs for the current user"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM portfolio_tabs WHERE 1=1"
            params = []

            if user_role == 'limited':
                query += " AND owner = %s"
                params.append(username)

            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            tabs = cursor.fetchall()

            for tab in tabs:
                if tab.get('created_at'):
                    tab['created_at'] = tab['created_at'].isoformat()

            return jsonify(tabs)

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio-tabs', methods=['POST'])
def create_portfolio_tab():
    """Create a new portfolio tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        owner = data.get('username')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO portfolio_tabs (name, owner) VALUES (%s, %s)",
                (name, owner)
            )
            connection.commit()

            tab_id = cursor.lastrowid
            return jsonify({
                'id': tab_id,
                'name': name,
                'owner': owner,
                'message': 'Tab created successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio-tabs/<int:tab_id>', methods=['PUT'])
def update_portfolio_tab(tab_id):
    """Rename a portfolio tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        username = request.args.get('username')
        user_role = request.args.get('role')

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: limited users can only modify their own tabs
            if user_role == 'limited' and tab['owner'] != username:
                return jsonify({'error': 'Unauthorized: You can only modify your own portfolio tabs'}), 403

            # Update the tab
            cursor.execute(
                "UPDATE portfolio_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/portfolio-tabs/<int:tab_id>', methods=['DELETE'])
def delete_portfolio_tab(tab_id):
    """Delete a portfolio tab and its associated entries"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: limited users can only delete their own tabs
            if user_role == 'limited' and tab['owner'] != username:
                return jsonify({'error': 'Unauthorized: You can only delete your own portfolio tabs'}), 403

            # Delete associated portfolio entries first (CASCADE should handle this, but being explicit)
            cursor.execute(
                "DELETE FROM stock_portfolio WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_entries = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM portfolio_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_entries} portfolio entries'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500


# ==================== TRANSACTION ENDPOINTS ====================

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
        tab_id = data.get('tab_id')

        if not transactions:
            return jsonify({'error': 'No transactions to save'}), 400

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
                    username,
                    tab_id
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
    """Get list of months with saved transactions (filtered by user role and tab)"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Fetch individual rows to decrypt amounts in Python
            query = """
                SELECT month_year,
                       amount,
                       transaction_date,
                       upload_date
                FROM bank_transactions
                WHERE 1=1
            """
            params = []

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

            # Filter by role
            if user_role == 'limited':
                query += " AND uploaded_by = %s"
                params.append(username)
            # admin and shared see all

            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Decrypt amounts and aggregate by month
            month_data = {}
            for row in rows:
                my = row['month_year']
                if my not in month_data:
                    month_data[my] = {
                        'month_year': my,
                        'transaction_count': 0,
                        'total_amount': 0.0,
                        'start_date': row['transaction_date'],
                        'end_date': row['transaction_date'],
                        'last_upload': row['upload_date']
                    }
                month_data[my]['transaction_count'] += 1
                try:
                    decrypted = decrypt_field(row['amount'])
                    month_data[my]['total_amount'] += float(decrypted) if decrypted else 0.0
                except (ValueError, TypeError):
                    pass
                # Track min/max dates
                if row['transaction_date']:
                    if not month_data[my]['start_date'] or row['transaction_date'] < month_data[my]['start_date']:
                        month_data[my]['start_date'] = row['transaction_date']
                    if not month_data[my]['end_date'] or row['transaction_date'] > month_data[my]['end_date']:
                        month_data[my]['end_date'] = row['transaction_date']
                if row['upload_date']:
                    if not month_data[my]['last_upload'] or row['upload_date'] > month_data[my]['last_upload']:
                        month_data[my]['last_upload'] = row['upload_date']

            # Convert to sorted list
            months = sorted(month_data.values(), key=lambda x: x['month_year'], reverse=True)

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
    """Get all transactions (filtered by user role and tab) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

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

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

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
    """Get all transactions for a specific month (filtered by user role and tab) with decryption"""
    try:
        # Get username and role for filtering
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

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

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify([])

            query += " AND tab_id = %s"
            params.append(tab_id)

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
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify({'error': 'tab_id is required'}), 400

            cursor.execute("DELETE FROM bank_transactions WHERE month_year = %s AND tab_id = %s", (month_year, tab_id))
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
        tab_id = data.get('tab_id')

        # Require tab_id for strict tab separation
        if not tab_id:
            return jsonify({'error': 'tab_id is required - select a tab first'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Encrypt sensitive fields
            encrypted_account = encrypt_field(data.get('account_number', ''))
            encrypted_description = encrypt_field(data['description'])
            encrypted_amount = encrypt_field(str(data['amount']))

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
            cursor.execute(query, (
                encrypted_account,
                data['transaction_date'],
                encrypted_description,
                encrypted_amount,
                data['month_year'],
                data.get('transaction_type', 'credit'),
                username,
                tab_id
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
    """Get transaction statistics including cash vs credit breakdown (filtered by user role and tab)"""
    try:
        # Get optional date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        username = request.args.get('username')
        user_role = request.args.get('role')
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Require tab_id for strict tab separation
            if not tab_id:
                return jsonify({'by_type': [], 'monthly': []})

            # Build filters
            filters = ["tab_id = %s"]
            params = [tab_id]

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
try:
    init_db()
    print("✓ Database initialized successfully")
except Exception as e:
    print(f"⚠ Warning: Database initialization failed: {e}")
    print("⚠ App will start but database operations will fail until MySQL is configured")


@app.route('/api/admin/migrate-db', methods=['POST'])
def migrate_database():
    """Manual database migration endpoint to add missing columns"""
    try:
        # Simple auth check - in production, add proper authentication
        auth_header = request.headers.get('Authorization')
        if auth_header != f"Bearer {os.getenv('MIGRATION_SECRET', 'migration-secret-key')}":
            return jsonify({'error': 'Unauthorized'}), 401
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            migrations_applied = []
            
            # Check and add ticker_symbol
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'ticker_symbol'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN ticker_symbol VARCHAR(20)")
                    connection.commit()
                    migrations_applied.append('ticker_symbol')
            except Exception as e:
                return jsonify({'error': f'Failed to add ticker_symbol: {str(e)}'}), 500
            
            # Check and add currency
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'currency'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN currency VARCHAR(3) DEFAULT 'ILS'")
                    connection.commit()
                    migrations_applied.append('currency')
            except Exception as e:
                return jsonify({'error': f'Failed to add currency: {str(e)}'}), 500
            
            # Check and add units
            try:
                cursor.execute("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_portfolio' AND COLUMN_NAME = 'units'")
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("ALTER TABLE stock_portfolio ADD COLUMN units DECIMAL(12,4) DEFAULT 1")
                    connection.commit()
                    migrations_applied.append('units')
            except Exception as e:
                return jsonify({'error': f'Failed to add units: {str(e)}'}), 500
            
            # Ensure watched_stocks table exists
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS watched_stocks
                    (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        ticker_symbol VARCHAR(20) NOT NULL,
                        stock_name VARCHAR(255),
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_user_ticker (username, ticker_symbol),
                        INDEX idx_username (username),
                        INDEX idx_ticker_symbol (ticker_symbol)
                    )
                """)
                connection.commit()
                migrations_applied.append('watched_stocks_table')
            except Exception as e:
                return jsonify({'error': f'Failed to create watched_stocks table: {str(e)}'}), 500

            # Ensure yahoo_portfolio table exists
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS yahoo_portfolio
                    (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        ticker_symbol VARCHAR(20) NOT NULL,
                        stock_name VARCHAR(255),
                        quantity DECIMAL(14,4) DEFAULT 0,
                        avg_cost_basis DECIMAL(14,4) DEFAULT 0,
                        currency VARCHAR(10) DEFAULT 'USD',
                        notes TEXT,
                        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_user_yahoo_ticker (username, ticker_symbol),
                        INDEX idx_username (username)
                    )
                """)
                connection.commit()
                migrations_applied.append('yahoo_portfolio_table')
            except Exception as e:
                return jsonify({'error': f'Failed to create yahoo_portfolio table: {str(e)}'}), 500

            return jsonify({
                'message': 'Migration completed successfully',
                'migrations_applied': migrations_applied
            })
            
    except Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
