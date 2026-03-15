"""Pure helper functions for transaction_insights — no Flask or DB dependencies."""
import re
from datetime import date


def _normalize(desc: str) -> str:
    return re.sub(r'\s+', ' ', desc.strip().lower())


def _fmt_month(my: str) -> str:
    """'2025-12' → 'Dec 2025'."""
    try:
        parts = my.split('-')
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
