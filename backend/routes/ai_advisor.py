"""AI Financial Advisor — real Claude AI analysis of user spending patterns.

Gathers structured spending data from the DB (monthly totals, top categories,
anomalies) and sends it to Claude via tool_use to produce a typed financial
analysis: summary, recommendations, risk alerts, savings tips.

Cache TTL follows forecast_engine.CACHE_TTL (5 minutes).
Model is configurable via CLAUDE_MODEL env var (default: claude-opus-4-6).
"""
import logging
import os
from collections import defaultdict
from datetime import date
from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required, decrypt_field
from mysql.connector import Error
from concurrent.futures import ThreadPoolExecutor
from .forecast_engine import cache_get, cache_set
from .transaction_insights_helpers import _normalize

try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

logger = logging.getLogger(__name__)

ai_advisor_bp = Blueprint('ai_advisor', __name__)

_TOP_N = 5
_DEFAULT_MODEL = "claude-haiku-4-5"

# ── Claude tool definition for structured output ──────────────────────────────

_ANALYSIS_TOOL = {
    "name": "provide_financial_analysis",
    "description": "Structured financial analysis. Be terse — every string must be short.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "One sentence, max 20 words. State the key financial reality.",
            },
            "recommendations": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Exactly 3 items. Max 10 words each. Start with a verb. No sub-clauses.",
            },
            "risk_alerts": {
                "type": "array",
                "items": {"type": "string"},
                "description": "0-2 items. Max 10 words each. Only real risks.",
            },
            "savings_opportunities": {
                "type": "array",
                "items": {"type": "string"},
                "description": "0-2 items. Max 10 words each. Specific and actionable.",
            },
            "spending_verdict": {
                "type": "string",
                "enum": ["stable", "rising", "volatile"],
                "description": "Expense pattern only: stable=consistent, rising=trending up, volatile=erratic.",
            },
        },
        "required": [
            "summary", "recommendations", "risk_alerts",
            "savings_opportunities", "spending_verdict",
        ],
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_prompt(monthly_totals: list, top_cats: list, avg: float,
                  anomalies: list, month_count: int) -> str:
    """Build a concise financial data summary for the Claude prompt."""
    lines = [
        f"FINANCIAL DATA SUMMARY (last {month_count} months, currency: ₪)",
        "",
        f"Average monthly spending: ₪{avg:,.2f}",
        "",
    ]

    if monthly_totals:
        lines.append("MONTHLY SPENDING HISTORY:")
        for m in monthly_totals[-6:]:  # last 6 months
            lines.append(f"  {m['month_year']}: ₪{m['total']:,.2f}")
        lines.append("")

    if top_cats:
        lines.append("TOP SPENDING CATEGORIES:")
        for c in top_cats:
            trend_arrow = {"up": "↑", "down": "↓", "stable": "→"}.get(c.get("trend", "stable"), "→")
            lines.append(
                f"  {c['description']}: ₪{c['total']:,.2f} total "
                f"(avg ₪{c['avg_per_month']:,.2f}/mo, trend {trend_arrow})"
            )
        lines.append("")

    if anomalies:
        lines.append("UNUSUAL SPENDING THIS PERIOD:")
        for a in anomalies:
            lines.append(
                f"  {a['description']}: ₪{a['current']:,.2f} "
                f"(avg is ₪{a['avg']:,.2f}, +{a['pct_above']:.0f}% above average)"
            )
        lines.append("")

    return "\n".join(lines)


