"""Fictional sample dataset for the permanent App Review demo account.

Pure data + pure functions: no I/O, no network, no database. `build_dataset()`
is deterministic for a given reference date, which is what makes the seeder
idempotent — a second run produces byte-identical descriptions, amounts and
dates, so the marker lookup (and the API's own dedup) recognises every record.

Everything here is invented. Client names, e-mail addresses (`.example` is
reserved by RFC 2606) and phone numbers (555-01xx is the reserved fictional
range) cannot resolve to a real person or business, and no real bank details,
medical data or investment results appear anywhere in the file.
"""
from __future__ import annotations

import re
from calendar import monthrange
from datetime import date, timedelta

# ── Seed marker ───────────────────────────────────────────────────────────────
# Every seeded row that has a free-text notes/comments field carries
# "[dpc-seed:v1/<slug>]". The slug is stable per logical record, so the seeder
# can tell "already created" from "not created yet" without keeping local state,
# and cleanup can delete exactly the rows it created and nothing else.
SEED_VERSION = 'v1'
SEED_MARKER = f'dpc-seed:{SEED_VERSION}'
_MARKER_RE = re.compile(r'\[' + re.escape(SEED_MARKER) + r'/([A-Za-z0-9._-]+)\]')

# Categories have no notes field, so they are marked by a reserved id prefix
# instead. Tabs have no notes field either and are matched by exact name.
CATEGORY_ID_PREFIX = 'demo-'
TX_TAB_NAME = 'Demo Checking Account'
BUDGET_TAB_PREFIX = 'Demo Budget'


def mark(slug: str) -> str:
    """Return the marker token for a logical record."""
    return f'[{SEED_MARKER}/{slug}]'


def marked(text: str, slug: str) -> str:
    """Append the marker to a free-text field on its own line."""
    body = (text or '').strip()
    return f'{body}\n{mark(slug)}' if body else mark(slug)


def slug_of(text: str) -> str | None:
    """Extract the seed slug from a notes/comments value, or None."""
    if not text:
        return None
    found = _MARKER_RE.search(str(text))
    return found.group(1) if found else None


def is_seeded(text: str) -> bool:
    return slug_of(text) is not None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _month_start(today: date, months_back: int) -> date:
    year, month = today.year, today.month - months_back
    while month < 1:
        month += 12
        year -= 1
    return date(year, month, 1)


def _day_in(month_start: date, day: int) -> date:
    """A safe day-of-month inside `month_start`'s month."""
    last = monthrange(month_start.year, month_start.month)[1]
    return month_start.replace(day=min(day, last))


# ── Categories ────────────────────────────────────────────────────────────────
# `GET /api/categories` is owner-scoped, so a brand-new account starts with an
# empty category list and the task screens have nothing to filter by until
# these exist.
CATEGORIES = [
    ('demo-client-work', 'Client Work', '#0d6efd', '\U0001f4bc'),
    ('demo-proposals', 'Proposals', '#fd7e14', '\U0001f4c4'),
    ('demo-meetings', 'Meetings', '#ffc107', '\U0001f4c5'),
    ('demo-invoicing', 'Invoicing', '#198754', '\U0001f9fe'),
    ('demo-marketing', 'Marketing', '#d63384', '\U0001f4e3'),
    ('demo-admin-finance', 'Admin & Finance', '#6f42c1', '\U0001f4ca'),
    ('demo-planning', 'Planning', '#20c997', '\U0001f5fa'),
]

