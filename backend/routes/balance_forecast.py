"""Unified balance forecast — combines budget + bank transaction predictions.

Computes current balance from historical data in both tables, then projects
a date-sorted timeline of predicted income/expenses with running balance.
"""
import logging
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field
from .forecast_engine import cache_get, cache_set
from ._balance_forecast_helpers import (
    _predict_budget, _predict_bank, _merge_timeline, _build_monthly_actuals,
)

logger = logging.getLogger(__name__)
balance_forecast_bp = Blueprint('balance_forecast', __name__)


@balance_forecast_bp.route('/api/budget/balance-forecast', methods=['GET'])
@token_required
def balance_forecast(payload):
    """Return current balance + predicted future timeline from budget + bank data."""
    try:
        username = payload['username']
        user_role = payload.get('role', 'limited')
        tab_id = request.args.get('tab_id')
        months = min(int(request.args.get('months', 3)), 12)

        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400

        force_refresh = request.args.get('refresh') == '1'
        cache_key = f"balancefc:{username}:{tab_id}:{months}"
        if not force_refresh and (cached := cache_get(cache_key)) is not None:
            return jsonify(cached)

        today = datetime.now().date()
        cutoff = today + timedelta(days=months * 30)

        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)

            # 1. Current balance from budget entries
            cur.execute(
                "SELECT type, amount FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s AND entry_date <= %s",
                (username, tab_id, today.isoformat()),
            )
            budget_rows = cur.fetchall()
            budget_income = sum(r['amount'] for r in budget_rows if r['type'] == 'income')
            budget_expense = sum(r['amount'] for r in budget_rows if r['type'] == 'outcome')

            # 2. Check for linked bank transaction tab
            cur.execute(
                "SELECT l.transaction_tab_id, t.name AS transaction_tab_name "
                "FROM budget_bank_links l "
                "JOIN transaction_tabs t ON t.id = l.transaction_tab_id "
                "WHERE l.budget_tab_id = %s AND l.owner = %s LIMIT 1",
                (tab_id, username),
            )
            link = cur.fetchone()

            bank_income = 0.0
            bank_expense = 0.0
            real_balance = None   # actual balance from bank statement (יתרה column)
            real_balance_date = None
            monthly_actuals = []
            bank_predictions = []
            if link:
                tx_tab_id = link['transaction_tab_id']

                # Use the real bank balance stored from the יתרה column if available
                try:
                    cur.execute(
                        "SELECT last_known_balance, balance_date FROM transaction_tabs "
                        "WHERE id = %s LIMIT 1",
                        (tx_tab_id,),
                    )
                    tab_row = cur.fetchone()
                    if tab_row and tab_row.get('last_known_balance') is not None:
                        real_balance = float(tab_row['last_known_balance'])
                        real_balance_date = tab_row.get('balance_date')
                except Exception:
                    pass  # column may not exist yet; fall through to calculated balance

                # Sum historical bank transactions (used for income/expense split in summary)
                cur.execute(
                    "SELECT amount, transaction_type FROM bank_transactions WHERE tab_id = %s"
                    + ("" if user_role == 'shared' else " AND uploaded_by = %s"),
                    (tx_tab_id,) if user_role == 'shared' else (tx_tab_id, username),
                )
                for row in cur.fetchall():
                    try:
                        amt = float(decrypt_field(row['amount']))
                        if amt >= 0:
                            bank_income += amt
                        else:
                            bank_expense += abs(amt)
                    except Exception:
                        continue

                # Get bank transaction predictions (24-month window)
                cur.execute(
                    "SELECT description, amount, transaction_date, transaction_type "
                    "FROM bank_transactions WHERE tab_id = %s"
                    " AND transaction_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)"
                    + ("" if user_role == 'shared' else " AND uploaded_by = %s")
                    + " ORDER BY transaction_date ASC, id ASC",
                    (tx_tab_id,) if user_role == 'shared' else (tx_tab_id, username),
                )
                bank_rows = cur.fetchall()
                bank_predictions = _predict_bank(bank_rows, today, cutoff, months)
                monthly_actuals = _build_monthly_actuals(bank_rows, today)

            # 3. Budget entries for last 12 months (history timeline)
            hist_start = today.replace(day=1)
            for _ in range(11):
                hist_start = (hist_start - timedelta(days=1)).replace(day=1)
            cur.execute(
                "SELECT type, amount, entry_date FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s "
                "AND entry_date >= %s AND entry_date <= %s",
                (username, tab_id, hist_start.isoformat(), today.isoformat()),
            )
            budget_hist_rows = cur.fetchall()

            # 4. Get budget predictions (24-month window)
            cur.execute(
                "SELECT description, type, amount, entry_date FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s"
                " AND entry_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)"
                " ORDER BY entry_date ASC, id ASC",
                (username, tab_id),
            )
            budget_pred_rows = cur.fetchall()
            budget_predictions = _predict_budget(budget_pred_rows, today, cutoff, months)

        # 5. Build unified timeline with running balance
        # Prefer the real bank balance from the יתרה column; fall back to calculated sum
        if real_balance is not None:
            current_balance = round(real_balance + budget_income - budget_expense, 2)
        else:
            current_balance = round(budget_income - budget_expense - bank_expense + bank_income, 2)
        timeline = _merge_timeline(budget_predictions, bank_predictions, current_balance)

        # 6. Build history timeline (last 12 months, budget + bank combined per month)
        budget_by_month = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
        for r in budget_hist_rows:
            d = r['entry_date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            mk = d.strftime('%Y-%m')
            if r['type'] == 'income':
                budget_by_month[mk]['income'] += float(r['amount'])
            else:
                budget_by_month[mk]['expense'] += float(r['amount'])

        bank_by_month = {m['month']: m for m in monthly_actuals}
        all_month_keys = sorted(set(list(budget_by_month.keys()) + list(bank_by_month.keys())))
        history_months = []
        for mk in all_month_keys:
            bm = budget_by_month.get(mk, {'income': 0.0, 'expense': 0.0})
            bk = bank_by_month.get(mk, {'expense': 0.0, 'income': 0.0})
            net = bm['income'] - bm['expense'] - bk['expense'] + bk['income']
            history_months.append({
                'month': mk,
                'budget_income':  round(bm['income'], 2),
                'budget_expense': round(bm['expense'], 2),
                'bank_expense':   round(bk['expense'], 2),
                'bank_income':    round(bk['income'], 2),
                'net':            round(net, 2),
            })
        # Running balance: work backwards from current_balance
        running = current_balance
        for m in reversed(history_months):
            m['running_balance'] = round(running, 2)
            running -= m['net']

        result = {
            'current_balance': current_balance,
            'real_balance': real_balance,
            'real_balance_date': real_balance_date.isoformat() if real_balance_date else None,
            'budget_income': round(budget_income, 2),
            'budget_expense': round(budget_expense, 2),
            'bank_expense': round(bank_expense, 2),
            'bank_income': round(bank_income, 2),
            'history_timeline': history_months,
            'monthly_actuals': monthly_actuals if link else [],
            'as_of': today.isoformat(),
            'last_updated': datetime.now().isoformat(),
            'linked_tab': link,
            'timeline': timeline,
            'forecast_end_balance': round(
                timeline[-1]['running_balance'] if timeline else current_balance, 2
            ),
        }
        cache_set(cache_key, result)
        return jsonify(result)

    except Exception as exc:
        logger.error('balance_forecast error: %s', exc, exc_info=True)
        return jsonify({'error': 'Failed to generate balance forecast'}), 500