def _fetch_spending_data(username: str, user_role: str, tab_id: str) -> dict:
    """Query DB for monthly totals and top categories. Returns dict with data."""
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        filters = ["tab_id = %s"]
        params = [tab_id]
        if user_role != 'shared':
            filters.append("uploaded_by = %s")
            params.append(username)
        where = " AND ".join(filters)

        cursor.execute(f"""
            SELECT amount_plain, description, month_year, transaction_date
            FROM bank_transactions
            WHERE {where}
            ORDER BY transaction_date
        """, params)
        rows = cursor.fetchall()

    if not rows:
        return {}

    # Decrypt descriptions in parallel
    def _dec(row):
        try:
            amt = float(row['amount_plain']) if row.get('amount_plain') is not None else 0.0
        except (ValueError, TypeError):
            amt = 0.0
        try:
            desc = decrypt_field(row['description']) or ''
        except Exception:
            desc = ''
        return amt, desc

    workers = min(len(rows), 8)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        decrypted = list(ex.map(_dec, rows))

    cat_months: dict = defaultdict(lambda: defaultdict(float))
    cat_orig: dict = {}
    monthly: dict = defaultdict(float)

    for row, (amt, desc) in zip(rows, decrypted):
        if amt <= 0:
            continue
        norm = _normalize(desc)
        my = row['month_year']
        cat_months[norm][my] += amt
        cat_orig[norm] = desc
        monthly[my] += amt

    monthly_sorted = sorted(monthly.items())
    monthly_totals = [{'month_year': m, 'total': round(t, 2)} for m, t in monthly_sorted]
    month_count = len(monthly_totals)
    total_spend = sum(t for _, t in monthly_sorted)
    avg = round(total_spend / month_count, 2) if month_count else 0

    # Top N categories
    cat_totals = sorted(
        [(norm, sum(v.values())) for norm, v in cat_months.items()],
        key=lambda x: x[1], reverse=True
    )
    top_cats = []
    for norm, total in cat_totals[:_TOP_N]:
        months_data = cat_months[norm]
        active = len(months_data)
        # Rough trend: compare last month to average
        chrono = sorted(months_data.items())
        recent = chrono[-1][1] if chrono else 0
        avg_cat = total / active if active else 0
        if recent > avg_cat * 1.15:
            trend = 'up'
        elif recent < avg_cat * 0.85:
            trend = 'down'
        else:
            trend = 'stable'
        top_cats.append({
            'description': cat_orig[norm],
            'total': round(total, 2),
            'avg_per_month': round(avg_cat, 2),
            'trend': trend,
        })

    # Anomalies: categories where most recent month > 1.5× their own average
    anomalies = []
    for norm, total_cat in cat_totals:
        months_data = cat_months[norm]
        if len(months_data) < 2:
            continue
        chrono = sorted(months_data.items())
        recent_m, recent_v = chrono[-1]
        # Exclude most recent from average
        prior_vals = [v for _, v in chrono[:-1]]
        prior_avg = sum(prior_vals) / len(prior_vals) if prior_vals else 0
        if prior_avg > 0 and recent_v > prior_avg * 1.5:
            anomalies.append({
                'description': cat_orig[norm],
                'current': round(recent_v, 2),
                'avg': round(prior_avg, 2),
                'pct_above': round((recent_v / prior_avg - 1) * 100),
            })
    anomalies.sort(key=lambda x: x['pct_above'], reverse=True)

    return {
        'monthly_totals': monthly_totals,
        'top_cats': top_cats,
        'anomalies': anomalies[:3],
        'avg': avg,
        'month_count': month_count,
    }


def _call_claude(prompt_text: str) -> dict:
    """Call Claude with tool_use and return the validated structured analysis."""
    model = os.environ.get('CLAUDE_MODEL', _DEFAULT_MODEL)
    client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

    today = date.today().strftime('%B %d, %Y')
    system = (
        "You are analyzing expense transactions only — there is NO income data. "
        "Do not comment on financial health or savings rate. "
        "Focus only on expense patterns, anomalies, and ways to reduce costs. "
        "Respond with very short, punchy text. No sub-clauses. Every bullet max 10 words. "
        f"Currency ₪. Today {today}."
    )

    response = client.messages.create(
        model=model,
        max_tokens=400,
        system=system,
        tools=[_ANALYSIS_TOOL],
        tool_choice={"type": "tool", "name": "provide_financial_analysis"},
        messages=[{"role": "user", "content": prompt_text}],
    )

    # Extract the tool_use block input
    for block in response.content:
        if block.type == "tool_use" and block.name == "provide_financial_analysis":
            result = block.input
            # Validate required fields are present and non-empty
            required = ['summary', 'recommendations', 'savings_opportunities', 'spending_verdict']
            missing = [f for f in required if not result.get(f)]
            if missing:
                logger.warning('[ai_advisor] Claude response missing fields: %s', missing)
            return result

    logger.error('[ai_advisor] Claude did not return tool_use block. content: %s', response.content)
    raise ValueError("Claude did not return the expected tool_use block")