# ── Clients ───────────────────────────────────────────────────────────────────
CLIENTS = [
    ('northstar-studio', 'Northstar Studio', 'hello@northstar-studio.example',
     '+1 (555) 0142', 'Brand refresh retainer. Monthly design review on the first Tuesday.'),
    ('cedar-and-co', 'Cedar & Co.', 'accounts@cedarandco.example',
     '+1 (555) 0168', 'Quarterly bookkeeping support. Invoices due net 30.'),
    ('blue-harbor-media', 'Blue Harbor Media', 'projects@blueharbormedia.example',
     '+1 (555) 0113', 'Podcast launch campaign. Prefers async updates over calls.'),
    ('horizon-consulting', 'Horizon Consulting', 'team@horizon-consulting.example',
     '+1 (555) 0177', 'Operations process review. Workshop series runs through Q4.'),
    ('lakeside-publishing', 'Lakeside Publishing', 'editorial@lakesidepublishing.example',
     '+1 (555) 0129', 'Website content migration. Editorial sign-off required per batch.'),
    ('ridgeway-architects', 'Ridgeway Architects', 'studio@ridgewayarchitects.example',
     '+1 (555) 0154', 'Portfolio site build. Phase 2 scoped for next quarter.'),
]

# ── Tasks ─────────────────────────────────────────────────────────────────────
# (slug, day offset from today, title, category, client name, tags, hours,
#  status, description)
# Negative offsets are in the past. A past task that is still 'uncompleted' is
# what the app renders as overdue; offsets 0..+2 read as in-progress/this week.
_TASKS = [
    ('t01-proposal-northstar', -62, 'Prepare project proposal', 'demo-proposals',
     'Northstar Studio', ['priority-high', 'brand-refresh'], 3.5, 'completed',
     'Scope, timeline and three pricing tiers for the brand refresh engagement.'),
    ('t02-kickoff-northstar', -55, 'Kickoff call and scope review', 'demo-meetings',
     'Northstar Studio', ['priority-medium', 'brand-refresh'], 1.0, 'completed',
     'Walked through deliverables and agreed the review cadence.'),
    ('t03-invoice-cedar', -48, 'Send client invoice', 'demo-invoicing',
     'Cedar & Co.', ['priority-medium', 'billing'], 0.5, 'completed',
     'Invoice for the June bookkeeping block, net 30.'),
    ('t04-campaign-brief-blue', -41, 'Draft podcast launch campaign brief',
     'demo-marketing', 'Blue Harbor Media', ['priority-high', 'podcast-launch'], 4.0,
     'completed', 'Audience, channels and a six-week posting calendar.'),
    ('t05-budget-review-jul', -34, 'Review monthly budget', 'demo-admin-finance',
     '', ['priority-medium', 'finance'], 1.5, 'completed',
     'Compared planned against actual spend and adjusted the marketing line.'),
    ('t06-workshop-horizon', -27, 'Ops process review workshop', 'demo-meetings',
     'Horizon Consulting', ['priority-high', 'process-review'], 2.5, 'completed',
     'Mapped the current intake process with the operations team.'),
    ('t07-cms-migration-lakeside', -20, 'Migrate legacy articles to new CMS',
     'demo-client-work', 'Lakeside Publishing', ['priority-medium', 'content-migration'],
     6.0, 'completed', 'First batch of 120 articles moved and spot-checked.'),
    ('t08-invoice-blue', -13, 'Send client invoice', 'demo-invoicing',
     'Blue Harbor Media', ['priority-low', 'billing'], 0.5, 'completed',
     'Milestone one invoice for the podcast launch campaign.'),
    ('t09-bookkeeping-cedar', -9, 'Quarterly bookkeeping reconciliation',
     'demo-admin-finance', 'Cedar & Co.', ['priority-medium', 'finance'], 2.0,
     'completed', 'Reconciled the quarter and flagged two uncategorised entries.'),

    ('t10-timeline-ridgeway', -6, 'Update project timeline', 'demo-planning',
     'Ridgeway Architects', ['priority-high', 'portfolio-site'], 1.5, 'uncompleted',
     'Phase 2 dates slipped a week — timeline still needs updating.'),
    ('t11-invoice-followup-cedar', -3, 'Follow up on outstanding invoice',
     'demo-invoicing', 'Cedar & Co.', ['priority-high', 'billing'], 0.5, 'uncompleted',
     'Invoice from last month is past due; send a reminder.'),
    ('t12-brand-assets-northstar', -2, 'Collect brand assets from client',
     'demo-client-work', 'Northstar Studio', ['priority-medium', 'brand-refresh'], 1.0,
     'uncompleted', 'Waiting on logo source files and the typography licence.'),

    ('t13-homepage-ridgeway', 0, 'Build portfolio site homepage', 'demo-client-work',
     'Ridgeway Architects', ['priority-high', 'portfolio-site'], 5.0, 'uncompleted',
     'In progress — hero section and project grid done, footer remaining.'),
    ('t14-email-sequence-blue', 0, 'Write launch email sequence', 'demo-marketing',
     'Blue Harbor Media', ['priority-medium', 'podcast-launch'], 3.0, 'uncompleted',
     'In progress — three of five emails drafted.'),
    ('t15-schedule-planning-horizon', 2, 'Schedule planning meeting', 'demo-meetings',
     'Horizon Consulting', ['priority-low', 'process-review'], 0.5, 'uncompleted',
     'Find a slot that works for both operations leads.'),

    ('t16-q4-proposal-horizon', 6, 'Prepare Q4 proposal', 'demo-proposals',
     'Horizon Consulting', ['priority-high', 'process-review'], 4.0, 'uncompleted',
     'Extend the engagement into Q4 with two additional workshops.'),
    ('t17-budget-review-next', 11, 'Review monthly budget', 'demo-admin-finance',
     '', ['priority-medium', 'finance'], 1.5, 'uncompleted',
     'Monthly check of planned versus actual spend.'),
    ('t18-invoice-lakeside', 18, 'Send client invoice', 'demo-invoicing',
     'Lakeside Publishing', ['priority-medium', 'billing'], 0.5, 'uncompleted',
     'Invoice for the second migration batch once sign-off lands.'),
    ('t19-content-workshop-lakeside', 24, 'Content strategy workshop', 'demo-meetings',
     'Lakeside Publishing', ['priority-medium', 'content-migration'], 2.0, 'uncompleted',
     'Half-day session on the post-migration editorial workflow.'),
]

