"""Budget file upload — parse bank statements and batch-save budget entries."""
import logging
import os
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, allowed_file
from werkzeug.utils import secure_filename
import pandas as pd
from routes.budget_parsers import parse_budget_file
from routes.budget_file_normalizer import normalize_poalim_osh_file_to_utf8_csv, DEFAULT_HEADER_MAP
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

                    df = pd.read_csv(normalized_csv, dtype=str, encoding='utf-8')
                    df = df.dropna(how='all').reset_index(drop=True)

                    last_balance_by_date = {}
                    for _, row in df.iterrows():
                        entry_date = str(row.get('transaction_date') or '').strip()
                        if not entry_date or entry_date.lower() == 'nan':
                            continue

                        bal_raw = str(row.get('balance') or '').strip()
                        if bal_raw and bal_raw.lower() not in ('nan', ''):
                            try:
                                last_balance_by_date[entry_date] = round(float(bal_raw.replace(',', '')), 2)
                            except Exception:
                                pass

                        amt_raw = str(row.get('amount') or '').strip()
                        if not amt_raw or amt_raw.lower() in ('nan', ''):
                            continue
                        try:
                            amt = float(amt_raw.replace(',', ''))
                        except Exception:
                            continue
                        if amt == 0:
                            continue

                        entry_type = 'income' if amt > 0 else 'outcome'
                        description = str(row.get('description') or '').strip()
                        if not description or description.lower() == 'nan':
                            description = 'Unknown'

                        entries.append({
                            'type': entry_type,
                            'description': description,
                            'amount': round(abs(amt), 2),
                            'entry_date': entry_date,
                            'category': None,
                            'notes': None,
                        })

                    balances = [
                        {'entry_date': d, 'balance': b}
                        for d, b in sorted(last_balance_by_date.items())
                    ]
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

            cursor = conn.cursor()
            query = """INSERT INTO budget_entries
                       (type, description, amount, entry_date, category, notes, owner, tab_id, source)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""

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
                values.append((entry_type, desc, amount, entry_date,
                               category, notes, username, tab_id, 'upload'))

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


def _validate_iso_date(s: str, param_name: str) -> str:
    """Validate YYYY-MM-DD and return normalized ISO date string."""
    if not s or not isinstance(s, str):
        raise ValueError(f'{param_name} is required')
    s = s.strip()
    try:
        d = datetime.strptime(s, '%Y-%m-%d').date()
    except Exception:
        raise ValueError(f'{param_name} must be YYYY-MM-DD')
    return d.isoformat()


@budget_upload_bp.route('/api/budget/balance-as-of', methods=['GET'])
@token_required
def get_balance_as_of(payload):
    """Return the latest uploaded balance on or before the given date."""
    try:
        username = payload['username']
        tab_id = request.args.get('tab_id')
        as_of = request.args.get('date')
        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        if not as_of:
            return jsonify({'error': 'date is required'}), 400
        as_of = _validate_iso_date(as_of, 'date')

        with get_db_connection() as conn:
            ensure_budget_daily_balances_table(conn)
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT entry_date, balance FROM budget_daily_balances "
                "WHERE owner = %s AND tab_id = %s AND entry_date <= %s "
                "ORDER BY entry_date DESC LIMIT 1",
                (username, tab_id, as_of),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({'balance': None, 'entry_date': None})
            return jsonify({'balance': float(row['balance']), 'entry_date': str(row['entry_date'])})
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        logger.exception('budget balance-as-of error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_upload_bp.route('/api/budget/balance-range', methods=['GET'])
@token_required
def get_balance_range(payload):
    """
    Return:
      - balance_as_of (from budget_daily_balances) at end date
      - income_total / expense_total for [start_date..end_date] inclusive

    Query params:
      - tab_id (required)
      - end (required) OR date (deprecated alias)
      - days (optional preset: 7|30|90). If present and start is missing, start=end-days.
      - start (required for custom range)
    """
    try:
        username = payload['username']
        tab_id = request.args.get('tab_id')
        end = request.args.get('end') or request.args.get('date')
        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        end = _validate_iso_date(end, 'end')

        start = request.args.get('start')
        days = request.args.get('days')

        if days and not start:
            try:
                days_int = int(days)
            except Exception:
                days_int = None
            if days_int not in (7, 30, 90):
                return jsonify({'error': 'days must be one of: 7,30,90'}), 400
            end_dt = datetime.strptime(end, '%Y-%m-%d').date()
            start = (end_dt - timedelta(days=days_int)).isoformat()

        if not start:
            return jsonify({'error': 'start is required'}), 400

        start = _validate_iso_date(start, 'start')
        if start > end:
            return jsonify({'error': 'start must be <= end'}), 400

        with get_db_connection() as conn:
            ensure_budget_daily_balances_table(conn)
            cur = conn.cursor(dictionary=True)

            cur.execute(
                "SELECT balance FROM budget_daily_balances "
                "WHERE owner = %s AND tab_id = %s AND entry_date <= %s "
                "ORDER BY entry_date DESC LIMIT 1",
                (username, tab_id, end),
            )
            bal_row = cur.fetchone()
            balance_as_of = float(bal_row['balance']) if bal_row and bal_row.get('balance') is not None else None

            cur.execute(
                "SELECT "
                "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income_total, "
                "COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount ELSE 0 END), 0) AS expense_total "
                "FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s AND entry_date >= %s AND entry_date <= %s",
                (username, tab_id, start, end),
            )
            totals = cur.fetchone() or {'income_total': 0, 'expense_total': 0}

        return jsonify({
            'start_date': start,
            'end_date': end,
            'balance_as_of': balance_as_of,
            'income_total': float(totals.get('income_total') or 0),
            'expense_total': float(totals.get('expense_total') or 0),
        })
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        logger.exception('budget balance-range error')
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
            placeholders = ','.join(['%s'] * len(entry_ids))
            # Find affected dates/tab ids so we can also remove daily balance snapshots.
            cur2 = conn.cursor(dictionary=True)
            cur2.execute(
                "SELECT DISTINCT tab_id, entry_date "
                "FROM budget_entries "
                f"WHERE id IN ({placeholders}) AND owner = %s",
                (*entry_ids, username),
            )
            affected = cur2.fetchall()

            cursor = conn.cursor()
            cursor.execute(
                f"DELETE FROM budget_entries WHERE id IN ({placeholders}) AND owner = %s",
                (*entry_ids, username),
            )
            deleted = cursor.rowcount

            # Best-effort delete of daily balances.
            for row in affected:
                try:
                    tab_id = row.get('tab_id')
                    d = row.get('entry_date')
                    if tab_id is None or not d:
                        continue
                    cursor.execute(
                        "DELETE FROM budget_daily_balances WHERE owner = %s AND tab_id = %s AND entry_date = %s",
                        (username, tab_id, d),
                    )
                except Exception:
                    continue
            conn.commit()

        return jsonify({'success': True, 'deleted_count': deleted})
    except Exception:
        logger.exception('budget batch-delete error')
        return jsonify({'error': 'An unexpected error occurred'}), 500
