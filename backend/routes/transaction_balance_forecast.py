"""Bank transaction balance forecast.

Returns historical monthly spending (last 6 months) + AI-predicted future
spending, so the frontend can project a running account balance for any
starting amount the user supplies.
"""
import logging
import math
import re
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field
from .forecast_engine import predict_sequence, confidence_score, cache_get, cache_set

logger = logging.getLogger(__name__)
transaction_balance_forecast_bp = Blueprint('transaction_balance_forecast', __name__)

_MIN_ENTRIES = 2
_MAX_INTERVAL_STD_RATIO = 0.8
_HISTORY_MONTHS = 6


@transaction_balance_forecast_bp.route('/api/transactions/balance-forecast', methods=['GET'])
@token_required
def transaction_balance_forecast(payload):
    """Return monthly spending history + predicted future spending for a tab."""
    try:
        username  = payload['username']
        user_role = payload.get('role', 'limited')
        tab_id    = request.args.get('tab_id')
        months    = min(int(request.args.get('months', 3)), 12)

        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400

        cache_key = f"txbalfc:{username}:{tab_id}:{months}"
        if (cached := cache_get(cache_key)) is not None:
            return jsonify(cached)

        today  = datetime.now().date()
        cutoff = today + timedelta(days=months * 30)

        with get_db_connection() as conn:
            cur = conn.cursor(dictionary=True)
            q = ("SELECT description, amount, transaction_date, transaction_type "
                 "FROM bank_transactions "
                 "WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)")
            p = []
            if tab_id:
                q += " AND tab_id = %s";      p.append(tab_id)
            if user_role != 'shared':
                q += " AND uploaded_by = %s"; p.append(username)
            q += " ORDER BY transaction_date ASC, id ASC"
            cur.execute(q, p)
            rows = cur.fetchall()

        if not rows:
            return jsonify({
                'monthly_history': [], 'predictions': [],
                'predicted_monthly': [], 'avg_monthly_spend': 0.0,
            })

        # Decrypt all rows in one pass
        decrypted = []
        for r in rows:
            try:
                desc   = decrypt_field(r['description'])
                amount = abs(float(decrypt_field(r['amount'])))
            except Exception:
                continue
            d = r['transaction_date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            decrypted.append({
                'description': desc, 'amount': amount,
                'date': d, 'type': r['transaction_type'],
            })

        # ── Historical monthly totals (last _HISTORY_MONTHS months) ────────────
        # Walk back to the first day of the history window
        history_start = today.replace(day=1)
        for _ in range(_HISTORY_MONTHS - 1):
            history_start = (history_start - timedelta(days=1)).replace(day=1)

        monthly_totals: dict = defaultdict(float)
        for r in decrypted:
            if r['date'] >= history_start:
                monthly_totals[r['date'].strftime('%Y-%m')] += r['amount']

        monthly_history = [
            {'month': m, 'total': round(v, 2)}
            for m, v in sorted(monthly_totals.items())
        ]
        avg_monthly_spend = (
            round(sum(m['total'] for m in monthly_history) / len(monthly_history), 2)
            if monthly_history else 0.0
        )

        # ── Per-description prediction groups ──────────────────────────────────
        groups: dict = defaultdict(list)
        for r in decrypted:
            norm = re.sub(r'\s+', ' ', r['description'].strip().lower())
            groups[(norm, r['type'])].append(r)

        predictions = _build_predictions(groups, today, cutoff, months)

        # Aggregate predictions into monthly buckets for the chart
        pred_by_month: dict = defaultdict(float)
        for pred in predictions:
            pred_by_month[pred['predicted_date'][:7]] += pred['predicted_amount']

        predicted_monthly = [
            {'month': m, 'total': round(v, 2)}
            for m, v in sorted(pred_by_month.items())
        ]

        result = {
            'monthly_history':  monthly_history,
            'predictions':      predictions,
            'predicted_monthly': predicted_monthly,
            'avg_monthly_spend': avg_monthly_spend,
        }
        cache_set(cache_key, result)
        return jsonify(result)

    except Exception as exc:
        logger.error('transaction_balance_forecast error: %s', exc, exc_info=True)
        return jsonify({'error': 'Failed to generate balance forecast'}), 500


# ── Core prediction logic (mirrors transaction_predict.py) ────────────────────

def _build_predictions(groups, today, cutoff, n_ahead):
    results = []
    for (_, tx_type), entries in groups.items():
        if len(entries) < _MIN_ENTRIES:
            continue

        original_desc = entries[-1]['description']
        dates   = [e['date'] for e in entries]
        amounts = [e['amount'] for e in entries]

        intervals = [(dates[i] - dates[i - 1]).days
                     for i in range(1, len(dates))
                     if (dates[i] - dates[i - 1]).days > 0]
        if not intervals:
            continue

        avg_iv = sum(intervals) / len(intervals)
        if avg_iv < 7 or avg_iv > 365:
            continue
        if len(intervals) >= 3:
            std_iv = math.sqrt(sum((x - avg_iv) ** 2 for x in intervals) / len(intervals))
            if std_iv > avg_iv * _MAX_INTERVAL_STD_RATIO:
                continue

        amount_fc   = predict_sequence(amounts, n=n_ahead)
        interval_fc = predict_sequence([float(x) for x in intervals], n=n_ahead)
        trend = amount_fc.get('trend', 'stable')

        next_date = dates[-1]
        for i in range(n_ahead):
            iv_days   = max(7, round(interval_fc['median'][i]))
            next_date = next_date + timedelta(days=iv_days)
            if next_date > cutoff:
                break
            if next_date >= today:
                results.append({
                    'description':           original_desc,
                    'transaction_type':      tx_type,
                    'predicted_amount':      round(max(0.0, amount_fc['median'][i]), 2),
                    'predicted_amount_low':  round(max(0.0, amount_fc['low'][i]),    2),
                    'predicted_amount_high': round(max(0.0, amount_fc['high'][i]),   2),
                    'predicted_date':        next_date.isoformat(),
                    'interval_days':         round(avg_iv),
                    'confidence':            confidence_score(amount_fc, interval_fc, len(entries), i),
                    'entry_count':           len(entries),
                    'trend':                 trend,
                })

    results.sort(key=lambda p: p['predicted_date'])
    return results
