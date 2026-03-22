"""Renovation tracker — CRUD for renovation_items, renovation_payments, attachments, and CSV export."""
import csv
import io
import logging
import os
import uuid
from datetime import datetime

import cloudinary.uploader
from flask import Blueprint, jsonify, request, send_file, current_app, redirect
from werkzeug.utils import secure_filename

from config import (
    get_db_connection, token_required, verify_jwt_token,
    CLOUDINARY_ENABLED, allowed_task_attachment, sanitize_csv_field,
)

logger = logging.getLogger(__name__)
renovation_bp = Blueprint('renovation', __name__)

_ITEM_ALLOWED = {'name', 'area', 'contractor', 'category', 'status', 'estimated_cost', 'notes'}
_VALID_STATUS = {'planned', 'in_progress', 'done'}

_RENO_ATTACHMENTS_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'uploads', 'renovation_attachments',
)
os.makedirs(_RENO_ATTACHMENTS_FOLDER, exist_ok=True)


def _serialize_item(row):
    return {
        'id':             row['id'],
        'owner':          row['owner'],
        'name':           row['name'],
        'area':           row['area'] or '',
        'contractor':     row['contractor'] or '',
        'category':       row.get('category') or '',
        'status':         row['status'],
        'estimated_cost': float(row['estimated_cost']) if row['estimated_cost'] is not None else None,
        'total_paid':     float(row['total_paid']) if row['total_paid'] is not None else 0.0,
        'notes':          row['notes'] or '',
        'created_at':     row['created_at'].isoformat() if row['created_at'] else None,
    }


def _serialize_payment(row):
    return {
        'id':           row['id'],
        'item_id':      row['item_id'],
        'amount':       float(row['amount']),
        'payment_date': row['payment_date'].isoformat() if row['payment_date'] else None,
        'notes':        row['notes'] or '',
        'created_at':   row['created_at'].isoformat() if row['created_at'] else None,
    }


def _serialize_attachment(row):
    url = row.get('cloudinary_url') or f"/api/renovation/attachments/{row['id']}/file"
    return {
        'id':           row['id'],
        'item_id':      row['item_id'],
        'filename':     row['filename'],
        'content_type': row.get('content_type') or '',
        'file_size':    row.get('file_size'),
        'url':          url,
    }


# ── Items ──────────────────────────────────────────────────────────────────────