# ── Route ─────────────────────────────────────────────────────────────────────

@ai_advisor_bp.route('/api/ai/financial-advisor', methods=['GET'])
@token_required
def get_financial_advisor(payload):
    """Return Claude AI financial analysis for the user's transaction tab."""
    if not _ANTHROPIC_AVAILABLE:
        return jsonify({'error': 'AI advisor unavailable', 'fallback': True,
                        'reason': 'anthropic package not installed'}), 503

    if not os.environ.get('ANTHROPIC_API_KEY'):
        return jsonify({'error': 'AI advisor unavailable', 'fallback': True,
                        'reason': 'ANTHROPIC_API_KEY not configured'}), 503

    try:
        username = payload['username']
        user_role = payload.get('role', 'user')
        tab_id = request.args.get('tab_id')
        force_refresh = request.args.get('refresh') == '1'

        if not tab_id or tab_id in ('null', 'undefined'):
            return jsonify({'error': 'tab_id required'}), 400

        cache_key = f"aiadvisor:{username}:{tab_id}"
        if not force_refresh:
            cached = cache_get(cache_key)
            if cached:
                logger.info('[ai_advisor] cache hit for %s tab=%s', username, tab_id)
                return jsonify(cached)

        # 1. Fetch spending data from DB
        data = _fetch_spending_data(username, user_role, tab_id)
        if not data or data.get('month_count', 0) < 1:
            empty = {
                'error': 'Not enough data',
                'fallback': True,
                'reason': 'Upload at least 1 month of transactions for AI analysis.',
            }
            return jsonify(empty), 200

        # 2. Build prompt
        prompt = _build_prompt(
            data['monthly_totals'], data['top_cats'],
            data['avg'], data['anomalies'], data['month_count'],
        )
        logger.info('[ai_advisor] calling Claude for %s tab=%s (%d months)',
                    username, tab_id, data['month_count'])

        # 3. Call Claude
        analysis = _call_claude(prompt)

        result = {
            'summary': analysis.get('summary', ''),
            'recommendations': analysis.get('recommendations', []),
            'risk_alerts': analysis.get('risk_alerts', []),
            'savings_opportunities': analysis.get('savings_opportunities', []),
            'spending_verdict': analysis.get('spending_verdict', 'moderate'),
            'months_analyzed': data['month_count'],
            'avg_monthly_spend': data['avg'],
            'fallback': False,
        }

        cache_set(cache_key, result)
        logger.info('[ai_advisor] analysis complete for %s tab=%s verdict=%s',
                    username, tab_id, result['spending_verdict'])
        return jsonify(result)

    except anthropic.AuthenticationError:
        logger.warning('[ai_advisor] invalid Anthropic API key')
        return jsonify({'error': 'AI advisor unavailable', 'fallback': True,
                        'reason': 'Invalid API key'}), 503
    except anthropic.RateLimitError:
        logger.warning('[ai_advisor] Anthropic rate limit hit')
        return jsonify({'error': 'AI advisor temporarily unavailable', 'fallback': True,
                        'reason': 'Rate limit — try again in a moment'}), 503
    except anthropic.APIError as e:
        logger.error('[ai_advisor] Anthropic API error: %s', e, exc_info=True)
        return jsonify({'error': 'AI advisor unavailable', 'fallback': True,
                        'reason': 'Anthropic API error'}), 503
    except Error as e:
        current_app.logger.error('[ai_advisor] DB error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
    except Exception as e:
        current_app.logger.error('[ai_advisor] unexpected error: %s', e, exc_info=True)
        return jsonify({'error': 'AI advisor unavailable', 'fallback': True,
                        'reason': 'Unexpected error'}), 503


