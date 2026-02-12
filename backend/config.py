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
from yfinance.exceptions import YFRateLimitError
import json
import threading
import urllib.request
import urllib.parse

# Load environment variables
# On Railway/production: Environment variables are already set, load_dotenv() won't override them
# On local/PyCharm: Try to load from project root (.env) first, then current directory
# This ensures it works when running from PyCharm or different directories
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    # Only load .env file if it exists (local development)
    load_dotenv(env_path, override=False)  # override=False ensures Railway env vars take precedence
else:
    # Fallback to current directory (won't override existing env vars)
    load_dotenv(override=False)

# ==================== YAHOO FINANCE CACHE & HELPERS ====================

# In-memory cache for stock data to reduce API calls and improve reliability
_stock_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 300  # Cache stock info for 5 minutes to reduce API calls and prevent rate limiting


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


# ==================== EXCHANGE RATE CACHE & HELPERS ====================

# Separate cache for exchange rates (longer TTL since rates change less frequently)
_exchange_rate_cache = {}
EXCHANGE_RATE_CACHE_TTL = 600  # 10 minutes
_exchange_rate_fetching = set()  # Track which rates are currently being fetched


def _fetch_exchange_rate_background(from_currency, to_currency):
    """Background thread to fetch and cache exchange rate. Never blocks requests."""
    cache_key = f"{from_currency}{to_currency}"
    ticker = f"{from_currency}{to_currency}=X"

    try:
        # Strategy 1: Try fast_info
        try:
            fi = yf.Ticker(ticker).fast_info
            rate = getattr(fi, 'last_price', None) or getattr(fi, 'previous_close', None)
            if rate and float(rate) > 0:
                with _cache_lock:
                    _exchange_rate_cache[cache_key] = {'rate': float(rate), 'timestamp': time.time()}
                print(f"Exchange rate cached: {cache_key} = {float(rate)}")
                return
        except YFRateLimitError as e:
            print(f"Exchange rate fast_info rate limited for {ticker}: {e}")
        except Exception as e:
            print(f"Exchange rate fast_info failed for {ticker}: {e}")

        # Strategy 2: Try history
        try:
            hist = yf.Ticker(ticker).history(period='5d')
            if hist is not None and not hist.empty:
                rate = float(hist.iloc[-1]['Close'])
                if rate > 0:
                    with _cache_lock:
                        _exchange_rate_cache[cache_key] = {'rate': rate, 'timestamp': time.time()}
                    print(f"Exchange rate cached (history): {cache_key} = {rate}")
                    return
        except YFRateLimitError as e:
            print(f"Exchange rate history rate limited for {ticker}: {e}")
        except Exception as e:
            print(f"Exchange rate history failed for {ticker}: {e}")
    finally:
        # Remove from fetching set so it can be retried later
        with _cache_lock:
            _exchange_rate_fetching.discard(cache_key)


def _get_exchange_rate(from_currency, to_currency='ILS'):
    """
    Get exchange rate. Returns cached value instantly if available.
    On first call (cache empty), fetches synchronously so the rate is always returned.
    On stale cache, triggers a background refresh but returns stale value immediately.
    """
    if from_currency == to_currency:
        return 1.0

    cache_key = f"{from_currency}{to_currency}"

    # Check cache (fresh or stale)
    with _cache_lock:
        cached = _exchange_rate_cache.get(cache_key)
        if cached:
            is_fresh = (time.time() - cached['timestamp']) < EXCHANGE_RATE_CACHE_TTL
            if not is_fresh and cache_key not in _exchange_rate_fetching:
                # Stale cache - trigger background refresh
                _exchange_rate_fetching.add(cache_key)
                t = threading.Thread(target=_fetch_exchange_rate_background, args=(from_currency, to_currency), daemon=True)
                t.start()
            # Return cached rate (fresh or stale) immediately
            return cached['rate']

    # No cache at all - fetch synchronously so we always return a rate
    _fetch_exchange_rate_background(from_currency, to_currency)
    with _cache_lock:
        cached = _exchange_rate_cache.get(cache_key)
        if cached:
            return cached['rate']

    return None  # Only if fetch truly failed


# ==================== STOCK INFO HELPERS ====================


