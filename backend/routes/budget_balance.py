"""Budget balance and batch-delete endpoints."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field
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


def _month_key(d):
    if d is None:
        return None
    if isinstance(d, str):
        return d[:7]
    return d.strftime('%Y-%m')


def _bank_amount(row):
    """Return signed float amount for a bank transaction row."""
    if row.get('amount_plain') is not None:
        try:
            return float(row['amount_plain'])
        except Exception:
            pass
    try:
        return float(decrypt_field(row['amount']))
    except Exception:
        return None


@budget_balance_bp.route('/api/budget/monthly-summary', methods=['GET'])
@token_required
def get_monthly_summary(payload):
    """Per-month summary combining budget entries + linked bank transactions.

    Query params:
      - tab_id (required): budget tab id
      - start  (required): YYYY-MM-DD inclusive
      - end    (required): YYYY-MM-DD inclusive
      - months (optional): if provided and start is missing, start = end - N months

    Response: { months: [ { month, budget_income, budget_expense, fixed_expense,
                            variable_expense, bank_income, bank_expense,
                            bank_fixed_expense, bank_variable_expense,
                            income, expense, net, end_balance } ],
                linked_tab, start, end }
    """
    try:
        username = payload['username']
        user_role = payload.get('role', 'limited')
        tab_id = request.args.get('tab_id')
        end = request.args.get('end') or request.args.get('date')
        start = request.args.get('start')
        months_param = request.args.get('months')

        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        if not end:
            end = datetime.now().date().isoformat()
        end = _validate_iso_date(end, 'end')

        if not start and months_param:
            try:
                n = max(1, min(int(months_param), 36))
            except Exception:
                return jsonify({'error': 'months must be an integer'}), 400
            end_dt = datetime.strptime(end, '%Y-%m-%d').date()
            # Inclusive month window — first day of (end month - (n-1))
            yr, mo = end_dt.year, end_dt.month
            mo -= (n - 1)
            while mo <= 0:
                mo += 12
                yr -= 1
            start = datetime(yr, mo, 1).date().isoformat()

        if not start:
            return jsonify({'error': 'start is required'}), 400
        start = _validate_iso_date(start, 'start')
        if start > end:
            return jsonify({'error': 'start must be <= end'}), 400

        with get_db_connection() as conn:
            ensure_budget_daily_balances_table(conn)
            cur = conn.cursor(dictionary=True)

            # 1. Budget entries grouped by month, split by is_fixed
            cur.execute(
                "SELECT DATE_FORMAT(entry_date, '%%Y-%%m') AS month, "
                "COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income, "
                "COALESCE(SUM(CASE WHEN type='outcome' THEN amount ELSE 0 END), 0) AS expense, "
                "COALESCE(SUM(CASE WHEN type='outcome' AND is_fixed=1 THEN amount ELSE 0 END), 0) AS fixed_expense "
                "FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s AND entry_date >= %s AND entry_date <= %s "
                "GROUP BY month",
                (username, tab_id, start, end),
            )
            budget_by_month = {}
            for r in cur.fetchall():
                m = r['month']
                inc = float(r['income'] or 0)
                exp = float(r['expense'] or 0)
                fx = float(r['fixed_expense'] or 0)
                budget_by_month[m] = {
                    'budget_income': inc,
                    'budget_expense': exp,
                    'fixed_expense': fx,
                    'variable_expense': max(exp - fx, 0.0),
                }

            # 2. Linked bank transaction tab
            cur.execute(
                "SELECT l.transaction_tab_id, l.link_type, t.name AS transaction_tab_name "
                "FROM budget_bank_links l "
                "JOIN transaction_tabs t ON t.id = l.transaction_tab_id "
                "WHERE l.budget_tab_id = %s AND l.owner = %s LIMIT 1",
                (tab_id, username),
            )
            link = cur.fetchone()

            bank_by_month = defaultdict(lambda: {
                'bank_income': 0.0,
                'bank_expense': 0.0,
                'bank_fixed_expense': 0.0,
                'bank_variable_expense': 0.0,
            })
            if link:
                tx_tab_id = link['transaction_tab_id']
                link_type = (link.get('link_type') or 'expense')

                # SAME date range applied to bank rows — the root-cause fix.
                sql = (
                    "SELECT transaction_date, amount, amount_plain, is_fixed "
                    "FROM bank_transactions "
                    "WHERE tab_id = %s AND transaction_date >= %s AND transaction_date <= %s"
                )
                params = [tx_tab_id, start, end]
                if user_role != 'shared':
                    sql += " AND (uploaded_by = %s OR uploaded_by IS NULL)"
                    params.append(username)
                cur.execute(sql, tuple(params))

                for row in cur.fetchall():
                    amt = _bank_amount(row)
                    if amt is None:
                        continue
                    mk = _month_key(row['transaction_date'])
                    if mk is None:
                        continue
                    abs_amt = abs(amt)
                    is_fixed = bool(row.get('is_fixed'))
                    bucket = bank_by_month[mk]
                    if link_type == 'expense':
                        bucket['bank_expense'] += abs_amt
                        if is_fixed:
                            bucket['bank_fixed_expense'] += abs_amt
                        else:
                            bucket['bank_variable_expense'] += abs_amt
                    elif link_type == 'income':
                        bucket['bank_income'] += abs_amt
                    else:  # mixed: sign-driven
                        if amt < 0:
                            bucket['bank_expense'] += abs_amt
                            if is_fixed:
                                bucket['bank_fixed_expense'] += abs_amt
                            else:
                                bucket['bank_variable_expense'] += abs_amt
                        else:
                            bucket['bank_income'] += amt

            # 3. End-of-month balances from budget_daily_balances (last entry ≤ month end)
            all_months = sorted(set(list(budget_by_month.keys()) + list(bank_by_month.keys())))
            # If neither table contributed, still emit empty months between start and end.
            if not all_months:
                cur_dt = datetime.strptime(start, '%Y-%m-%d').date().replace(day=1)
                end_dt = datetime.strptime(end, '%Y-%m-%d').date()
                while cur_dt <= end_dt:
                    all_months.append(cur_dt.strftime('%Y-%m'))
                    # advance to next month
                    yr, mo = cur_dt.year, cur_dt.month + 1
                    if mo > 12:
                        mo = 1
                        yr += 1
                    cur_dt = datetime(yr, mo, 1).date()

            end_balances = {}
            for mk in all_months:
                yr, mo = int(mk[:4]), int(mk[5:7])
                nxt_yr, nxt_mo = (yr + 1, 1) if mo == 12 else (yr, mo + 1)
                month_end = (datetime(nxt_yr, nxt_mo, 1).date() - timedelta(days=1)).isoformat()
                cur.execute(
                    "SELECT balance FROM budget_daily_balances "
                    "WHERE owner = %s AND tab_id = %s AND entry_date <= %s "
                    "ORDER BY entry_date DESC LIMIT 1",
                    (username, tab_id, month_end),
                )
                row = cur.fetchone()
                end_balances[mk] = float(row['balance']) if row and row.get('balance') is not None else None

            months_out = []
            for mk in all_months:
                bm = budget_by_month.get(mk, {
                    'budget_income': 0.0,
                    'budget_expense': 0.0,
                    'fixed_expense': 0.0,
                    'variable_expense': 0.0,
                })
                bk = bank_by_month.get(mk, {
                    'bank_income': 0.0,
                    'bank_expense': 0.0,
                    'bank_fixed_expense': 0.0,
                    'bank_variable_expense': 0.0,
                })
                income = bm['budget_income'] + bk['bank_income']
                expense = bm['budget_expense'] + bk['bank_expense']
                fixed = bm['fixed_expense'] + bk['bank_fixed_expense']
                months_out.append({
                    'month': mk,
                    'budget_income': round(bm['budget_income'], 2),
                    'budget_expense': round(bm['budget_expense'], 2),
                    'bank_income': round(bk['bank_income'], 2),
                    'bank_expense': round(bk['bank_expense'], 2),
                    'fixed_expense': round(fixed, 2),
                    'variable_expense': round(max(expense - fixed, 0.0), 2),
                    'income': round(income, 2),
                    'expense': round(expense, 2),
                    'net': round(income - expense, 2),
                    'end_balance': end_balances.get(mk),
                })

        return jsonify({
            'start': start,
            'end': end,
            'linked_tab': link,
            'months': months_out,
        })

    except ValueError:
        # Log the underlying validation failure server-side with the raw
        # query-string values so we can diagnose without leaking exception
        # text to the client (py/stack-trace-exposure).
        logger.warning(
            'budget monthly-summary validation error tab_id=%r start=%r end=%r months=%r',
            request.args.get('tab_id'),
            request.args.get('start'),
            request.args.get('end') or request.args.get('date'),
            request.args.get('months'),
            exc_info=True,
        )
        return jsonify({'error': 'Invalid or missing date parameter'}), 400
    except Exception:
        logger.exception(
            'budget monthly-summary error tab_id=%r start=%r end=%r',
            request.args.get('tab_id'),
            request.args.get('start'),
            request.args.get('end') or request.args.get('date'),
        )
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
