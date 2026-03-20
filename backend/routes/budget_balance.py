"""Budget balance and batch-delete endpoints."""
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from routes.budget_helpers import ensure_budget_daily_balances_table

logger = logging.getLogger(__name__)
budget_balance_bp = Blueprint('budget_balance', __name__)


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


@budget_balance_bp.route('/api/budget/balance-as-of', methods=['GET'])
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
    except ValueError:
        return jsonify({'error': 'Invalid or missing date parameter'}), 400
    except Exception:
        logger.exception('budget balance-as-of error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_balance_bp.route('/api/budget/balance-range', methods=['GET'])
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
    except ValueError:
        return jsonify({'error': 'Invalid or missing date parameter'}), 400
    except Exception:
        logger.exception('budget balance-range error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_balance_bp.route('/api/budget/monthly-balances', methods=['GET'])
@token_required
def get_monthly_balances(payload):
    """Return the last-known balance per calendar month for a tab (from budget_entries.balance)."""
    try:
        username = payload['username']
        tab_id = request.args.get('tab_id', type=int)
        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        with get_db_connection() as conn:
            from routes.budget_helpers import ensure_budget_table
            ensure_budget_table(conn)
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT t.month, t.balance FROM (
                    SELECT DATE_FORMAT(entry_date, '%%Y-%%m') AS month,
                           balance,
                           ROW_NUMBER() OVER (
                               PARTITION BY DATE_FORMAT(entry_date, '%%Y-%%m')
                               ORDER BY entry_date DESC, id DESC
                           ) AS rn
                    FROM budget_entries
                    WHERE owner = %s AND tab_id = %s AND balance IS NOT NULL
                ) t WHERE t.rn = 1
            """, (username, tab_id))
            rows = cur.fetchall()
        return jsonify({r['month']: float(r['balance']) for r in rows})
    except Exception:
        logger.exception('budget monthly-balances error')
        return jsonify({'error': 'An unexpected error occurred'}), 500


@budget_balance_bp.route('/api/budget/batch-delete', methods=['DELETE'])
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
