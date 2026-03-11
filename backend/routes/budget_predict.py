"""Budget prediction using Amazon Chronos deep learning.

Same engine as transaction_predict — projects recurring budget entries
forward with per-prediction amount confidence intervals.
"""
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from .forecast_engine import predict_sequence, confidence_score, cache_get, cache_set

logger = logging.getLogger(__name__)
budget_predict_bp = Blueprint('budget_predict', __name__)

_MIN_ENTRIES = 3
_MAX_INTERVAL_STD_RATIO = 0.6


@budget_predict_bp.route('/api/budget/predict', methods=['GET'])
@token_required
def predict_budget(payload):
    """Analyse recurring budget entries and project future occurrences via Chronos."""
    try:
        username = payload['username']
        months   = min(int(request.args.get('months', 3)), 12)
        tab_id   = request.args.get('tab_id')

        cache_key = f"budgetpredict:{username}:{tab_id}:{months}"
        if (cached := cache_get(cache_key)) is not None:
            return jsonify(cached)

        today  = datetime.now().date()
        cutoff = today + timedelta(days=months * 30)

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            q = "SELECT description, type, amount, entry_date FROM budget_entries WHERE owner = %s"
            p = [username]
            if tab_id:
                q += " AND tab_id = %s"; p.append(tab_id)
            q += " ORDER BY entry_date ASC, id ASC"
            cursor.execute(q, p)
            rows = cursor.fetchall()

        if not rows:
            return jsonify([])

        groups: dict = defaultdict(list)
        for row in rows:
            groups[(row['description'].strip().lower(), row['type'])].append(row)

        results = _build_predictions(groups, today, cutoff, months)
        cache_set(cache_key, results)
        return jsonify(results)

    except Exception as exc:
        logger.error('budget_predict error: %s', exc, exc_info=True)
        return jsonify({'error': 'Failed to generate predictions'}), 500


# ── Core logic ────────────────────────────────────────────────────────────────
def _build_predictions(groups, today, cutoff, n_ahead):
    results = []

    for (_, entry_type), entries in groups.items():
        if len(entries) < _MIN_ENTRIES:
            continue

        original_desc = entries[-1]['description']
        dates, amounts = [], []
        for e in entries:
            d = e['entry_date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            dates.append(d)
            amounts.append(float(e['amount']))

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

        amount_fc   = predict_sequence(amounts,                n=n_ahead)
        interval_fc = predict_sequence([float(x) for x in intervals], n=n_ahead)

        next_date = dates[-1]
        for i in range(n_ahead):
            iv_days   = max(7, round(interval_fc['median'][i]))
            next_date = next_date + timedelta(days=iv_days)
            if next_date > cutoff:
                break
            if next_date >= today:
                results.append({
                    'description':           original_desc,
                    'type':                  entry_type,
                    'predicted_amount':      round(max(0.0, amount_fc['median'][i]), 2),
                    'predicted_amount_low':  round(max(0.0, amount_fc['low'][i]),    2),
                    'predicted_amount_high': round(max(0.0, amount_fc['high'][i]),   2),
                    'predicted_date':        next_date.isoformat(),
                    'interval_days':         iv_days,
                    'confidence':            confidence_score(amount_fc, interval_fc, len(entries), i),
                    'entry_count':           len(entries),
                })

    results.sort(key=lambda p: p['predicted_date'])
    return results
