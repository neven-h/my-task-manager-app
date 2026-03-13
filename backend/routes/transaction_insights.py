"""Spending insights — aggregate analytics for bank transactions.

Provides meaningful category-level insights: monthly averages, top categories
by spend, peak months, trend analysis, and natural language pattern summaries.
"""
import re
import statistics
from collections import defaultdict
from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field
from mysql.connector import Error
from concurrent.futures import ThreadPoolExecutor
from .forecast_engine import cache_get, cache_set, _ols_slope, _trend_label

transaction_insights_bp = Blueprint('transaction_insights', __name__)

_TOP_N = 5  # number of top categories to return


def _normalize(desc: str) -> str:
    return re.sub(r'\s+', ' ', desc.strip().lower())


def _fmt_month(my: str) -> str:
    """'2025-12' → 'Dec 2025'."""
    try:
        parts = my.split('-')
        from datetime import date
        d = date(int(parts[0]), int(parts[1]), 1)
        return d.strftime('%b %Y')
    except Exception:
        return my


def _generate_patterns(monthly_totals, monthly_avg, top_cats, total_spend):
    """Generate structured insight objects with text + data."""
    patterns = []
    if not monthly_totals:
        return patterns

    # 1. Peak month
    peak = max(monthly_totals, key=lambda m: m['total'])
    if monthly_avg > 0:
        pct_above = ((peak['total'] - monthly_avg) / monthly_avg) * 100
        if pct_above > 15:
            patterns.append({
                'text': f"{_fmt_month(peak['month_year'])} was your highest month — ₪{peak['total']:,.0f} ({pct_above:.0f}% above avg)",
                'type': 'peak_month',
                'amount': peak['total'],
                'month': peak['month_year'],
            })

    # 2. Lowest month
    low = min(monthly_totals, key=lambda m: m['total'])
    if monthly_avg > 0 and len(monthly_totals) > 2:
        pct_below = ((monthly_avg - low['total']) / monthly_avg) * 100
        if pct_below > 15:
            patterns.append({
                'text': f"{_fmt_month(low['month_year'])} was your lowest — ₪{low['total']:,.0f} ({pct_below:.0f}% below avg)",
                'type': 'low_month',
                'amount': low['total'],
                'month': low['month_year'],
            })

    # 3. Category trends with data
    for cat in top_cats[:3]:
        if cat['trend'] in ('up', 'down'):
            direction = 'increasing' if cat['trend'] == 'up' else 'decreasing'
            patterns.append({
                'text': f"{cat['description']} is {direction} — avg ₪{cat['avg_per_month']:,.0f}/mo",
                'type': 'category_trend',
                'category': cat['description'],
                'trend': cat['trend'],
                'avg': cat['avg_per_month'],
            })

    # 4. Concentration ratio
    if len(top_cats) >= 3 and total_spend > 0:
        top3_total = sum(c['total'] for c in top_cats[:3])
        ratio = (top3_total / total_spend) * 100
        if ratio > 40:
            names = ', '.join(c['description'] for c in top_cats[:3])
            patterns.append({
                'text': f"Top 3 categories = {ratio:.0f}% of spending: {names}",
                'type': 'concentration',
                'ratio': round(ratio, 1),
            })

    # 5. Recent trend (last 3 months)
    if len(monthly_totals) >= 3:
        recent = [m['total'] for m in monthly_totals[-3:]]
        if recent[-1] > recent[0] * 1.15:
            pct = ((recent[-1] - recent[0]) / recent[0]) * 100
            patterns.append({
                'text': f"Spending up {pct:.0f}% over the last 3 months",
                'type': 'recent_trend',
                'direction': 'up',
                'pct_change': round(pct, 1),
            })
        elif recent[-1] < recent[0] * 0.85:
            pct = ((recent[0] - recent[-1]) / recent[0]) * 100
            patterns.append({
                'text': f"Spending down {pct:.0f}% over the last 3 months",
                'type': 'recent_trend',
                'direction': 'down',
                'pct_change': round(pct, 1),
            })

    return patterns[:5]  # cap at 5


def _build_summary(monthly_avg, month_count, top_cats, monthly_totals):
    """Build a 2-3 sentence summary with the most important numbers."""
    parts = [f"You spend an average of ₪{monthly_avg:,.0f}/month based on {month_count} months of data."]
    if top_cats:
        parts.append(
            f"Your biggest expense category is {top_cats[0]['description']} "
            f"(₪{top_cats[0]['avg_per_month']:,.0f}/mo)."
        )
    if len(monthly_totals) >= 3:
        recent = [m['total'] for m in monthly_totals[-3:]]
        if recent[-1] > recent[0] * 1.1:
            pct = ((recent[-1] - recent[0]) / recent[0]) * 100
            parts.append(f"Spending is up {pct:.0f}% recently.")
        elif recent[-1] < recent[0] * 0.9:
            pct = ((recent[0] - recent[-1]) / recent[0]) * 100
            parts.append(f"Spending is down {pct:.0f}% recently.")
    return ' '.join(parts)


