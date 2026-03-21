"""Private helper functions for the balance forecast route.

Contains prediction helpers and timeline merging logic extracted from
balance_forecast.py to keep the route file under 200 lines.
"""
import logging
import math
import re
from collections import defaultdict
from datetime import datetime, timedelta

from config import decrypt_field
from .forecast_engine import predict_sequence, confidence_score, _cache

logger = logging.getLogger(__name__)


def invalidate_balance_forecast_cache(username: str):
    """Remove all balance forecast cache entries for a user."""
    prefix = f"balancefc:{username}:"
    to_delete = [k for k in _cache if k.startswith(prefix)]
    for key in to_delete:
        _cache.pop(key, None)
    if to_delete:
        logger.debug('Invalidated %d balance forecast cache entries for %s',
                      len(to_delete), username)

_MIN_ENTRIES = 2
_MAX_INTERVAL_STD_RATIO = 0.8


def _group_and_predict(groups, today, cutoff, n_ahead, source_label):
    """Shared logic: filter groups, run EWMA forecast, emit timeline entries."""
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
        trend = amount_fc.get('trend', 'stable')

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
                    'trend': trend,
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
        norm_key = re.sub(r'\s+', ' ', r['description'].strip().lower())
        groups[(norm_key, r['type'])].append(
            {'description': r['description'], 'amount': float(r['amount']),
             'date': d, 'type': r['type']}
        )
    return _group_and_predict(groups, today, cutoff, n_ahead, 'budget')


def _predict_bank(rows, today, cutoff, n_ahead, link_type='expense'):
    if not rows:
        return []
    groups = defaultdict(list)
    for r in rows:
        try:
            desc = decrypt_field(r['description'])
            raw_amt = float(decrypt_field(r['amount']))
            amount = abs(raw_amt)
            if link_type == 'expense':
                entry_type = 'expense'
            elif link_type == 'income':
                entry_type = 'income'
            else:  # mixed
                entry_type = 'income' if raw_amt >= 0 else 'expense'
        except Exception:
            continue
        d = r['transaction_date']
        if isinstance(d, str):
            d = datetime.strptime(d[:10], '%Y-%m-%d').date()
        norm_key = re.sub(r'\s+', ' ', desc.strip().lower())
        groups[(norm_key, entry_type)].append(
            {'description': desc, 'amount': amount, 'date': d, 'type': entry_type}
        )
    return _group_and_predict(groups, today, cutoff, n_ahead, 'bank')


def _build_monthly_actuals(bank_rows, today, link_type='expense'):
    """Aggregate bank rows into monthly income/expense totals for last 12 months."""
    history_start = today.replace(day=1)
    for _ in range(11):
        history_start = (history_start - timedelta(days=1)).replace(day=1)
    monthly_actuals_map: dict = {}
    for row in bank_rows:
        try:
            raw_amt = float(decrypt_field(row['amount']))
            d = row['transaction_date']
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            if d < history_start:
                continue
            mk = d.strftime('%Y-%m')
            if mk not in monthly_actuals_map:
                monthly_actuals_map[mk] = {'expense': 0.0, 'income': 0.0}
            if link_type == 'expense':
                monthly_actuals_map[mk]['expense'] += abs(raw_amt)
            elif link_type == 'income':
                monthly_actuals_map[mk]['income'] += abs(raw_amt)
            else:  # mixed
                if raw_amt >= 0:
                    monthly_actuals_map[mk]['income'] += raw_amt
                else:
                    monthly_actuals_map[mk]['expense'] += abs(raw_amt)
        except Exception:
            continue
    return [
        {'month': mk, 'expense': round(v['expense'], 2), 'income': round(v['income'], 2),
         'net': round(v['expense'] - v['income'], 2)}
        for mk, v in sorted(monthly_actuals_map.items())
    ]


def _merge_timeline(budget_preds, bank_preds, current_balance):
    """Merge predictions into a date-sorted timeline with running balance."""
    all_preds = []
    for p in budget_preds:
        delta = p['amount'] if p['type'] == 'income' else -p['amount']
        all_preds.append({**p, 'delta': delta})
    for p in bank_preds:
        delta = p['amount'] if p['type'] == 'income' else -p['amount']
        all_preds.append({**p, 'delta': delta})

    all_preds.sort(key=lambda x: x['date'])
    running = current_balance
    for p in all_preds:
        running = round(running + p['delta'], 2)
        p['running_balance'] = running
        del p['delta']
    return all_preds