@renovation_bp.route('/api/renovation/items', methods=['GET'])
@token_required
def get_items(payload):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT i.*,
                       COALESCE(SUM(p.amount), 0) AS total_paid
                FROM renovation_items i
                LEFT JOIN renovation_payments p ON p.item_id = i.id
                WHERE i.owner = %s
                GROUP BY i.id
                ORDER BY i.area ASC, i.created_at ASC
            """, (owner,))
            return jsonify([_serialize_item(r) for r in cur.fetchall()])
    except Exception:
        logger.exception('get_items failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/items', methods=['POST'])
@token_required
def create_item(payload):
    owner = payload['username']
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    status = data.get('status', 'planned')
    if status not in _VALID_STATUS:
        return jsonify({'error': f'status must be one of {sorted(_VALID_STATUS)}'}), 400

    estimated_cost = data.get('estimated_cost')
    if estimated_cost is not None:
        try:
            estimated_cost = float(estimated_cost)
        except (TypeError, ValueError):
            return jsonify({'error': 'estimated_cost must be a number'}), 400

    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                INSERT INTO renovation_items (owner, name, area, contractor, category, status, estimated_cost, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                owner,
                name,
                (data.get('area') or '').strip() or None,
                (data.get('contractor') or '').strip() or None,
                (data.get('category') or '').strip() or None,
                status,
                estimated_cost,
                (data.get('notes') or '').strip() or None,
            ))
            conn.commit()
            new_id = cur.lastrowid
            cur.execute("""
                SELECT i.*, COALESCE(SUM(p.amount), 0) AS total_paid
                FROM renovation_items i
                LEFT JOIN renovation_payments p ON p.item_id = i.id
                WHERE i.id = %s
                GROUP BY i.id
            """, (new_id,))
            return jsonify(_serialize_item(cur.fetchone())), 201
    except Exception:
        logger.exception('create_item failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/items/<int:item_id>', methods=['PUT'])
@token_required
def update_item(payload, item_id):
    owner = payload['username']
    data = request.get_json() or {}
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT id, owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403

            fields, params = [], []
            for col in ('name', 'area', 'contractor', 'category', 'status', 'estimated_cost', 'notes'):
                if col not in data:
                    continue
                val = data[col]
                if col == 'name':
                    val = (val or '').strip()
                    if not val:
                        return jsonify({'error': 'name cannot be empty'}), 400
                elif col == 'status':
                    if val not in _VALID_STATUS:
                        return jsonify({'error': f'status must be one of {sorted(_VALID_STATUS)}'}), 400
                elif col == 'estimated_cost':
                    val = float(val) if val is not None else None
                else:
                    val = (val or '').strip() or None
                fields.append(f"{col} = %s")
                params.append(val)

            if not fields:
                return jsonify({'error': 'No fields to update'}), 400

            cur.execute(f"UPDATE renovation_items SET {', '.join(fields)} WHERE id = %s", [*params, item_id])
            conn.commit()
            cur.execute("""
                SELECT i.*, COALESCE(SUM(p.amount), 0) AS total_paid
                FROM renovation_items i
                LEFT JOIN renovation_payments p ON p.item_id = i.id
                WHERE i.id = %s
                GROUP BY i.id
            """, (item_id,))
            return jsonify(_serialize_item(cur.fetchone()))
    except Exception:
        logger.exception('update_item failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/items/<int:item_id>', methods=['DELETE'])
@token_required
def delete_item(payload, item_id):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403
            cur.execute("DELETE FROM renovation_items WHERE id = %s", (item_id,))
            conn.commit()
            return jsonify({'success': True})
    except Exception:
        logger.exception('delete_item failed')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── Payments ───────────────────────────────────────────────────────────────────

@renovation_bp.route('/api/renovation/items/<int:item_id>/payments', methods=['GET'])
@token_required
def get_payments(payload, item_id):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403
            cur.execute("""
                SELECT * FROM renovation_payments
                WHERE item_id = %s
                ORDER BY payment_date ASC, id ASC
            """, (item_id,))
            return jsonify([_serialize_payment(r) for r in cur.fetchall()])
    except Exception:
        logger.exception('get_payments failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/items/<int:item_id>/payments', methods=['POST'])
@token_required
def add_payment(payload, item_id):
    owner = payload['username']
    data = request.get_json() or {}

    amount = data.get('amount')
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({'error': 'amount must be a positive number'}), 400

    payment_date = data.get('payment_date')
    if not payment_date:
        return jsonify({'error': 'payment_date is required'}), 400

    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403

            cur.execute("""
                INSERT INTO renovation_payments (item_id, owner, amount, payment_date, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                item_id, owner, amount, payment_date,
                (data.get('notes') or '').strip() or None,
            ))
            conn.commit()
            cur.execute("SELECT * FROM renovation_payments WHERE id = %s", (cur.lastrowid,))
            return jsonify(_serialize_payment(cur.fetchone())), 201
    except Exception:
        logger.exception('add_payment failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/payments/<int:payment_id>', methods=['DELETE'])
@token_required
def delete_payment(payload, payment_id):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_payments WHERE id = %s", (payment_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Payment not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403
            cur.execute("DELETE FROM renovation_payments WHERE id = %s", (payment_id,))
            conn.commit()
            return jsonify({'success': True})
    except Exception:
        logger.exception('delete_payment failed')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── Attachments ─────────────────────────────────────────────────────────────────

@renovation_bp.route('/api/renovation/items/<int:item_id>/attachments', methods=['GET'])
@token_required
def get_item_attachments(payload, item_id):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403
            cur.execute(
                "SELECT id, item_id, filename, content_type, file_size, cloudinary_url "
                "FROM renovation_attachments WHERE item_id = %s ORDER BY id",
                (item_id,)
            )
            return jsonify([_serialize_attachment(r) for r in cur.fetchall()])
    except Exception:
        logger.exception('get_item_attachments failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/items/<int:item_id>/attachments', methods=['POST'])
