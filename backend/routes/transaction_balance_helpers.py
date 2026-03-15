"""Helper functions for transaction_balance_forecast.py."""
import math
import re
from datetime import timedelta

from .forecast_engine import predict_sequence, confidence_score

_MIN_ENTRIES = 2
_MAX_INTERVAL_STD_RATIO = 0.8


# ── Simple OLS slope helper ───────────────────────────────────────────────────

def _simple_slope(values):
    n = len(values)
    if n < 2:
        return 0.0
    sx = sum(range(n)); sy = sum(values)
    sxx = sum(i * i for i in range(n))
    sxy = sum(i * values[i] for i in range(n))
    denom = n * sxx - sx * sx
    return (n * sxy - sx * sy) / denom if denom else 0.0


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
                    'is_income':             tx_type == 'transfer_in',
                })

    results.sort(key=lambda p: p['predicted_date'])
    return results