_TASK_TIMES = ['09:00:00', '10:30:00', '11:15:00', '13:00:00', '14:30:00', '16:00:00']

# ── Budgets ───────────────────────────────────────────────────────────────────
# Four monthly budgets, oldest first. Each is one budget tab holding its own
# income and expense lines, so per-month totals in the UI come straight from
# these rows.
_BUDGET_INCOME = [
    # (key, description, category, [amount per month, oldest first])
    ('retainer', 'Consulting retainer', 'Consulting income', [5200, 5200, 5200, 5200]),
    ('milestone', 'Project milestone payment', 'Consulting income', [2400, 1850, 3100, 2600]),
    ('workshop', 'Workshop facilitation fee', 'Consulting income', [0, 900, 0, 750]),
]

_BUDGET_EXPENSE = [
    # (key, description, category, [amount per month], is_fixed)
    ('software', 'Design and accounting software', 'Software', [189, 189, 189, 189], True),
    ('utilities', 'Internet and phone', 'Utilities', [148, 148, 148, 148], True),
    ('workspace', 'Coworking desk', 'Workspace', [320, 320, 320, 320], True),
    ('insurance', 'Professional liability insurance', 'Insurance', [110, 110, 110, 110], True),
    ('bookkeeping', 'Bookkeeping services', 'Professional services', [260, 260, 260, 260], True),
    ('tax', 'Estimated tax set-aside', 'Taxes', [1450, 1450, 1450, 1450], True),
    ('supplies', 'Printer paper and stationery', 'Office supplies', [64, 118, 82, 96], False),
    ('transport', 'Client travel and parking', 'Transportation', [212, 168, 245, 190], False),
    ('marketing', 'Social ads and newsletter tool', 'Marketing', [340, 420, 295, 380], False),
    ('contractor', 'Freelance copywriter', 'Subcontractors', [800, 1200, 0, 950], False),
    ('training', 'Online course', 'Professional development', [0, 249, 0, 129], False),
]

# Day of month each line lands on, so a month reads like a real cash-flow plan.
_BUDGET_DAYS = {
    'retainer': 5, 'milestone': 20, 'workshop': 24,
    'software': 3, 'utilities': 8, 'workspace': 2, 'insurance': 12,
    'bookkeeping': 15, 'tax': 26, 'supplies': 9, 'transport': 18,
    'marketing': 11, 'contractor': 22, 'training': 14,
}