@transaction_insights_bp.route('/api/transactions/insights', methods=['GET'])
@token_required
def get_spending_insights(payload):
    """Aggregate spending insights: monthly averages, top categories, patterns."""
    try:
        username = payload['username']
        user_role = payload['role']
        tab_id = request.args.get('tab_id')
        top_n = int(request.args.get('top_n', _TOP_N))

        if not tab_id or tab_id in ('null', 'undefined'):
            return jsonify({'error': 'tab_id required'}), 400

        # Check cache
        cache_key = f"txinsights:{username}:{tab_id}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify(cached)

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            filters = ["tab_id = %s"]
            params = [tab_id]
            if user_role != 'shared':
                filters.append("uploaded_by = %s")
                params.append(username)

            where_clause = " AND ".join(filters)

            cursor.execute(f"""
                SELECT amount, description, transaction_date, month_year
                FROM bank_transactions
                WHERE {where_clause}
                ORDER BY transaction_date
            """, params)
            rows = cursor.fetchall()

        if not rows:
            empty = {
                'monthly_avg': 0, 'month_count': 0, 'monthly_totals': [],
                'top_categories': [], 'patterns': [], 'summary': '',
                'biggest_month': None, 'lowest_month': None,
            }
            cache_set(cache_key, empty)
            return jsonify(empty)

        # Decrypt amounts and descriptions in parallel
        def _decrypt_row(row):
            try:
                amt = float(decrypt_field(row['amount']) or 0)
            except (ValueError, TypeError):
                amt = 0.0
            try:
                desc = decrypt_field(row['description']) or ''
            except Exception:
                desc = ''
            return amt, desc

        workers = min(len(rows), 8)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            decrypted = list(ex.map(_decrypt_row, rows))

        # Single-pass aggregation
        cat_months = defaultdict(lambda: defaultdict(float))  # norm_desc -> month -> total
        cat_orig = {}       # norm_desc -> latest original description
        cat_count = defaultdict(int)  # norm_desc -> tx count
        monthly = defaultdict(float)  # month_year -> total expense

        for row, (amt, desc) in zip(rows, decrypted):
            if amt <= 0:
                continue  # skip income/zero — only expenses
            norm = _normalize(desc)
            my = row['month_year']

            cat_months[norm][my] += amt
            cat_orig[norm] = desc  # overwrite with latest
            cat_count[norm] += 1
            monthly[my] += amt

        # Monthly totals sorted chronologically
        monthly_sorted = sorted(monthly.items(), key=lambda x: x[0])
        monthly_totals = [{'month_year': m, 'total': round(t, 2)} for m, t in monthly_sorted]
        month_count = len(monthly_totals)
        total_spend = sum(t for _, t in monthly_sorted)
        monthly_avg = round(total_spend / month_count, 2) if month_count else 0

        # Top categories
        cat_totals = [(norm, sum(months.values())) for norm, months in cat_months.items()]
        cat_totals.sort(key=lambda x: x[1], reverse=True)

        top_categories = []
        for norm, total in cat_totals[:top_n]:
            months_data = cat_months[norm]
            # Chronological monthly values for trend
            chrono = sorted(months_data.items(), key=lambda x: x[0])
            monthly_values = [v for _, v in chrono]

            # Trend
            if len(monthly_values) >= 2:
                slope = _ols_slope(monthly_values)
                mean_val = statistics.mean(monthly_values)
                trend = _trend_label(slope, mean_val)
            else:
                trend = 'stable'

            # Peak month
            peak_m = max(months_data, key=months_data.get)

            # Months active
            months_active = len(months_data)

            top_categories.append({
                'description': cat_orig[norm],
                'total': round(total, 2),
                'avg_per_month': round(total / months_active, 2) if months_active else 0,
                'tx_count': cat_count[norm],
                'peak_month': peak_m,
                'peak_amount': round(months_data[peak_m], 2),
                'trend': trend,
                'monthly': [{'month_year': m, 'total': round(v, 2)} for m, v in chrono],
            })

        patterns = _generate_patterns(monthly_totals, monthly_avg, top_categories, total_spend)
        summary = _build_summary(monthly_avg, month_count, top_categories, monthly_totals)

        # Biggest / lowest month
        peak_m = max(monthly_totals, key=lambda m: m['total'])
        low_m = min(monthly_totals, key=lambda m: m['total'])
        biggest_month = {'month': peak_m['month_year'], 'amount': peak_m['total']}
        lowest_month = {'month': low_m['month_year'], 'amount': low_m['total']}

        result = {
            'monthly_avg': monthly_avg,
            'month_count': month_count,
            'total_spend': round(total_spend, 2),
            'monthly_totals': monthly_totals,
            'top_categories': top_categories,
            'patterns': patterns,
            'summary': summary,
            'biggest_month': biggest_month,
            'lowest_month': lowest_month,
        }
        cache_set(cache_key, result)
        return jsonify(result)

    except Error as e:
        current_app.logger.error('transaction_insights db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
