from flask import Blueprint

auth_password_bp = Blueprint('auth_password', __name__)

# Routes previously here have been migrated:
# - forgot_password → auth_password_reset.py
# - change_password → auth_account.py
