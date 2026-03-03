from flask import Flask
from flask_cors import CORS
from config import (
    DEBUG, SECRET_KEY, SQLALCHEMY_DATABASE_URI, FRONTEND_URL, ALLOWED_FRONTEND_ORIGINS,
    # other imports...
)

app = Flask(__name__)

# CORS: allow the frontend domains to call the API from the browser
# Ensure CORS headers are added even on errors and for preflight OPTIONS
CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_FRONTEND_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

# rest of your app.py code...
