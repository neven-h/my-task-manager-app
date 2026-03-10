"""AI-powered budget prediction — projects future recurring entries."""
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required

logger = logging.getLogger(__name__)

budget_predict_bp = Blueprint('budget_predict', __name__)


def _avg(values):
    return sum(values) / len(values) if values else 0


def _std_dev(values):
    if len(values) < 2:
        return 0
    avg = _avg(values)
    return math.sqrt(sum((v - avg) ** 2 for v in values) / (len(values) - 1))


@budget_predict_bp.route('/api/budget/predict', methods=['GET'])
@token_required
def predict_budget(payload):
    """Analyze recurring budget entries and project future occurrences.

    Query params:
        months  – how many months ahead to forecast (default 3, max 12)
        tab_id  – optional budget tab filter

    Returns a JSON array of predicted entries:
        [{ description, type, predicted_amount, predicted_date,
           confidence, interval_days, entry_count }]
    """
    try:
        username = payload['username']
        months_ahead = min(int(request.args.get('months', 3)), 12)
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                SELECT description, type, amount, entry_date
                FROM budget_entries
                WHERE owner = %s
            """
            params = [username]

            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            query += " ORDER BY entry_date ASC, id ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()

        if not rows:
            return jsonify([])

        # Group by (lowercased description, type)
        groups = defaultdict(list)
        for row in rows:
            key = (row['description'].strip().lower(), row['type'])
            groups[key].append(row)

        today = datetime.now().date()
        cutoff = today + timedelta(days=months_ahead * 30)
        predictions = []

        for (desc_lower, entry_type), entries in groups.items():
            if len(entries) < 2:
                continue

            # Parse dates and amounts
            dates = []
            amounts = []
            original_desc = entries[-1]['description']  # keep original casing

            for e in entries:
                d = e['entry_date']
                if isinstance(d, str):
                    d = datetime.strptime(d, '%Y-%m-%d').date()
                dates.append(d)
                amounts.append(float(e['amount']))

            # Calculate intervals between consecutive entries (in days)
            intervals = []
            for i in range(1, len(dates)):
                delta = (dates[i] - dates[i - 1]).days
                if delta > 0:
                    intervals.append(delta)

            if not intervals:
                continue

            avg_interval = _avg(intervals)
            interval_std = _std_dev(intervals)

            # Skip entries with very irregular intervals (std_dev > 50% of avg)
            # or intervals outside 7-365 day range
            if avg_interval < 7 or avg_interval > 365:
                continue
            if len(intervals) >= 3 and interval_std > avg_interval * 0.5:
                continue

            avg_amount = _avg(amounts)
            entry_count = len(entries)

            # Bayesian-style confidence: increases with more data points
            confidence = round(entry_count / (entry_count + 2), 2)

            # Project future entries from last known date
            last_date = dates[-1]
            next_date = last_date + timedelta(days=round(avg_interval))

            while next_date <= cutoff:
                if next_date >= today:
                    predictions.append({
                        'description': original_desc,
                        'type': entry_type,
                        'predicted_amount': round(avg_amount, 2),
                        'predicted_date': next_date.isoformat(),
                        'confidence': confidence,
                        'interval_days': round(avg_interval),
                        'entry_count': entry_count,
                    })
                next_date += timedelta(days=round(avg_interval))

        # Sort by predicted date
        predictions.sort(key=lambda p: p['predicted_date'])

        return jsonify(predictions)

    except Exception as e:
        logger.error('budget_predict error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to generate predictions'}), 500
