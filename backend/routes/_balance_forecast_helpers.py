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
            raw_amt = float(r['amount_plain']) if r.get('amount_plain') is not None else float(decrypt_field(r['amount']))
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
            raw_amt = float(row['amount_plain']) if row.get('amount_plain') is not None else float(decrypt_field(row['amount']))
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


def _split_fixed_variable_monthly(budget_rows, bank_rows, today, n_ahead, link_type='expense'):
    """Project the next n_ahead months split into fixed vs. variable expense.

    Fixed = SUM(amount WHERE is_fixed) for the most recent full month,
            projected forward verbatim each month (these are user-flagged
            recurring obligations: הוראות קבע + recurring transfers).
    Variable = avg(non-fixed expense) over the last 3 full months.

    Returns a list of dicts: { month, fixed, variable, total }.
    """
    if today is None:
        today = datetime.now().date()

    def _month_floor(yr, mo):
        return datetime(yr, mo, 1).date()

    # Build last-3-months window (full calendar months ending with previous month).
    cur_first = _month_floor(today.year, today.month)
    months = []
    yr, mo = today.year, today.month
    for _ in range(3):
        mo -= 1
        if mo == 0:
            mo = 12
            yr -= 1
        months.append((yr, mo))
    months.reverse()  # oldest first
    month_keys = [f'{y:04d}-{m:02d}' for y, m in months]

    fixed_by_month = {mk: 0.0 for mk in month_keys}
    variable_by_month = {mk: 0.0 for mk in month_keys}

    def _to_date(v):
        if v is None:
            return None
        if isinstance(v, str):
            return datetime.strptime(v[:10], '%Y-%m-%d').date()
        return v

    for r in (budget_rows or []):
        if r.get('type') != 'outcome':
            continue
        d = _to_date(r.get('entry_date'))
        if d is None:
            continue
        mk = d.strftime('%Y-%m')
        if mk not in fixed_by_month:
            continue
        try:
            amt = float(r.get('amount') or 0)
        except Exception:
            continue
        if bool(r.get('is_fixed')):
            fixed_by_month[mk] += amt
        else:
            variable_by_month[mk] += amt

    for r in (bank_rows or []):
        d = _to_date(r.get('transaction_date'))
        if d is None:
            continue
        mk = d.strftime('%Y-%m')
        if mk not in fixed_by_month:
            continue
        try:
            raw = float(r['amount_plain']) if r.get('amount_plain') is not None else float(decrypt_field(r['amount']))
        except Exception:
            continue
        abs_amt = abs(raw)
        # Mirror link_type semantics from _predict_bank.
        if link_type == 'expense':
            is_expense = True
        elif link_type == 'income':
            is_expense = False
        else:  # mixed
            is_expense = raw < 0
        if not is_expense:
            continue
        if bool(r.get('is_fixed')):
            fixed_by_month[mk] += abs_amt
        else:
            variable_by_month[mk] += abs_amt

    # Fixed projection: most recent non-zero month, else avg of last 3 months.
    recent_fixed = fixed_by_month[month_keys[-1]]
    if recent_fixed <= 0:
        nonzero = [v for v in fixed_by_month.values() if v > 0]
        fixed_proj = (sum(nonzero) / len(nonzero)) if nonzero else 0.0
    else:
        fixed_proj = recent_fixed

    var_values = list(variable_by_month.values())
    variable_proj = (sum(var_values) / len(var_values)) if var_values else 0.0

    out = []
    yr, mo = today.year, today.month
    for i in range(n_ahead):
        mk = f'{yr:04d}-{mo:02d}'
        out.append({
            'month': mk,
            'fixed': round(fixed_proj, 2),
            'variable': round(variable_proj, 2),
            'total': round(fixed_proj + variable_proj, 2),
        })
        mo += 1
        if mo > 12:
            mo = 1
            yr += 1
    return out


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