# ── Bank transactions ─────────────────────────────────────────────────────────
# Deposits, then a repeating but varied run of everyday business spending. The
# per-month multipliers keep the four months visibly different in the charts
# without any randomness.
_TX_INCOME = [
    (5, 'Client payment - Northstar Studio', [5200, 5200, 5200, 5200], 'credit'),
    (21, 'Client payment - Blue Harbor Media', [2400, 1850, 3100, 2600], 'credit'),
    (26, 'Client payment - Horizon Consulting', [0, 900, 0, 750], 'credit'),
]

_TX_EXPENSE = [
    # (day, description, [amount per month], type)
    (2, 'Coworking day passes', [320, 320, 320, 320], 'credit'),
    (3, 'Software subscription', [189, 189, 189, 189], 'credit'),
    (4, 'Coffee shop', [11.50, 9.80, 13.20, 10.40], 'cash'),
    (6, 'Grocery store', [86.40, 92.10, 78.60, 88.90], 'credit'),
    (7, 'Mobile phone bill', [48, 48, 48, 48], 'credit'),
    (8, 'Internet bill', [100, 100, 100, 100], 'credit'),
    (9, 'Office supplies store', [64, 118.30, 82.50, 96.20], 'credit'),
    (10, 'Fuel station', [72.30, 58.90, 81.40, 66.70], 'credit'),
    (11, 'Ad platform', [180, 240, 155, 205], 'credit'),
    (12, 'Professional insurance', [110, 110, 110, 110], 'credit'),
    (13, 'Train ticket', [24.50, 18.00, 31.20, 22.60], 'cash'),
    (14, 'Bookshop', [0, 34.90, 0, 27.50], 'cash'),
    (15, 'Bookkeeping services', [260, 260, 260, 260], 'credit'),
    (16, 'Team lunch', [42.80, 51.30, 38.40, 47.90], 'cash'),
    (17, 'Cloud storage', [12, 12, 12, 12], 'credit'),
    (18, 'Parking garage', [28, 22.50, 34, 26], 'cash'),
    (19, 'Courier delivery', [18.60, 0, 21.40, 15.30], 'credit'),
    (20, 'Newsletter tool', [160, 180, 140, 175], 'credit'),
    (22, 'Freelance copywriter', [800, 1200, 0, 950], 'credit'),
    (23, 'Restaurant', [56.20, 64.80, 49.10, 58.70], 'cash'),
    (24, 'Domain renewal', [0, 0, 46, 0], 'credit'),
    (25, 'Stationery', [16.90, 12.40, 19.80, 14.20], 'cash'),
    (26, 'Estimated tax set-aside', [1450, 1450, 1450, 1450], 'credit'),
    (27, 'Online course', [0, 249, 0, 129], 'credit'),
]

# Opening balance of the demo account before the first seeded month.
TX_OPENING_BALANCE = 8400.00

MONTHS_BACK = 3  # oldest seeded month is `today` minus this many months


