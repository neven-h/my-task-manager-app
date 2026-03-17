"""Budget file upload — parse bank statements and batch-save budget entries."""
import logging
import os
from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, allowed_file
from werkzeug.utils import secure_filename
from routes.budget_parsers import parse_budget_file
from routes.budget_helpers import ensure_budget_table

logger = logging.getLogger(__name__)
budget_upload_bp = Blueprint('budget_upload', __name__)


@budget_upload_bp.route('/api/budget/upload', methods=['POST'])
@token_required
def upload_budget_file(payload):
    """Upload and parse a bank statement file, return preview."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Upload CSV or Excel'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            entries = parse_budget_file(file_path)

            total_income = sum(e['amount'] for e in entries if e['type'] == 'income')
            total_expense = sum(e['amount'] for e in entries if e['type'] == 'outcome')

            return jsonify({
                'success': True,
                'entries': entries,
                'entry_count': len(entries),
                'income_count': sum(1 for e in entries if e['type'] == 'income'),
                'expense_count': sum(1 for e in entries if e['type'] == 'outcome'),
                'total_income': round(total_income, 2),
                'total_expense': round(total_expense, 2),
            })
        except Exception:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise
    except ValueError as exc:
        logger.warning('budget upload validation: %s', exc)
        return jsonify({'error': 'Invalid file or data format'}), 400
    except Exception:
        logger.exception('budget upload error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_upload_bp.route('/api/budget/save-batch', methods=['POST'])
@token_required
def save_budget_batch(payload):
    """Batch-save parsed budget entries."""
    try:
        data = request.get_json() or {}
        entries = data.get('entries', [])
        tab_id = data.get('tab_id')
        username = payload['username']

        if not entries:
            return jsonify({'error': 'No entries to save'}), 400
        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        if len(entries) > 5000:
            return jsonify({'error': 'Too many entries (max 5000)'}), 400

        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id FROM budget_tabs WHERE id = %s AND owner = %s",
                (tab_id, username)
            )
            if not cursor.fetchone():
                return jsonify({'error': 'Tab not found or access denied'}), 404

            cursor = conn.cursor()
            query = """INSERT INTO budget_entries
                       (type, description, amount, entry_date, category, owner, tab_id, source)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""

            values = []
            for e in entries:
                entry_type = e.get('type')
                if entry_type not in ('income', 'outcome'):
                    continue
                desc = (e.get('description') or '').strip() or 'Unknown'
                try:
                    amount = round(float(e['amount']), 2)
                    if amount <= 0:
                        continue
                except (ValueError, TypeError, KeyError):
                    continue
                entry_date = e.get('entry_date')
                if not entry_date:
                    continue
                category = (e.get('category') or '').strip() or None
                values.append((entry_type, desc, amount, entry_date,
                               category, username, tab_id, 'upload'))

            if not values:
                return jsonify({'error': 'No valid entries after validation'}), 400

            cursor.executemany(query, values)
            first_id = cursor.lastrowid
            entry_ids = list(range(first_id, first_id + len(values)))
            conn.commit()

            return jsonify({
                'success': True,
                'saved_count': len(values),
                'entry_ids': entry_ids,
            })
    except Exception:
        logger.exception('budget save-batch error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_upload_bp.route('/api/budget/batch-delete', methods=['DELETE'])
@token_required
def delete_budget_batch(payload):
    """Delete multiple budget entries by IDs (for undo after upload)."""
    try:
        data = request.get_json() or {}
        entry_ids = data.get('entry_ids', [])
        username = payload['username']

        if not entry_ids or not isinstance(entry_ids, list):
            return jsonify({'error': 'entry_ids array is required'}), 400
        if len(entry_ids) > 5000:
            return jsonify({'error': 'Too many entries'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            placeholders = ','.join(['%s'] * len(entry_ids))
            cursor.execute(
                f"DELETE FROM budget_entries WHERE id IN ({placeholders}) AND owner = %s",
                (*entry_ids, username)
            )
            deleted = cursor.rowcount
            conn.commit()

        return jsonify({'success': True, 'deleted_count': deleted})
    except Exception:
        logger.exception('budget batch-delete error')
        return jsonify({'error': 'An unexpected error occurred'}), 500
