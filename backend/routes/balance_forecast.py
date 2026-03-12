"""Unified balance forecast — combines budget + bank transaction predictions.

Computes current balance from historical data in both tables, then projects
a date-sorted timeline of predicted income/expenses with running balance.
"""
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field
from .forecast_engine import predict_sequence, confidence_score, cache_get, cache_set

logger = logging.getLogger(__name__)
balance_forecast_bp = Blueprint('balance_forecast', __name__)

_MIN_ENTRIES = 3
_MAX_INTERVAL_STD_RATIO = 0.6


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

        cache_key = f"balancefc:{username}:{tab_id}:{months}"
        if (cached := cache_get(cache_key)) is not None:
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

            bank_total = 0.0
            bank_predictions = []
            if link:
                tx_tab_id = link['transaction_tab_id']
                # Sum historical bank transactions (all are expenses)
                cur.execute(
                    "SELECT amount FROM bank_transactions WHERE tab_id = %s"
                    + ("" if user_role == 'shared' else " AND uploaded_by = %s"),
                    (tx_tab_id,) if user_role == 'shared' else (tx_tab_id, username),
                )
                for row in cur.fetchall():
                    try:
                        bank_total += abs(float(decrypt_field(row['amount'])))
                    except Exception:
                        continue

                # Get bank transaction predictions
                cur.execute(
                    "SELECT description, amount, transaction_date, transaction_type "
                    "FROM bank_transactions WHERE tab_id = %s"
                    + ("" if user_role == 'shared' else " AND uploaded_by = %s")
                    + " ORDER BY transaction_date ASC, id ASC",
                    (tx_tab_id,) if user_role == 'shared' else (tx_tab_id, username),
                )
                bank_rows = cur.fetchall()
                bank_predictions = _predict_bank(bank_rows, today, cutoff, months)

            # 3. Get budget predictions
            cur.execute(
                "SELECT description, type, amount, entry_date FROM budget_entries "
                "WHERE owner = %s AND tab_id = %s ORDER BY entry_date ASC, id ASC",
                (username, tab_id),
            )
            budget_pred_rows = cur.fetchall()
            budget_predictions = _predict_budget(budget_pred_rows, today, cutoff, months)

        # 4. Build unified timeline with running balance
        current_balance = round(budget_income - budget_expense - bank_total, 2)
        timeline = _merge_timeline(budget_predictions, bank_predictions, current_balance)

        result = {
            'current_balance': current_balance,
            'budget_income': round(budget_income, 2),
            'budget_expense': round(budget_expense, 2),
            'bank_expense': round(bank_total, 2),
            'as_of': today.isoformat(),
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


# ── Prediction helpers (reuse same logic as dedicated modules) ────────────────

def _group_and_predict(groups, today, cutoff, n_ahead, source_label):
    """Shared logic: filter groups, run Chronos, emit timeline entries."""
    results = []
    for (_, entry_type), entries in groups.items():
        if len(entries) < _MIN_ENTRIES:
            continue

        original_desc = entries[-1]['description']
        dates = [e['date'] if isinstance(e['date'], type(today)) else
                 datetime.strptime(str(e['date'])[:10], '%Y-%m-%d').date()
                 for e in entries]
        amounts = [e['amount'] for e in entries]

        intervals = [(dates[i] - dates[i - 1]).days
                     for i in range(1, len(dates)) if (dates[i] - dates[i - 1]).days > 0]
        if not intervals:
            continue
        avg_iv = sum(intervals) / len(intervals)
        if avg_iv < 7 or avg_iv > 365:
            continue
        if len(intervals) >= 3:
            std_iv = math.sqrt(sum((x - avg_iv) ** 2 for x in intervals) / len(intervals))
            if std_iv > avg_iv * _MAX_INTERVAL_STD_RATIO:
                continue

        amount_fc = predict_sequence(amounts, n=n_ahead)
        interval_fc = predict_sequence([float(x) for x in intervals], n=n_ahead)

        next_date = dates[-1]
        for i in range(n_ahead):
            iv_days = max(7, round(interval_fc['median'][i]))
            next_date = next_date + timedelta(days=iv_days)
            if next_date > cutoff:
                break
            if next_date >= today:
                results.append({
                    'date': next_date.isoformat(),
                    'description': original_desc,
                    'source': source_label,
                    'type': entry_type,
                    'amount': round(max(0.0, amount_fc['median'][i]), 2),
                    'confidence': confidence_score(amount_fc, interval_fc, len(entries), i),
                })
    return results


def _predict_budget(rows, today, cutoff, n_ahead):
    if not rows:
        return []
    groups = defaultdict(list)
    for r in rows:
        d = r['entry_date']
        if isinstance(d, str):
            d = datetime.strptime(d[:10], '%Y-%m-%d').date()
        groups[(r['description'].strip().lower(), r['type'])].append(
            {'description': r['description'], 'amount': float(r['amount']),
             'date': d, 'type': r['type']}
        )
    return _group_and_predict(groups, today, cutoff, n_ahead, 'budget')


def _predict_bank(rows, today, cutoff, n_ahead):
    if not rows:
        return []
    groups = defaultdict(list)
    for r in rows:
        try:
            desc = decrypt_field(r['description'])
            amount = abs(float(decrypt_field(r['amount'])))
        except Exception:
            continue
        d = r['transaction_date']
        if isinstance(d, str):
            d = datetime.strptime(d[:10], '%Y-%m-%d').date()
        groups[(desc.strip().lower(), r['transaction_type'])].append(
            {'description': desc, 'amount': amount, 'date': d, 'type': 'expense'}
        )
    return _group_and_predict(groups, today, cutoff, n_ahead, 'bank')


def _merge_timeline(budget_preds, bank_preds, current_balance):
    """Merge predictions into a date-sorted timeline with running balance."""
    all_preds = []
    for p in budget_preds:
        delta = p['amount'] if p['type'] == 'income' else -p['amount']
        all_preds.append({**p, 'delta': delta})
    for p in bank_preds:
        all_preds.append({**p, 'delta': -p['amount']})

    all_preds.sort(key=lambda x: x['date'])
    running = current_balance
    for p in all_preds:
        running = round(running + p['delta'], 2)
        p['running_balance'] = running
        del p['delta']
    return all_preds