def _fetch_stock_info_robust(ticker_symbol):
    """
    Fetch stock info with multiple fallback strategies.
    Returns a dict with price data or raises an exception.
    Handles rate limiting gracefully by returning cached data when available.
    """
    # Check cache first
    cached = _get_cached_stock_info(ticker_symbol)
    if cached:
        return cached

    stock = yf.Ticker(ticker_symbol)
    info = {}
    rate_limited = False

    # Strategy 1: Try .info (the standard approach)
    try:
        raw_info = stock.info
        if raw_info and isinstance(raw_info, dict) and len(raw_info) > 1:
            info = raw_info
    except YFRateLimitError as e:
        rate_limited = True
        print(f"Rate limited by Yahoo Finance for {ticker_symbol}: {e}")
    except Exception as e:
        error_str = str(e).lower()
        # Check for rate limiting indicators
        if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance for {ticker_symbol}: {e}")
        elif 'expecting value' in error_str or 'json' in error_str:
            # JSON parsing error often indicates rate limit response (HTML instead of JSON)
            rate_limited = True
            print(f"Yahoo Finance API error (likely rate limit) for {ticker_symbol}: {e}")
        pass

    # Helper: extract any usable price from info dict
    def _extract_price(d):
        for key in ('currentPrice', 'regularMarketPrice', 'previousClose',
                     'regularMarketOpen', 'navPrice', 'ask', 'bid',
                     'regularMarketPreviousClose', 'open', 'dayHigh', 'dayLow'):
            val = d.get(key)
            if val is not None and val != 0:
                return val
        return None

    # Strategy 2: If .info failed or returned no price, try fast_info
    if _extract_price(info) is None:
        try:
            fi = stock.fast_info
            if fi:
                last_price = getattr(fi, 'last_price', None)
                prev_close = getattr(fi, 'previous_close', None)
                market_price = getattr(fi, 'regular_market_price', None) or getattr(fi, 'regularMarketPrice', None)
                price = last_price or market_price or prev_close
                if price:
                    info['currentPrice'] = price
                    info['previousClose'] = prev_close or info.get('previousClose')
                    info['regularMarketPrice'] = price
                info['currency'] = getattr(fi, 'currency', None) or info.get('currency', 'USD')
                info['exchange'] = getattr(fi, 'exchange', None) or info.get('exchange', '')
                info['marketState'] = info.get('marketState', 'UNKNOWN')
                if not info.get('symbol'):
                    info['symbol'] = ticker_symbol
        except YFRateLimitError as e:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance (fast_info) for {ticker_symbol}: {e}")
        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
                rate_limited = True
                print(f"Rate limited by Yahoo Finance (fast_info) for {ticker_symbol}: {e}")
            pass

    # Strategy 3: If still no price, try history() for the last trading day
    if _extract_price(info) is None:
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
        except YFRateLimitError as e:
            rate_limited = True
            print(f"Rate limited by Yahoo Finance (history) for {ticker_symbol}: {e}")
        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'too many requests' in error_str or 'rate limit' in error_str:
                rate_limited = True
                print(f"Rate limited by Yahoo Finance (history) for {ticker_symbol}: {e}")
            pass

    # Final price extraction from all possible keys
    current_price = _extract_price(info)

    # If rate limited and no fresh data, try to return stale cache (better than nothing)
    if rate_limited and (not info or current_price is None):
        with _cache_lock:
            stale_cached = _stock_cache.get(ticker_symbol)
            if stale_cached:
                print(f"Rate limited - returning stale cached data for {ticker_symbol}")
                return stale_cached['data']

    if not info or current_price is None:
        raise ValueError(f'Unable to fetch data for ticker: {ticker_symbol} (Rate limited: {rate_limited})')

    # Normalize: ensure currentPrice is set
    if not info.get('currentPrice'):
        info['currentPrice'] = current_price

    # Compute derived fields
    previous_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
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
    Handles rate limiting gracefully.
    """
    results = []
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={urllib.parse.quote(query)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 429:
                print(f"Yahoo Finance search API rate limited for query: {query}")
                return results  # Return empty results instead of crashing
            
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
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"Yahoo Finance search API rate limited (HTTP 429) for query: {query}")
        else:
            print(f"Yahoo search API HTTP error: {e}")
    except json.JSONDecodeError as e:
        # Often indicates rate limit response (HTML instead of JSON)
        print(f"Yahoo search API JSON decode error (likely rate limit) for query: {query}: {e}")
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str:
            print(f"Yahoo Finance search API rate limited for query: {query}")
        else:
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

# Cloudinary configuration (for persistent file storage on Railway)
import cloudinary
import cloudinary.uploader

CLOUDINARY_URL = os.getenv('CLOUDINARY_URL')  # format: cloudinary://api_key:api_secret@cloud_name

if CLOUDINARY_URL:
    # Parse cloudinary://api_key:api_secret@cloud_name manually
    try:
        from urllib.parse import urlparse
        _parsed = urlparse(CLOUDINARY_URL)
        cloudinary.config(
            cloud_name=_parsed.hostname,
            api_key=_parsed.username,
            api_secret=_parsed.password,
            secure=True
        )
        CLOUDINARY_ENABLED = True
    except Exception as _e:
        print(f"Warning: Failed to parse CLOUDINARY_URL: {_e}")
        CLOUDINARY_ENABLED = False
else:
    # Fallback: individual env vars
    _cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
    _api_key = os.getenv('CLOUDINARY_API_KEY')
    _api_secret = os.getenv('CLOUDINARY_API_SECRET')
    if _cloud_name and _api_key and _api_secret:
        cloudinary.config(
            cloud_name=_cloud_name,
            api_key=_api_key,
            api_secret=_api_secret,
            secure=True
        )
        CLOUDINARY_ENABLED = True
    else:
        CLOUDINARY_ENABLED = False

print(f"[CONFIG] CLOUDINARY_ENABLED={CLOUDINARY_ENABLED}", flush=True)

# File upload configuration (fallback for local dev without Cloudinary)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
# Task attachments: images + common document types
TASK_ATTACHMENTS_FOLDER = os.path.join(UPLOAD_FOLDER, 'task_attachments')
ALLOWED_TASK_ATTACHMENT_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip'
}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TASK_ATTACHMENTS_FOLDER'] = TASK_ATTACHMENTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TASK_ATTACHMENTS_FOLDER, exist_ok=True)
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


def allowed_task_attachment(filename):
    """Allow images and common document types for task attachments."""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_TASK_ATTACHMENT_EXTENSIONS


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
              Returns empty dict in CI environment only.
              
    Raises:
        ValueError: If USER_PITZ_PASSWORD is not set in non-CI environment.
        Exception: If bcrypt hashing fails. Fails loudly when admin set 
                   USER_PITZ_PASSWORD but bcrypt failed.
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
        # Fail loudly when admin set USER_PITZ_PASSWORD but bcrypt failed
        # This prevents the app from starting without the configured fallback user
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
        cursor = connection.cursor(dictionary=True)

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

        # Create task_attachments table for file/image attachments on tasks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255),
                content_type VARCHAR(100),
                file_size INT,
                cloudinary_url VARCHAR(1024) DEFAULT NULL,
                cloudinary_public_id VARCHAR(512) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_task_id (task_id),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        """)
        print("Created task_attachments table")

        # Migration: add Cloudinary columns to task_attachments if not present
        try:
            cursor.execute("""
                ALTER TABLE task_attachments
                ADD COLUMN cloudinary_url VARCHAR(1024) DEFAULT NULL,
                ADD COLUMN cloudinary_public_id VARCHAR(512) DEFAULT NULL
            """)
            print("Added cloudinary columns to task_attachments")
        except Exception as e:
            print(f"Note: {e}")  # Columns already exist

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

        # Add owner column to tags table for user isolation (limited users see only their tags)
        try:
            cursor.execute("""
                ALTER TABLE tags
                ADD COLUMN owner VARCHAR(255)
            """)
            print("Added owner column to tags table")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Tags owner column migration note: {e}")

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

        # Add owner column to clients table for user isolation (limited users see only their clients)
        try:
            cursor.execute("""
                ALTER TABLE clients
                ADD COLUMN owner VARCHAR(255)
            """)
            print("Added owner column to clients table")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Clients owner column migration note: {e}")

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
                           currency VARCHAR(3) DEFAULT 'ILS',
                           units DECIMAL(12,4) DEFAULT 1,
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

