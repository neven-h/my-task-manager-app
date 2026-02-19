"""
Flask application setup: app instance, extensions, CORS, rate limiting, mail, Cloudinary,
upload folders, and security headers middleware.

Everything is re-exported here so existing `from config import ...` calls in route files
continue to work without any changes.
"""
import os
from urllib.parse import urlparse

from flask import Flask, request
from flask_cors import CORS
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import cloudinary
import cloudinary.uploader

# Load environment variables (local dev only; production env vars are already set)
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path, override=False)
else:
    load_dotenv(override=False)

# ==================== RE-EXPORTS ====================
# Route files import everything from `config`, so we re-export from the sub-modules.

from helpers import (         # noqa: E402  (imports after load_dotenv intentional)
    DEBUG,
    ALLOWED_EXTENSIONS,
    ALLOWED_TASK_ATTACHMENT_EXTENSIONS,
    allowed_file,
    allowed_task_attachment,
    sanitize_csv_field,
    handle_error,
    serialize_task,
)
from db import (              # noqa: E402
    DB_CONFIG,
    get_db_connection,
    init_db,
    sanitize_db_name,
)
from auth_utils import (      # noqa: E402
    IS_CI,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_EXPIRATION_HOURS,
    generate_jwt_token,
    verify_jwt_token,
    token_required,
    admin_required,
    validate_password,
    USERS,
)
from crypto import (          # noqa: E402
    DATA_ENCRYPTION_KEY,
    cipher_suite,
    encrypt_field,
    decrypt_field,
    log_bank_transaction_access,
)
from finance import (         # noqa: E402
    _fetch_stock_info_robust,
    _get_exchange_rate,
    _yahoo_search_tickers,
)

# ==================== FLASK APP ====================

app = Flask(__name__)

if IS_CI:
    app.config['SECRET_KEY'] = 'ci-build-key-not-for-production'
else:
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        raise ValueError("SECRET_KEY environment variable must be set")

# ==================== CORS ====================

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

_origins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3004',
    'http://localhost:3005',
    'https://drpitz.club',
    'https://www.drpitz.club',
]
_seen = set()
ALLOWED_FRONTEND_ORIGINS = [o for o in _origins if not (o in _seen or _seen.add(o))]

CORS(app, origins=ALLOWED_FRONTEND_ORIGINS, supports_credentials=True, max_age=3600)

# ==================== RATE LIMITING ====================

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["5000 per day", "500 per hour"],
    storage_uri="memory://"
)

# ==================== MAIL ====================

app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME'))
mail = Mail(app)

# ==================== CLOUDINARY ====================

CLOUDINARY_URL = os.getenv('CLOUDINARY_URL')

if CLOUDINARY_URL:
    try:
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

# ==================== FILE UPLOAD FOLDERS ====================

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
TASK_ATTACHMENTS_FOLDER = os.path.join(UPLOAD_FOLDER, 'task_attachments')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TASK_ATTACHMENTS_FOLDER'] = TASK_ATTACHMENTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TASK_ATTACHMENTS_FOLDER, exist_ok=True)

# ==================== SECURITY HEADERS ====================

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'

    if not DEBUG and request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src " + " ".join(["'self'"] + ALLOWED_FRONTEND_ORIGINS) + ";"
    )
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

    return response