@token_required
def upload_item_attachment(payload, item_id):
    owner = payload['username']
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_task_attachment(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400

        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT owner FROM renovation_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403

        content_type = file.content_type or ''
        original_filename = secure_filename(file.filename)
        cloudinary_url = None
        cloudinary_public_id = None
        stored_name = None
        file_size = None

        if CLOUDINARY_ENABLED:
            resource_type = 'image' if content_type.startswith('image/') else 'raw'
            upload_result = cloudinary.uploader.upload(
                file,
                folder='renovation_attachments',
                resource_type=resource_type,
                use_filename=True,
                unique_filename=True,
            )
            cloudinary_url = upload_result.get('secure_url')
            cloudinary_public_id = upload_result.get('public_id')
            file_size = upload_result.get('bytes', 0)
            stored_name = cloudinary_public_id
        else:
            ext = (original_filename.rsplit('.', 1)[1].lower()) if '.' in original_filename else ''
            stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
            upload_dir = os.path.realpath(_RENO_ATTACHMENTS_FOLDER)
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.realpath(os.path.join(upload_dir, stored_name))
            if not file_path.startswith(upload_dir + os.sep):
                return jsonify({'error': 'Invalid file path'}), 400
            file.save(file_path)
            file_size = os.path.getsize(file_path)

        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                """INSERT INTO renovation_attachments
                   (item_id, owner, filename, stored_filename, content_type, file_size, cloudinary_url, cloudinary_public_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (item_id, owner, original_filename, stored_name, content_type, file_size, cloudinary_url, cloudinary_public_id)
            )
            conn.commit()
            att_id = cur.lastrowid
            cur.execute(
                "SELECT id, item_id, filename, content_type, file_size, cloudinary_url FROM renovation_attachments WHERE id = %s",
                (att_id,)
            )
            return jsonify(_serialize_attachment(cur.fetchone())), 201
    except Exception:
        logger.exception('upload_item_attachment failed')
        return jsonify({'error': 'Upload failed'}), 500


@renovation_bp.route('/api/renovation/attachments/<int:attachment_id>', methods=['DELETE'])
@token_required
def delete_attachment(payload, attachment_id):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT owner, stored_filename, cloudinary_public_id, content_type "
                "FROM renovation_attachments WHERE id = %s",
                (attachment_id,)
            )
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Attachment not found'}), 404
            if row['owner'] != owner:
                return jsonify({'error': 'Access denied'}), 403
            if CLOUDINARY_ENABLED and row.get('cloudinary_public_id'):
                try:
                    resource_type = 'image' if (row.get('content_type') or '').startswith('image/') else 'raw'
                    cloudinary.uploader.destroy(row['cloudinary_public_id'], resource_type=resource_type)
                except Exception:
                    pass
            else:
                path = os.path.join(_RENO_ATTACHMENTS_FOLDER, row['stored_filename'] or '')
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            cur.execute("DELETE FROM renovation_attachments WHERE id = %s", (attachment_id,))
            conn.commit()
            return jsonify({'success': True})
    except Exception:
        logger.exception('delete_attachment failed')
        return jsonify({'error': 'An internal error occurred'}), 500


@renovation_bp.route('/api/renovation/attachments/<int:attachment_id>/file', methods=['GET'])
def serve_renovation_attachment(attachment_id):
    """Serve local attachment file (fallback when Cloudinary not enabled)."""
    token = request.headers.get('Authorization') or request.args.get('token')
    if not token:
        return jsonify({'error': 'Authentication token is missing'}), 401
    result = verify_jwt_token(token)
    if not result['valid']:
        return jsonify({'error': result.get('error', 'Invalid token')}), 401
    username = result['payload'].get('username')
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT owner, stored_filename, filename, content_type, cloudinary_url "
                "FROM renovation_attachments WHERE id = %s",
                (attachment_id,)
            )
            row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Attachment not found'}), 404
        if row['owner'] != username:
            return jsonify({'error': 'Access denied'}), 403
        if row.get('cloudinary_url'):
            return redirect(row['cloudinary_url'])
        upload_dir = os.path.realpath(_RENO_ATTACHMENTS_FOLDER)
        path = os.path.realpath(os.path.join(upload_dir, row['stored_filename'] or ''))
        if not path.startswith(upload_dir + os.sep) or not os.path.isfile(path):
            return jsonify({'error': 'File not found'}), 404
        return send_file(
            path,
            mimetype=row.get('content_type') or 'application/octet-stream',
            as_attachment=False,
            download_name=row['filename'],
        )
    except Exception:
        logger.exception('serve_renovation_attachment failed')
        return jsonify({'error': 'An internal error occurred'}), 500


# ── CSV Export ─────────────────────────────────────────────────────────────────

@renovation_bp.route('/api/renovation/export/csv', methods=['GET'])
@token_required
def export_renovation_csv(payload):
    owner = payload['username']
    try:
        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT i.id, i.name, i.area, i.contractor, i.category, i.status,
                       i.estimated_cost, i.notes, i.created_at,
                       COALESCE(SUM(p.amount), 0) AS total_paid
                FROM renovation_items i
                LEFT JOIN renovation_payments p ON p.item_id = i.id
                WHERE i.owner = %s
                GROUP BY i.id
                ORDER BY i.area ASC, i.name ASC
            """, (owner,))
            items = cur.fetchall()
            cur.execute("""
                SELECT p.id, p.item_id, p.amount, p.payment_date, p.notes, i.name AS item_name
                FROM renovation_payments p
                JOIN renovation_items i ON p.item_id = i.id
                WHERE p.owner = %s
                ORDER BY p.payment_date ASC, p.id ASC
            """, (owner,))
            payments = cur.fetchall()

        output = io.StringIO()
        item_fields = ['Name', 'Area', 'Contractor', 'Category', 'Status', 'Estimated Cost', 'Total Paid', 'Remaining', 'Notes']
        writer = csv.DictWriter(output, fieldnames=item_fields)
        writer.writeheader()
        for item in items:
            estimated = float(item['estimated_cost']) if item['estimated_cost'] is not None else 0.0
            total_paid = float(item['total_paid']) if item['total_paid'] is not None else 0.0
            remaining = max(0.0, estimated - total_paid)
            writer.writerow({
                'Name':           sanitize_csv_field(item['name']),
                'Area':           sanitize_csv_field(item.get('area') or ''),
                'Contractor':     sanitize_csv_field(item.get('contractor') or ''),
                'Category':       sanitize_csv_field(item.get('category') or ''),
                'Status':         sanitize_csv_field(item['status']),
                'Estimated Cost': sanitize_csv_field(estimated),
                'Total Paid':     sanitize_csv_field(total_paid),
                'Remaining':      sanitize_csv_field(remaining),
                'Notes':          sanitize_csv_field(item.get('notes') or ''),
            })

        output.write('\n')
        output.write('PAYMENTS\n')
        pay_writer = csv.DictWriter(output, fieldnames=['Item Name', 'Payment Date', 'Amount', 'Payment Notes'])
        pay_writer.writeheader()
        for pay in payments:
            payment_date = pay['payment_date']
            if hasattr(payment_date, 'strftime'):
                payment_date = payment_date.strftime('%Y-%m-%d')
            else:
                payment_date = str(payment_date) if payment_date else ''
            pay_writer.writerow({
                'Item Name':    sanitize_csv_field(pay['item_name']),
                'Payment Date': sanitize_csv_field(payment_date),
                'Amount':       sanitize_csv_field(float(pay['amount'])),
                'Payment Notes': sanitize_csv_field(pay.get('notes') or ''),
            })

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            mimetype='text/csv; charset=utf-8',
            as_attachment=True,
            download_name=f'renovation_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        )
    except Exception:
        logger.exception('export_renovation_csv failed')
        return jsonify({'error': 'Failed to export CSV'}), 500
