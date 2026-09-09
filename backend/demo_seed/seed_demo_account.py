#!/usr/bin/env python3
"""Seed (or clean up) realistic sample data for the App Review demo account.

Everything goes through the app's own HTTP API using the demo account's own
JWT, so every write is scoped to that account by the same ownership checks the
mobile and web clients rely on. No other account is read or written, and the
script never touches the account itself (no password change, no deletion).

Credentials come from the environment and are never logged:

    export DEMO_ACCOUNT_USERNAME=...
    export DEMO_ACCOUNT_PASSWORD=...

Usage
-----
    python demo_seed/seed_demo_account.py --api-base http://127.0.0.1:5001/api --dry-run
    python demo_seed/seed_demo_account.py --api-base https://host/api
    python demo_seed/seed_demo_account.py --api-base https://host/api --verify-only
    python demo_seed/seed_demo_account.py --api-base https://host/api --cleanup

Re-running the seed is safe: records are matched by their seed marker (or, for
budget rows and bank rows, by the API's own duplicate detection), so nothing is
created twice and records that already exist are left alone.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from demo_seed_data import (  # noqa: E402
    BUDGET_TAB_PREFIX,
    CATEGORY_ID_PREFIX,
    SEED_MARKER,
    TX_TAB_NAME,
    build_dataset,
    slug_of,
    summarize,
)

DEFAULT_API_BASE = 'http://127.0.0.1:5001/api'
USER_AGENT = 'dpc-demo-seeder/1.0'


class ApiError(RuntimeError):
    def __init__(self, method, path, status, body):
        super().__init__(f'{method} {path} -> HTTP {status}: {body[:300]}')
        self.status = status
        self.body = body


class Api:
    """Thin JSON client for the app's REST API."""

    def __init__(self, base_url: str, timeout: float = 30.0, pause: float = 0.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.pause = pause
        self.token: str | None = None
        self.calls = 0

    def request(self, method: str, path: str, payload=None, params=None):
        url = self.base_url + path
        if params:
            url += '?' + urllib.parse.urlencode(params)
        data = json.dumps(payload).encode('utf-8') if payload is not None else None
        headers = {'User-Agent': USER_AGENT, 'Accept': 'application/json'}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        self.calls += 1
        if self.pause:
            time.sleep(self.pause)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode('utf-8')
                return json.loads(body) if body.strip() else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode('utf-8', 'replace')
            if exc.code == 429:
                raise SystemExit(
                    'Rate limited by the API (429). The server allows 500 requests '
                    'per hour per IP; wait an hour and re-run — the seed is '
                    'idempotent, so it will pick up where it stopped.'
                ) from None
            raise ApiError(method, path, exc.code, body) from None
        except urllib.error.URLError as exc:
            raise SystemExit(f'Cannot reach {self.base_url}: {exc.reason}') from None

    def get(self, path, params=None):
        return self.request('GET', path, params=params)

    def post(self, path, payload):
        return self.request('POST', path, payload=payload)

    def put(self, path, payload):
        return self.request('PUT', path, payload=payload)

    def patch(self, path, payload):
        return self.request('PATCH', path, payload=payload)

    def delete(self, path, payload=None, params=None):
        return self.request('DELETE', path, payload=payload, params=params)


# ── Account identification ────────────────────────────────────────────────────

def login(api: Api, username: str, password: str) -> dict:
    """Authenticate and confirm we are operating on the intended account."""
    result = api.post('/login', {'username': username, 'password': password})
    if result.get('requires_2fa'):
        raise SystemExit(
            'The demo account has two-factor authentication enabled, so this '
            'script cannot log in unattended. Disable 2FA for the demo account '
            '(Settings -> Two-Factor) and re-run.'
        )
    if not result.get('success') or not result.get('token'):
        raise SystemExit('Login failed for the supplied demo credentials.')
    api.token = result['token']

    # Confirm the identity the server itself reports before writing anything.
    identity = api.get('/auth/user-info')
    resolved = identity.get('username') or result.get('username')
    if resolved != username:
        raise SystemExit(
            f'Refusing to continue: logged in as {resolved!r} but expected {username!r}.'
        )
    return {
        'username': resolved,
        'role': result.get('role'),
        'email': identity.get('email'),
        'legacy': bool(identity.get('is_legacy_account')),
    }


# ── Seed steps ────────────────────────────────────────────────────────────────

def seed_categories(api: Api, dataset, report):
    existing = {c['id'] for c in api.get('/categories')}
    for category in dataset['categories']:
        if category['id'] in existing:
            report['categories']['kept'] += 1
            continue
        api.post('/categories', category)
        report['categories']['created'] += 1


def seed_clients(api: Api, dataset, report):
    # Match on the marker, not the name: /api/clients also surfaces names that
    # only appear on this account's tasks, so a name being listed does not mean
    # the clients row (with its contact details) actually exists.
    existing = {c['client'] for c in api.get('/clients') if slug_of(c.get('notes'))}
    for client in dataset['clients']:
        if client['name'] in existing:
            report['clients']['kept'] += 1
            continue
        try:
            api.post('/clients', {
                'name': client['name'],
                'email': client['email'],
                'phone': client['phone'],
                'notes': client['notes'],
            })
            report['clients']['created'] += 1
        except ApiError as exc:
            if exc.status != 409:
                raise
            # A client of that name already belongs to this account without our
            # marker — leave whatever is there alone.
            report['clients']['kept'] += 1


def _seeded_tasks(api: Api, username: str) -> dict:
    """Map slug -> task, for tasks this account seeded."""
    found = {}
    for task in api.get('/tasks'):
        if task.get('created_by') != username:
            continue
        slug = slug_of(task.get('notes'))
        if slug:
            found[slug] = task
    return found


def seed_tasks(api: Api, dataset, username, report):
    existing = _seeded_tasks(api, username)
    for task in dataset['tasks']:
        if task['slug'] in existing:
            report['tasks']['kept'] += 1
            continue
        api.post('/tasks', {
            'title': task['title'],
            'description': task['description'],
            'category': task['category'],
            'categories': task['categories'],
            'client': task['client'],
            'task_date': task['task_date'],
            'task_time': task['task_time'],
            'duration': task['duration'],
            'status': task['status'],
            'tags': task['tags'],
            'notes': task['notes'],
            'shared': False,
            'is_draft': False,
        })
        report['tasks']['created'] += 1


def seed_budgets(api: Api, dataset, report):
    tabs = {t['name']: t for t in api.get('/budget-tabs')}
    for spec in dataset['budget_tabs']:
        tab = tabs.get(spec['name'])
        if tab is None:
            tab = api.post('/budget-tabs', {'name': spec['name']})
            report['budget_tabs']['created'] += 1
        else:
            report['budget_tabs']['kept'] += 1

        result = api.post('/budget/save-batch', {
            'tab_id': tab['id'],
            'entries': [
                {
                    'type': e['type'],
                    'description': e['description'],
                    'amount': e['amount'],
                    'entry_date': e['entry_date'],
                    'category': e['category'],
                    'notes': e['notes'],
                }
                for e in spec['entries']
            ],
        })
        report['budget_entries']['created'] += int(result.get('saved_count') or 0)
        report['budget_entries']['kept'] += int(result.get('skipped_duplicates') or 0)

    # The batch endpoint has no is_fixed field, so flag the recurring lines in a
    # second pass. Only rows this seed created are touched, and only when the
    # flag is not already what the dataset asks for.
    wanted = {
        e['slug']: e['is_fixed']
        for spec in dataset['budget_tabs'] for e in spec['entries']
    }
    for entry in api.get('/budget'):
        slug = slug_of(entry.get('notes'))
        if slug is None or slug not in wanted:
            continue
        if bool(entry.get('is_fixed')) == wanted[slug]:
            continue
        api.patch(f"/budget/entries/{entry['id']}/fixed", {'is_fixed': wanted[slug]})
        report['budget_fixed_flags'] += 1


def seed_transactions(api: Api, dataset, report):
    spec = dataset['transaction_tab']
    tabs = {t['name']: t for t in api.get('/transaction-tabs')}
    tab = tabs.get(spec['name'])
    if tab is None:
        tab = api.post('/transaction-tabs', {'name': spec['name']})
        report['transaction_tabs']['created'] += 1
    else:
        report['transaction_tabs']['kept'] += 1

    result = api.post('/transactions/save', {
        'tab_id': tab['id'],
        'transactions': spec['transactions'],
        'last_balance': spec['closing_balance'],
        'balance_date': spec['balance_date'],
    })
    report['transactions']['created'] += len(result.get('transaction_ids') or [])
    report['transactions']['kept'] += int(result.get('skipped_duplicates') or 0)

    # Best-effort: the tab balance is a display nicety, and older deployments
    # may not have the transaction_tabs balance columns yet. Never let it stop
    # the seed.
    try:
        api.patch(f"/transaction-tabs/{tab['id']}/balance", {
            'balance': spec['closing_balance'],
            'balance_date': spec['balance_date'],
        })
    except ApiError as exc:
        report['warnings'].append(f'could not set the bank tab balance: {exc}')


# ── Cleanup ───────────────────────────────────────────────────────────────────

def cleanup(api: Api, dataset, username, report):
    """Remove only what this seed created, newest layer first."""
    # Tasks — matched by the seed marker in notes and by this account's ownership.
    for slug, task in _seeded_tasks(api, username).items():
        api.delete(f"/tasks/{task['id']}")
        report['tasks']['deleted'] += 1

    # Budget entries — marker first, then the tabs the seed created by name.
    marked_ids = [e['id'] for e in api.get('/budget') if slug_of(e.get('notes'))]
    if marked_ids:
        result = api.delete('/budget/batch', {'ids': marked_ids})
        report['budget_entries']['deleted'] += int(result.get('deleted') or 0)

    seed_tab_names = {spec['name'] for spec in dataset['budget_tabs']}
    for tab in api.get('/budget-tabs'):
        if tab['name'] in seed_tab_names or tab['name'].startswith(BUDGET_TAB_PREFIX + ' '):
            api.delete(f"/budget-tabs/{tab['id']}")
            report['budget_tabs']['deleted'] += 1

    # Bank rows live inside the seed-created tab; deleting the tab removes
    # exactly its own transactions and nothing else.
    for tab in api.get('/transaction-tabs'):
        if tab['name'] == TX_TAB_NAME:
            api.delete(f"/transaction-tabs/{tab['id']}")
            report['transaction_tabs']['deleted'] += 1

    # Clients — marker in notes, deleted through the owner-scoped endpoint.
    seeded_names = {c['name'] for c in dataset['clients']}
    for client in api.get('/clients'):
        name = client['client']
        if slug_of(client.get('notes')) or name in seeded_names:
            try:
                api.delete('/clients', params={'name': name})
                report['clients']['deleted'] += 1
            except ApiError as exc:
                if exc.status == 404:
                    continue
                raise

    # Categories — identified by the reserved id prefix.
    for category in api.get('/categories'):
        if str(category['id']).startswith(CATEGORY_ID_PREFIX):
            api.delete(f"/categories/{urllib.parse.quote(category['id'])}")
            report['categories']['deleted'] += 1


# ── Verification ──────────────────────────────────────────────────────────────

def verify(api: Api, dataset, username) -> dict:
    """Read the account back through the same endpoints the app uses."""
    tasks = [t for t in api.get('/tasks') if t.get('created_by') == username]
    seeded_tasks = [t for t in tasks if slug_of(t.get('notes'))]
    today = date.today().isoformat()

    stats = api.get('/stats')
    clients = api.get('/clients')
    categories = api.get('/categories')
    budget_tabs = api.get('/budget-tabs')
    budget_entries = api.get('/budget')
    tx_tabs = api.get('/transaction-tabs')

    seeded_budget = [e for e in budget_entries if slug_of(e.get('notes'))]
    income = round(sum(e['amount'] for e in seeded_budget if e['type'] == 'income'), 2)
    expense = round(sum(e['amount'] for e in seeded_budget if e['type'] == 'outcome'), 2)

    tx_tab = next((t for t in tx_tabs if t['name'] == TX_TAB_NAME), None)
    tx_stats = {}
    monthly = []
    if tx_tab:
        tx_stats = api.get('/transactions/stats', params={'tab_id': tx_tab['id']})
        monthly = tx_stats.get('monthly_by_type', [])

    summaries = []
    notes = []
    for tab in budget_tabs:
        if not tab['name'].startswith(BUDGET_TAB_PREFIX + ' '):
            continue
        dates = [e['entry_date'] for e in seeded_budget if e.get('tab_id') == tab['id']]
        if not dates:
            continue
        try:
            summary = api.get('/budget/monthly-summary', params={
                'tab_id': tab['id'], 'start': min(dates), 'end': max(dates),
            })
        except ApiError as exc:
            # The seeded rows are still correct — the endpoint itself is
            # failing. Report it rather than aborting the whole verification.
            notes.append(f'/budget/monthly-summary is not returning data ({exc})')
            break
        for month in summary.get('months', []):
            summaries.append((tab['name'], month))

    return {
        'account': username,
        'tasks_total': len(tasks),
        'tasks_seeded': len(seeded_tasks),
        'tasks_completed': sum(1 for t in seeded_tasks if t['status'] == 'completed'),
        'tasks_overdue': sum(
            1 for t in seeded_tasks
            if t['status'] != 'completed' and str(t['task_date']) < today),
        'tasks_upcoming': sum(
            1 for t in seeded_tasks
            if t['status'] != 'completed' and str(t['task_date']) > today),
        'tasks_today': sum(
            1 for t in seeded_tasks
            if t['status'] != 'completed' and str(t['task_date']) == today),
        'clients': len(clients),
        'clients_with_tasks': sum(1 for c in clients if (c.get('task_count') or 0) > 0),
        'categories': len(categories),
        'budget_tabs': len([t for t in budget_tabs if t['name'].startswith(BUDGET_TAB_PREFIX + ' ')]),
        'budget_entries': len(seeded_budget),
        'budget_income': income,
        'budget_expense': expense,
        'budget_net': round(income - expense, 2),
        'budget_monthly': summaries,
        'transaction_tab': tx_tab['name'] if tx_tab else None,
        'transaction_stats_by_type': tx_stats.get('by_type', []),
        'transaction_months': sorted({m['month_year'] for m in monthly}),
        'stats_overall': stats.get('overall', {}),
        'stats_by_client': stats.get('by_client', []),
        'stats_by_category': stats.get('by_category', []),
        'notes': notes,
    }


def print_verification(result: dict) -> bool:
    print('\n── Verification (read back through the app API) ' + '─' * 27)
    print(f"  account                : {result['account']}")
    print(f"  tasks visible to acct  : {result['tasks_total']}  (seeded: {result['tasks_seeded']})")
    print(f"    completed / overdue  : {result['tasks_completed']} / {result['tasks_overdue']}")
    print(f"    today / upcoming     : {result['tasks_today']} / {result['tasks_upcoming']}")
    print(f"  clients                : {result['clients']}  (with tasks: {result['clients_with_tasks']})")
    print(f"  categories             : {result['categories']}")
    print(f"  budget tabs / entries  : {result['budget_tabs']} / {result['budget_entries']}")
    print(f"  budget income          : {result['budget_income']:,.2f}")
    print(f"  budget expense         : {result['budget_expense']:,.2f}")
    print(f"  budget net             : {result['budget_net']:,.2f}")
    for name, month in result['budget_monthly']:
        print(f"    {name:<28} {month['month']}  in {month['income']:>10,.2f}"
              f"  out {month['expense']:>10,.2f}  net {month['net']:>10,.2f}")
    for note in result['notes']:
        print(f'  NOTE: {note}')
    print(f"  bank tab               : {result['transaction_tab']}")
    for stat in result['transaction_stats_by_type']:
        print(f"    {stat['transaction_type']:<10} {stat['transaction_count']:>4} rows"
              f"  total {stat['total_amount']:>12,.2f}")
    print(f"    months with data     : {', '.join(result['transaction_months']) or '(none)'}")
    overall = result['stats_overall'] or {}
    print(f"  /api/stats overall     : {overall.get('total_tasks')} tasks, "
          f"{overall.get('completed_tasks')} completed, "
          f"{overall.get('total_duration')} hours")
    print(f"  /api/stats top clients : "
          f"{', '.join(c['client'] for c in result['stats_by_client'][:4]) or '(none)'}")

    problems = []
    if result['tasks_seeded'] < 15:
        problems.append(f"expected 15-20 seeded tasks, found {result['tasks_seeded']}")
    if result['clients_with_tasks'] < 5:
        problems.append(f"expected >=5 clients with linked work, found {result['clients_with_tasks']}")
    if result['budget_tabs'] < 3:
        problems.append(f"expected 3-4 monthly budgets, found {result['budget_tabs']}")
    if round(result['budget_income'] - result['budget_expense'], 2) != result['budget_net']:
        problems.append('budget totals are not internally consistent')
    if len(result['transaction_months']) < 3:
        problems.append('bank transactions do not span enough months for trend charts')
    if not result['stats_by_category']:
        problems.append('/api/stats returned no per-category breakdown')
    if not result['budget_monthly'] and not result['notes']:
        problems.append('the budget monthly summary returned no months')

    if problems:
        print('\n  ISSUES:')
        for problem in problems:
            print(f'    - {problem}')
        return False
    print('\n  All checks passed.')
    return True


# ── CLI ───────────────────────────────────────────────────────────────────────

def _new_report():
    def bucket():
        return {'created': 0, 'kept': 0, 'deleted': 0}
    return {
        'categories': bucket(), 'clients': bucket(), 'tasks': bucket(),
        'budget_tabs': bucket(), 'budget_entries': bucket(),
        'transaction_tabs': bucket(), 'transactions': bucket(),
        'budget_fixed_flags': 0,
        'warnings': [],
    }


def print_report(report):
    print('\n── Records ' + '─' * 62)
    for key in ('categories', 'clients', 'tasks', 'budget_tabs', 'budget_entries',
                'transaction_tabs', 'transactions'):
        bucket = report[key]
        print(f"  {key:<18} created {bucket['created']:>4}   "
              f"already present {bucket['kept']:>4}   deleted {bucket['deleted']:>4}")
    print(f"  budget fixed flags set {report['budget_fixed_flags']}")
    for warning in report['warnings']:
        print(f'  WARNING: {warning}')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--api-base', default=os.getenv('DEMO_API_BASE', DEFAULT_API_BASE),
                        help=f'API root, e.g. https://host/api (default: {DEFAULT_API_BASE})')
    parser.add_argument('--dry-run', action='store_true',
                        help='print what would be created and exit without logging in')
    parser.add_argument('--cleanup', action='store_true',
                        help='remove only the records this seed created, then exit')
    parser.add_argument('--verify-only', action='store_true',
                        help='read the account back and report, without writing')
    parser.add_argument('--pause', type=float, default=0.0,
                        help='seconds to wait between API calls (default 0)')
    parser.add_argument('--yes', action='store_true',
                        help='skip the confirmation prompt for a non-local --api-base')
    args = parser.parse_args(argv)

    today = date.today()
    dataset = build_dataset(today)

    if args.dry_run:
        totals = summarize(dataset)
        print(f'Dry run — dataset for reference date {today.isoformat()}')
        print(f'  API base (not contacted): {args.api_base}')
        for key, value in totals.items():
            print(f'  {key:<22} {value}')
        print(f'\n  seed marker: [{SEED_MARKER}/<slug>]')
        print(f'  budget tabs: ' + ', '.join(t['name'] for t in dataset['budget_tabs']))
        print(f'  bank tab   : {TX_TAB_NAME}')
        return 0

    username = os.getenv('DEMO_ACCOUNT_USERNAME', '').strip()
    password = os.getenv('DEMO_ACCOUNT_PASSWORD', '')
    if not username or not password:
        raise SystemExit(
            'Set DEMO_ACCOUNT_USERNAME and DEMO_ACCOUNT_PASSWORD in the environment. '
            'They are never written to disk or logged by this script.'
        )

    is_local = urllib.parse.urlparse(args.api_base).hostname in ('127.0.0.1', 'localhost')
    if not is_local and not args.yes and not args.verify_only:
        action = 'CLEAN UP' if args.cleanup else 'SEED'
        print(f'About to {action} account {username!r} on {args.api_base}')
        if input('Type the username to confirm: ').strip() != username:
            raise SystemExit('Aborted.')

    api = Api(args.api_base, pause=args.pause)
    identity = login(api, username, password)
    print(f"Authenticated as {identity['username']} "
          f"(role: {identity['role']}, email: {identity['email'] or 'n/a'}) "
          f"on {args.api_base}")

    report = _new_report()

    if args.verify_only:
        ok = print_verification(verify(api, dataset, identity['username']))
        print(f'\n({api.calls} API calls)')
        return 0 if ok else 1

    if args.cleanup:
        cleanup(api, dataset, identity['username'], report)
        print_report(report)
        print('\nCleanup complete. Tasks and tabs are recoverable from Trash '
              'for 30 days; the account itself was not touched.')
        print(f'\n({api.calls} API calls)')
        return 0

    seed_categories(api, dataset, report)
    seed_clients(api, dataset, report)
    seed_tasks(api, dataset, identity['username'], report)
    seed_budgets(api, dataset, report)
    seed_transactions(api, dataset, report)
    print_report(report)

    ok = print_verification(verify(api, dataset, identity['username']))
    print(f'\n({api.calls} API calls)')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
