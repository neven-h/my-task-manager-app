"""Budget file upload — parse bank statements and batch-save budget entries."""
import logging
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, allowed_file
from werkzeug.utils import secure_filename
from routes.budget_parsers import parse_budget_file
from routes.budget_file_normalizer import normalize_poalim_osh_file_to_utf8_csv, DEFAULT_HEADER_MAP
from routes.budget_parsers_io import parse_normalized_poalim_csv_to_entries
from routes.budget_helpers import ensure_budget_table, ensure_budget_daily_balances_table

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
            ext = os.path.splitext(file_path)[1].lower()
            entries = []
            balances = []

            if ext in ('.xlsx', '.xls'):
                normalized_csv = os.path.join(
                    current_app.config['UPLOAD_FOLDER'],
                    f"budget_norm_{uuid.uuid4().hex}.csv",
                )
                try:
                    normalize_poalim_osh_file_to_utf8_csv(
                        file_path,
                        normalized_csv,
                        header_map=DEFAULT_HEADER_MAP,
                        apply_description_rules=True,
                    )
                    entries, balances = parse_normalized_poalim_csv_to_entries(normalized_csv)
                finally:
                    if os.path.exists(normalized_csv):
                        os.remove(normalized_csv)
            else:
                entries = parse_budget_file(file_path)

            total_income = sum(e['amount'] for e in entries if e['type'] == 'income')
            total_expense = sum(e['amount'] for e in entries if e['type'] == 'outcome')

            return jsonify({
                'success': True,
                'entries': entries,
                'balances': balances,
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
        balances = data.get('balances', []) or []
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
            ensure_budget_daily_balances_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id FROM budget_tabs WHERE id = %s AND owner = %s",
                (tab_id, username)
            )
            if not cursor.fetchone():
                return jsonify({'error': 'Tab not found or access denied'}), 404

            # Add balance column if not present (migration-safe)
            try:
                conn.cursor().execute(
                    "ALTER TABLE budget_entries ADD COLUMN IF NOT EXISTS "
                    "balance DECIMAL(14,2) DEFAULT NULL"
                )
            except Exception:
                pass

            cursor = conn.cursor()
            query = """INSERT INTO budget_entries
                       (type, description, amount, entry_date, category, notes, balance, owner, tab_id, source)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""

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
                notes = (e.get('notes') or '').strip() or None
                try:
                    balance = round(float(e['balance']), 2) if e.get('balance') is not None else None
                except (ValueError, TypeError):
                    balance = None
                values.append((entry_type, desc, amount, entry_date,
                               category, notes, balance, username, tab_id, 'upload'))

            if not values:
                return jsonify({'error': 'No valid entries after validation'}), 400

            cursor.executemany(query, values)
            first_id = cursor.lastrowid
            entry_ids = list(range(first_id, first_id + len(values)))

            # Upsert daily balances if provided (one snapshot per date).
            if balances:
                bal_values = []
                for b in balances:
                    d = (b.get('entry_date') or '').strip()
                    if not d:
                        continue
                    try:
                        bal = round(float(b.get('balance')), 2)
                    except Exception:
                        continue
                    bal_values.append((username, tab_id, d, bal, 'upload'))

                if bal_values:
                    bal_sql = (
                        "INSERT INTO budget_daily_balances (owner, tab_id, entry_date, balance, source) "
                        "VALUES (%s, %s, %s, %s, %s) "
                        "ON DUPLICATE KEY UPDATE balance = VALUES(balance), source = VALUES(source)"
                    )
                    cursor.executemany(bal_sql, bal_values)
            conn.commit()

            return jsonify({
                'success': True,
                'saved_count': len(values),
                'entry_ids': entry_ids,
            })
    except Exception:
        logger.exception('budget save-batch error')
        return jsonify({'error': 'An unexpected error occurred'}), 500
