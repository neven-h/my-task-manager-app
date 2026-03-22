"""Renovation tracker — CRUD for renovation_items and renovation_payments."""
import logging
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required

logger = logging.getLogger(__name__)
renovation_bp = Blueprint('renovation', __name__)

_ITEM_ALLOWED = {'name', 'area', 'contractor', 'status', 'estimated_cost', 'notes'}
_VALID_STATUS = {'planned', 'in_progress', 'done'}


def _serialize_item(row):
    return {
        'id':             row['id'],
        'owner':          row['owner'],
        'name':           row['name'],
        'area':           row['area'] or '',
        'contractor':     row['contractor'] or '',
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
                INSERT INTO renovation_items (owner, name, area, contractor, status, estimated_cost, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                owner,
                name,
                (data.get('area') or '').strip() or None,
                (data.get('contractor') or '').strip() or None,
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
            for col in ('name', 'area', 'contractor', 'status', 'estimated_cost', 'notes'):
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
