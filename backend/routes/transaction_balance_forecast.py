"""Bank transaction balance forecast.

Returns historical monthly spending (last 6 months) + AI-predicted future
spending, so the frontend can project a running account balance for any
starting amount the user supplies.
"""
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field
from .forecast_engine import cache_get, cache_set
from .transaction_balance_helpers import _simple_slope, _build_predictions

logger = logging.getLogger(__name__)
transaction_balance_forecast_bp = Blueprint('transaction_balance_forecast', __name__)

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
                raw_amount = abs(float(decrypt_field(r['amount'])))
                is_income = r['transaction_type'] == 'transfer_in'
            except Exception:
                continue
            d = r['transaction_date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            decrypted.append({
                'description': desc, 'amount': raw_amount,
                'date': d, 'type': r['transaction_type'],
                'is_income': is_income,
            })

        # ── Historical monthly totals (last _HISTORY_MONTHS months) ────────────
        # Walk back to the first day of the history window
        history_start = today.replace(day=1)
        for _ in range(_HISTORY_MONTHS - 1):
            history_start = (history_start - timedelta(days=1)).replace(day=1)

        monthly_totals: dict = defaultdict(float)
        monthly_income_map: dict = defaultdict(float)
        for r in decrypted:
            if r['date'] >= history_start:
                month_key = r['date'].strftime('%Y-%m')
                if r['is_income']:
                    monthly_totals[month_key] -= r['amount']   # income reduces net outflow
                    monthly_income_map[month_key] += r['amount']
                else:
                    monthly_totals[month_key] += r['amount']

        monthly_history = [
            {'month': m, 'total': round(v, 2)}
            for m, v in sorted(monthly_totals.items())
        ]
        positive_months = [m['total'] for m in monthly_history if m['total'] > 0]
        avg_monthly_spend = round(sum(positive_months) / len(positive_months), 2) if positive_months else 0.0

        # ── Spending momentum (OLS slope on monthly history) ───────────────────
        momentum = 'stable'
        if len(monthly_history) >= 3:
            vals = [m['total'] for m in monthly_history]
            slope = _simple_slope(vals)
            mean_v = sum(vals) / len(vals)
            ratio = slope / max(abs(mean_v), 0.01)
            if ratio > 0.05:
                momentum = 'increasing'
            elif ratio < -0.05:
                momentum = 'decreasing'

        # ── Anomaly detection: current-month spikes vs historical avg ──────────
        current_month_key = today.strftime('%Y-%m')
        # Build per-description historical averages (exclude current month)
        desc_monthly: dict = defaultdict(lambda: defaultdict(float))
        for r in decrypted:
            month_key = r['date'].strftime('%Y-%m')
            norm = re.sub(r'\s+', ' ', r['description'].strip().lower())
            desc_monthly[norm][month_key] += r['amount']

        anomalies = []
        for norm, monthly_map in desc_monthly.items():
            # Skip income transactions for anomaly detection
            if any(r['is_income'] for r in decrypted if re.sub(r'\s+', ' ', r['description'].strip().lower()) == norm):
                continue
            if current_month_key not in monthly_map:
                continue
            current_val = monthly_map[current_month_key]
            historic = [v for k, v in monthly_map.items() if k != current_month_key]
            if len(historic) < 2:
                continue
            hist_avg = sum(historic) / len(historic)
            if hist_avg < 50:       # ignore noise-level categories
                continue
            pct_above = (current_val - hist_avg) / hist_avg
            if pct_above >= 0.25 and (current_val - hist_avg) >= 80:
                # Find original casing
                original_desc = next(
                    (r['description'] for r in decrypted
                     if re.sub(r'\s+', ' ', r['description'].strip().lower()) == norm
                     and r['date'].strftime('%Y-%m') == current_month_key),
                    norm
                )
                anomalies.append({
                    'description': original_desc,
                    'current':     round(current_val, 2),
                    'avg':         round(hist_avg, 2),
                    'pct_above':   round(pct_above * 100),
                })
        # Sort by pct_above descending, cap at 5
        anomalies.sort(key=lambda a: a['pct_above'], reverse=True)
        anomalies = anomalies[:5]

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
            'monthly_history':   monthly_history,
            'predictions':       predictions,
            'predicted_monthly': predicted_monthly,
            'avg_monthly_spend': avg_monthly_spend,
            'momentum':          momentum,
            'anomalies':         anomalies,
        }
        cache_set(cache_key, result)
        return jsonify(result)

    except Exception as exc:
        logger.error('transaction_balance_forecast error: %s', exc, exc_info=True)
        return jsonify({'error': 'Failed to generate balance forecast'}), 500
