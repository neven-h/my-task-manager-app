"""AI-powered transaction prediction — projects future recurring bank transactions."""
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required, decrypt_field

logger = logging.getLogger(__name__)
transaction_predict_bp = Blueprint('transaction_predict', __name__)


def _avg(values):
    return sum(values) / len(values) if values else 0


def _std_dev(values):
    if len(values) < 2:
        return 0
    avg = _avg(values)
    return math.sqrt(sum((v - avg) ** 2 for v in values) / (len(values) - 1))


@transaction_predict_bp.route('/api/transactions/predict', methods=['GET'])
@token_required
def predict_transactions(payload):
    """Detect recurring bank transactions and project future occurrences.

    Query params:
        months  – forecast horizon in months (default 3, max 12)
        tab_id  – transaction tab to analyse (required for useful results)

    Returns JSON array:
        [{ description, transaction_type, predicted_amount, predicted_date,
           confidence, interval_days, entry_count }]
    """
    try:
        username = payload['username']
        user_role = payload.get('role', 'limited')
        months_ahead = min(int(request.args.get('months', 3)), 12)
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            query = "SELECT description, amount, transaction_date, transaction_type FROM bank_transactions WHERE 1=1"
            params = []
            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)
            if user_role != 'shared':
                query += " AND uploaded_by = %s"
                params.append(username)
            query += " ORDER BY transaction_date ASC, id ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()

        if not rows:
            return jsonify([])

        # Decrypt and group by (normalised description, transaction_type)
        groups = defaultdict(list)
        for row in rows:
            try:
                desc = decrypt_field(row['description'])
                amount = float(decrypt_field(row['amount']))
            except Exception:
                continue
            groups[(desc.strip().lower(), row['transaction_type'])].append({
                'description': desc, 'amount': amount,
                'date': row['transaction_date'], 'type': row['transaction_type'],
            })

        today = datetime.now().date()
        cutoff = today + timedelta(days=months_ahead * 30)
        predictions = []

        for (_, tx_type), entries in groups.items():
            if len(entries) < 2:
                continue

            dates, amounts = [], []
            original_desc = entries[-1]['description']
            for e in entries:
                d = e['date']
                if isinstance(d, str):
                    d = datetime.strptime(d[:10], '%Y-%m-%d').date()
                dates.append(d)
                amounts.append(e['amount'])

            intervals = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates)) if (dates[i] - dates[i - 1]).days > 0]
            if not intervals:
                continue

            avg_interval = _avg(intervals)
            if avg_interval < 7 or avg_interval > 365:
                continue
            if len(intervals) >= 3 and _std_dev(intervals) > avg_interval * 0.5:
                continue

            avg_amount = _avg(amounts)
            entry_count = len(entries)
            confidence = round(entry_count / (entry_count + 2), 2)
            next_date = dates[-1] + timedelta(days=round(avg_interval))

            while next_date <= cutoff:
                if next_date >= today:
                    predictions.append({
                        'description': original_desc,
                        'transaction_type': tx_type,
                        'predicted_amount': round(avg_amount, 2),
                        'predicted_date': next_date.isoformat(),
                        'confidence': confidence,
                        'interval_days': round(avg_interval),
                        'entry_count': entry_count,
                    })
                next_date += timedelta(days=round(avg_interval))

        predictions.sort(key=lambda p: p['predicted_date'])
        return jsonify(predictions)

    except Exception as e:
        logger.error('transaction_predict error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to generate predictions'}), 500
