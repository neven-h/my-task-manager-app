"""Authenticated, permanent account deletion."""
import os

import bcrypt
import cloudinary.uploader
from flask import Blueprint, current_app, jsonify, request

from config import (
    CLOUDINARY_ENABLED,
    TASK_ATTACHMENTS_FOLDER,
    USERS,
    get_db_connection,
    limiter,
    token_required,
)

auth_delete_bp = Blueprint('auth_delete', __name__)


# Child tables appear before their parents. Tables created lazily are skipped
# when they do not exist, so a new account can still be deleted immediately.
USER_DATA_DELETIONS = (
    ('password_reset_tokens', 'user_id'),
    ('budget_bank_links', 'owner'),
    ('bank_transaction_audit_log', 'username'),
    ('budget_daily_balances', 'owner'),
    ('budget_entries', 'owner'),
    ('budget_tabs', 'owner'),
    ('bank_transactions', 'uploaded_by'),
    ('transaction_tabs', 'owner'),
    ('stock_portfolio', 'created_by'),
    ('portfolio_tabs', 'owner'),
    ('watched_stocks', 'username'),
    ('yahoo_portfolio', 'username'),
    ('tags', 'owner'),
    ('categories_master', 'owner'),
    ('clients', 'owner'),
    ('trash', 'owner'),
    ('renovation_attachments', 'owner'),
    ('renovation_payments', 'owner'),
    ('renovation_items', 'owner'),
    ('tasks', 'created_by'),
)

_RENOVATION_ATTACHMENTS_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'uploads',
    'renovation_attachments',
)


def _existing_tables(cursor):
    cursor.execute(
        "SELECT TABLE_NAME AS table_name FROM information_schema.TABLES "
        "WHERE TABLE_SCHEMA = DATABASE()"
    )
    return {row['table_name'] for row in cursor.fetchall()}


def _find_user_attachments(cursor, username, existing_tables):
    """Return every external/local file owned by the account."""
    attachments = []
    if {'tasks', 'task_attachments'}.issubset(existing_tables):
        cursor.execute(
            "SELECT ta.stored_filename, ta.cloudinary_public_id, ta.content_type "
            "FROM task_attachments ta "
            "JOIN tasks t ON t.id = ta.task_id "
            "WHERE t.created_by = %s",
            (username,),
        )
        attachments.extend((TASK_ATTACHMENTS_FOLDER, row) for row in cursor.fetchall())

    if 'renovation_attachments' in existing_tables:
        cursor.execute(
            "SELECT stored_filename, cloudinary_public_id, content_type "
            "FROM renovation_attachments WHERE owner = %s",
            (username,),
        )
        attachments.extend(
            (_RENOVATION_ATTACHMENTS_FOLDER, row) for row in cursor.fetchall()
        )
    return attachments


def _delete_attachment_file(folder, row):
    """Delete one attachment; raise so the account can be retried on failure."""
    public_id = row.get('cloudinary_public_id')
    if public_id:
        if not CLOUDINARY_ENABLED:
            raise RuntimeError('Cloudinary is unavailable for attachment deletion')
        content_type = row.get('content_type') or ''
        resource_type = 'image' if content_type.startswith('image/') else 'raw'
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        if isinstance(result, dict) and result.get('result') not in ('ok', 'not found'):
            raise RuntimeError('Cloudinary did not confirm attachment deletion')
        return

    stored_filename = row.get('stored_filename')
    if not stored_filename:
        return
    upload_dir = os.path.realpath(folder)
    path = os.path.realpath(os.path.join(upload_dir, stored_filename))
    if not path.startswith(upload_dir + os.sep):
        raise RuntimeError('Invalid attachment path')
    if os.path.isfile(path):
        os.remove(path)


def _delete_user_rows(cursor, user_id, username, existing_tables):
    for table, owner_column in USER_DATA_DELETIONS:
        if table not in existing_tables:
            continue
        owner_value = user_id if owner_column == 'user_id' else username
        cursor.execute(
            f"DELETE FROM {table} WHERE {owner_column} = %s",
            (owner_value,),
        )
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))


@auth_delete_bp.route('/api/auth/delete-account', methods=['POST'])
@limiter.limit("3 per minute")
@token_required
def delete_account(payload):
    """Permanently delete an account and all data owned by it."""
    username = payload['username']
    data = request.get_json(silent=True) or {}
    password = data.get('password')

    if not password:
        return jsonify({'error': 'Password is required'}), 400

    # Legacy administrator accounts are not customer accounts and cannot be
    # removed through this public endpoint.
    if username in USERS:
        return jsonify({
            'error': 'Account deletion is not available for legacy accounts.'
        }), 400

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, password_hash FROM users WHERE username = %s",
                (username,),
            )
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'User not found'}), 404
            if not bcrypt.checkpw(
                password.encode('utf-8'),
                user['password_hash'].encode('utf-8'),
            ):
                return jsonify({'error': 'Invalid password'}), 401

            existing_tables = _existing_tables(cursor)
            attachments = _find_user_attachments(cursor, username, existing_tables)

            # Remove stored files before committing the database deletion. If a
            # provider is temporarily unavailable, the account remains so the
            # user can retry and no private file is silently left behind.
            for folder, attachment in attachments:
                _delete_attachment_file(folder, attachment)

            try:
                _delete_user_rows(cursor, user['id'], username, existing_tables)
                connection.commit()
            except Exception:
                connection.rollback()
                raise

        return jsonify({
            'success': True,
            'message': 'Account and associated data deleted successfully',
        })
    except Exception as error:
        current_app.logger.error('delete_account error: %s', error, exc_info=True)
        return jsonify({
            'error': 'Unable to delete the account right now. Please try again.'
        }), 500
