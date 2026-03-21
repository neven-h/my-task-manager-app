"""Bank transaction prediction — EWMA + linear trend forecasting.

Projects future recurring transactions with per-prediction confidence
intervals and trend direction (up/down/stable).
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
transaction_predict_bp = Blueprint('transaction_predict', __name__)

_MIN_ENTRIES = 2   # need at least 2 occurrences to detect a pattern
_MAX_INTERVAL_STD_RATIO = 0.8  # skip series whose timing is too chaotic


@transaction_predict_bp.route('/api/transactions/predict', methods=['GET'])
@token_required
def predict_transactions(payload):
    """Detect recurring transactions and project future occurrences."""
    try:
        username  = payload['username']
        user_role = payload.get('role', 'limited')
        months    = min(int(request.args.get('months', 3)), 12)
        tab_id    = request.args.get('tab_id')

        cache_key = f"txpredict:{username}:{tab_id}:{months}"
        if (cached := cache_get(cache_key)) is not None:
            return jsonify(cached)

        today  = datetime.now().date()
        cutoff = today + timedelta(days=months * 30)

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            q = ("SELECT description, amount, amount_plain, transaction_date, transaction_type "
                 "FROM bank_transactions "
                 "WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)")
            p = []
            if tab_id:
                q += " AND tab_id = %s";      p.append(tab_id)
            if user_role != 'shared':
                q += " AND uploaded_by = %s"; p.append(username)
            q += " ORDER BY transaction_date ASC, id ASC"
            cursor.execute(q, p)
            rows = cursor.fetchall()

        if not rows:
            return jsonify([])

        groups: dict = defaultdict(list)
        for row in rows:
            try:
                desc   = decrypt_field(row['description'])
                amount = float(row['amount_plain']) if row.get('amount_plain') is not None else float(decrypt_field(row['amount']))
            except Exception:
                continue
            norm_key = re.sub(r'\s+', ' ', desc.strip().lower())
            groups[(norm_key, row['transaction_type'])].append(
                {'description': desc, 'amount': amount,
                 'date': row['transaction_date'], 'type': row['transaction_type']}
            )

        results = _build_predictions(groups, today, cutoff, months)
        cache_set(cache_key, results)
        return jsonify(results)

    except Exception as exc:
        logger.error('transaction_predict error: %s', exc, exc_info=True)
        return jsonify({'error': 'Failed to generate predictions'}), 500


# ── Core logic ────────────────────────────────────────────────────────────────
def _build_predictions(groups, today, cutoff, n_ahead):
    results = []

    for (_, tx_type), entries in groups.items():
        if len(entries) < _MIN_ENTRIES:
            continue

        original_desc = entries[-1]['description']
        dates, amounts = [], []
        for e in entries:
            d = e['date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            dates.append(d)
            amounts.append(e['amount'])

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
        trend = amount_fc.get('trend', 'stable')

        next_date = dates[-1]
        for i in range(n_ahead):
            iv_days   = max(7, round(interval_fc['median'][i]))
            next_date = next_date + timedelta(days=iv_days)
            if next_date > cutoff:
                break
            if next_date >= today:
                pred_amt = round(max(0.0, amount_fc['median'][i]), 2)
                results.append({
                    'description':          original_desc,
                    'transaction_type':     tx_type,
                    'predicted_amount':     pred_amt,
                    'predicted_amount_low': round(max(0.0, amount_fc['low'][i]),  2),
                    'predicted_amount_high':round(max(0.0, amount_fc['high'][i]), 2),
                    'predicted_date':       next_date.isoformat(),
                    'interval_days':        iv_days,
                    'confidence':           confidence_score(amount_fc, interval_fc, len(entries), i),
                    'entry_count':          len(entries),
                    'trend':                trend,
                })

    results.sort(key=lambda p: p['predicted_date'])
    return results