def build_dataset(today: date) -> dict:
    """Build the whole fictional dataset relative to `today`.

    Deterministic: same `today` in, same records out.
    """
    months = [_month_start(today, MONTHS_BACK - i) for i in range(MONTHS_BACK + 1)]

    categories = [
        {'id': cid, 'label': label, 'color': color, 'icon': icon}
        for cid, label, color, icon in CATEGORIES
    ]

    clients = [
        {
            'slug': slug,
            'name': name,
            'email': email,
            'phone': phone,
            'notes': marked(note, slug),
        }
        for slug, name, email, phone, note in CLIENTS
    ]

    tasks = []
    for index, (slug, offset, title, category, client, tags, hours, status, description) in enumerate(_TASKS):
        tasks.append({
            'slug': slug,
            'title': title,
            'description': description,
            'category': category,
            'categories': [category],
            'client': client,
            'task_date': (today + timedelta(days=offset)).isoformat(),
            'task_time': _TASK_TIMES[index % len(_TASK_TIMES)],
            'duration': hours,
            'status': status,
            'tags': tags,
            'notes': marked('', slug),
        })

    budget_tabs = []
    for index, month_start in enumerate(months):
        label = month_start.strftime('%b %Y')
        entries = []
        for key, description, category, amounts in _BUDGET_INCOME:
            amount = amounts[index]
            if amount <= 0:
                continue
            entry_slug = f'b{index}-in-{key}'
            entries.append({
                'slug': entry_slug,
                'type': 'income',
                'description': description,
                'amount': float(amount),
                'entry_date': _day_in(month_start, _BUDGET_DAYS[key]).isoformat(),
                'category': category,
                'is_fixed': False,
                'notes': marked('', entry_slug),
            })
        for key, description, category, amounts, is_fixed in _BUDGET_EXPENSE:
            amount = amounts[index]
            if amount <= 0:
                continue
            entry_slug = f'b{index}-out-{key}'
            entries.append({
                'slug': entry_slug,
                'type': 'outcome',
                'description': description,
                'amount': float(amount),
                'entry_date': _day_in(month_start, _BUDGET_DAYS[key]).isoformat(),
                'category': category,
                'is_fixed': is_fixed,
                'notes': marked('', entry_slug),
            })
        budget_tabs.append({
            'name': f'{BUDGET_TAB_PREFIX} {label}',
            'month': month_start.strftime('%Y-%m'),
            'entries': entries,
        })

    transactions = []
    for index, month_start in enumerate(months):
        month_year = month_start.strftime('%Y-%m')
        rows = (
            [(day, description, amounts[index], kind, 1) for day, description, amounts, kind in _TX_INCOME]
            + [(day, description, amounts[index], kind, -1) for day, description, amounts, kind in _TX_EXPENSE]
        )
        for day, description, amount, kind, sign in sorted(rows):
            if not amount:
                continue
            when = _day_in(month_start, day)
            # Never seed a transaction dated in the future — a bank statement
            # that runs past today looks wrong and skews the balance charts.
            if when > today:
                continue
            transactions.append({
                'account_number': '',
                'transaction_date': when.isoformat(),
                'description': description,
                'amount': round(sign * float(amount), 2),
                'month_year': month_year,
                'transaction_type': kind,
            })

    closing_balance = round(
        TX_OPENING_BALANCE + sum(t['amount'] for t in transactions), 2
    )

    return {
        'categories': categories,
        'clients': clients,
        'tasks': tasks,
        'budget_tabs': budget_tabs,
        'transaction_tab': {
            'name': TX_TAB_NAME,
            'transactions': transactions,
            'closing_balance': closing_balance,
            'balance_date': max(t['transaction_date'] for t in transactions) if transactions else today.isoformat(),
        },
    }


def summarize(dataset: dict) -> dict:
    """Counts and totals used by the CLI's dry-run and verification output."""
    tasks = dataset['tasks']
    budget_entries = [e for tab in dataset['budget_tabs'] for e in tab['entries']]
    transactions = dataset['transaction_tab']['transactions']
    return {
        'categories': len(dataset['categories']),
        'clients': len(dataset['clients']),
        'tasks': len(tasks),
        'tasks_completed': sum(1 for t in tasks if t['status'] == 'completed'),
        'tasks_open': sum(1 for t in tasks if t['status'] != 'completed'),
        'budget_tabs': len(dataset['budget_tabs']),
        'budget_entries': len(budget_entries),
        'budget_income_total': round(
            sum(e['amount'] for e in budget_entries if e['type'] == 'income'), 2),
        'budget_expense_total': round(
            sum(e['amount'] for e in budget_entries if e['type'] == 'outcome'), 2),
        'transactions': len(transactions),
        'transactions_in': round(sum(t['amount'] for t in transactions if t['amount'] > 0), 2),
        'transactions_out': round(sum(t['amount'] for t in transactions if t['amount'] < 0), 2),
        'closing_balance': dataset['transaction_tab']['closing_balance'],
    }
