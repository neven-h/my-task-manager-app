"""Tests for the App Review demo-account sample dataset.

Imports only `scripts/demo_seed_data`, which is pure data and pure functions —
no Flask app, no database, no network — so these run anywhere without the
application's environment variables.
"""
import os
import re
import sys
import unittest
from collections import Counter
from datetime import date

sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'demo_seed'))

from demo_seed_data import (  # noqa: E402
    BUDGET_TAB_PREFIX,
    CATEGORY_ID_PREFIX,
    SEED_MARKER,
    TX_TAB_NAME,
    build_dataset,
    is_seeded,
    mark,
    marked,
    slug_of,
    summarize,
)

REFERENCE_DATE = date(2026, 9, 9)


class TestMarker(unittest.TestCase):
    def test_slug_round_trips(self):
        self.assertEqual(slug_of(mark('t01-abc')), 't01-abc')

    def test_marker_survives_surrounding_text(self):
        notes = marked('Waiting on the client.', 'b2-out-software')
        self.assertEqual(slug_of(notes), 'b2-out-software')
        self.assertIn('Waiting on the client.', notes)

    def test_unmarked_text_has_no_slug(self):
        for value in ('', None, 'a normal note', '[some-other-marker/x]'):
            self.assertIsNone(slug_of(value))
            self.assertFalse(is_seeded(value))

    def test_marker_is_versioned(self):
        self.assertTrue(SEED_MARKER.startswith('dpc-seed:'))


class TestDataset(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_dataset(REFERENCE_DATE)
        cls.tasks = cls.data['tasks']
        cls.clients = cls.data['clients']
        cls.budget_entries = [e for tab in cls.data['budget_tabs'] for e in tab['entries']]
        cls.transactions = cls.data['transaction_tab']['transactions']

    # ── shape ────────────────────────────────────────────────────────────────
    def test_task_count_is_in_the_requested_range(self):
        self.assertTrue(15 <= len(self.tasks) <= 20, len(self.tasks))

    def test_client_count_is_in_the_requested_range(self):
        self.assertTrue(5 <= len(self.clients) <= 7, len(self.clients))

    def test_three_or_four_monthly_budgets(self):
        tabs = self.data['budget_tabs']
        self.assertTrue(3 <= len(tabs) <= 4, len(tabs))
        self.assertEqual(len({t['month'] for t in tabs}), len(tabs))
        for tab in tabs:
            self.assertTrue(tab['name'].startswith(BUDGET_TAB_PREFIX + ' '))

    def test_enough_transactions_for_trend_charts(self):
        self.assertGreaterEqual(len(self.transactions), 40)
        months = {t['month_year'] for t in self.transactions}
        self.assertGreaterEqual(len(months), 3)

    # ── idempotency support ──────────────────────────────────────────────────
    def test_every_marked_record_has_a_unique_slug(self):
        slugs = (
            [t['slug'] for t in self.tasks]
            + [c['slug'] for c in self.clients]
            + [e['slug'] for e in self.budget_entries]
        )
        duplicates = [s for s, n in Counter(slugs).items() if n > 1]
        self.assertEqual(duplicates, [])

    def test_marker_is_embedded_in_every_notes_field(self):
        for record in [*self.tasks, *self.clients, *self.budget_entries]:
            self.assertEqual(slug_of(record['notes']), record['slug'])

    def test_categories_and_tabs_carry_their_own_identifiers(self):
        for category in self.data['categories']:
            self.assertTrue(category['id'].startswith(CATEGORY_ID_PREFIX))
        self.assertEqual(self.data['transaction_tab']['name'], TX_TAB_NAME)

    def test_dataset_is_deterministic(self):
        self.assertEqual(build_dataset(REFERENCE_DATE), self.data)

    # ── realism / mixed work states ──────────────────────────────────────────
    def test_work_covers_completed_overdue_in_progress_and_upcoming(self):
        today = REFERENCE_DATE.isoformat()
        completed = [t for t in self.tasks if t['status'] == 'completed']
        open_tasks = [t for t in self.tasks if t['status'] != 'completed']
        overdue = [t for t in open_tasks if t['task_date'] < today]
        current = [t for t in open_tasks if t['task_date'] == today]
        upcoming = [t for t in open_tasks if t['task_date'] > today]
        for label, group in (('completed', completed), ('overdue', overdue),
                             ('in progress', current), ('upcoming', upcoming)):
            self.assertTrue(group, f'no {label} tasks in the dataset')

    def test_tasks_vary_by_priority_category_and_duration(self):
        priorities = {tag for t in self.tasks for tag in t['tags'] if tag.startswith('priority-')}
        self.assertGreaterEqual(len(priorities), 3)
        self.assertGreaterEqual(len({t['category'] for t in self.tasks}), 5)
        self.assertGreaterEqual(len({t['duration'] for t in self.tasks}), 5)
        for task in self.tasks:
            self.assertTrue(task['description'].strip(), task['title'])
            self.assertGreater(task['duration'], 0)

    def test_tasks_reference_only_seeded_clients_and_categories(self):
        client_names = {c['name'] for c in self.clients}
        category_ids = {c['id'] for c in self.data['categories']}
        for task in self.tasks:
            if task['client']:
                self.assertIn(task['client'], client_names)
            self.assertIn(task['category'], category_ids)

    def test_every_client_has_linked_work(self):
        linked = {t['client'] for t in self.tasks if t['client']}
        for client in self.clients:
            self.assertIn(client['name'], linked, client['name'])

    # ── budget consistency ───────────────────────────────────────────────────
    def test_each_budget_has_multiple_income_and_expense_categories(self):
        for tab in self.data['budget_tabs']:
            income = [e for e in tab['entries'] if e['type'] == 'income']
            expense = [e for e in tab['entries'] if e['type'] == 'outcome']
            self.assertGreaterEqual(len(income), 2, tab['name'])
            self.assertGreaterEqual(len(expense), 6, tab['name'])
            self.assertGreaterEqual(len({e['category'] for e in expense}), 5, tab['name'])
            self.assertTrue(any(e['is_fixed'] for e in expense), tab['name'])

    def test_budget_entries_are_positive_and_inside_their_month(self):
        for tab in self.data['budget_tabs']:
            for entry in tab['entries']:
                self.assertGreater(entry['amount'], 0)
                self.assertTrue(entry['entry_date'].startswith(tab['month']),
                                f"{entry['entry_date']} not in {tab['month']}")

    def test_totals_match_the_sum_of_the_rows(self):
        totals = summarize(self.data)
        income = sum(e['amount'] for e in self.budget_entries if e['type'] == 'income')
        expense = sum(e['amount'] for e in self.budget_entries if e['type'] == 'outcome')
        self.assertAlmostEqual(totals['budget_income_total'], income, places=2)
        self.assertAlmostEqual(totals['budget_expense_total'], expense, places=2)
        self.assertEqual(totals['tasks'], len(self.tasks))
        self.assertEqual(totals['transactions'], len(self.transactions))

    def test_every_budget_is_net_positive_so_the_charts_read_sensibly(self):
        for tab in self.data['budget_tabs']:
            income = sum(e['amount'] for e in tab['entries'] if e['type'] == 'income')
            expense = sum(e['amount'] for e in tab['entries'] if e['type'] == 'outcome')
            self.assertGreater(income, expense, tab['name'])

    # ── bank rows ────────────────────────────────────────────────────────────
    def test_transactions_are_never_dated_in_the_future(self):
        today = REFERENCE_DATE.isoformat()
        for transaction in self.transactions:
            self.assertLessEqual(transaction['transaction_date'], today)

    def test_month_year_matches_the_transaction_date(self):
        for transaction in self.transactions:
            self.assertEqual(transaction['month_year'], transaction['transaction_date'][:7])

    def test_transactions_have_both_money_in_and_money_out(self):
        self.assertTrue(any(t['amount'] > 0 for t in self.transactions))
        self.assertTrue(any(t['amount'] < 0 for t in self.transactions))
        self.assertNotIn(0, [t['amount'] for t in self.transactions])
        self.assertGreaterEqual(len({t['transaction_type'] for t in self.transactions}), 2)

    def test_closing_balance_is_the_opening_balance_plus_the_rows(self):
        from demo_seed_data import TX_OPENING_BALANCE
        expected = round(TX_OPENING_BALANCE + sum(t['amount'] for t in self.transactions), 2)
        self.assertAlmostEqual(self.data['transaction_tab']['closing_balance'], expected, places=2)

    # ── nothing that could be mistaken for real data ─────────────────────────
    def test_contact_details_cannot_reach_a_real_person(self):
        for client in self.clients:
            self.assertTrue(client['email'].endswith('.example'), client['email'])
            self.assertRegex(client['phone'], r'^\+1 \(555\) 01\d\d$')

    def test_no_credentials_or_account_numbers_anywhere_in_the_dataset(self):
        blob = repr(self.data).lower()
        for forbidden in ('password', 'passwd', 'secret', 'api_key', 'token',
                          'iban', 'sort code', 'routing', 'ssn'):
            self.assertNotIn(forbidden, blob, forbidden)
        for transaction in self.transactions:
            self.assertEqual(transaction['account_number'], '')

    def test_descriptions_carry_no_long_digit_runs(self):
        # Guards against anything that could read as a card or account number.
        for transaction in self.transactions:
            self.assertNotRegex(transaction['description'], r'\d{6,}')


class TestDatasetAcrossReferenceDates(unittest.TestCase):
    """The dataset is rebuilt from `today`, so it must hold on any date."""

    def test_month_boundaries_and_leap_days(self):
        for reference in (date(2026, 1, 31), date(2026, 2, 28), date(2028, 2, 29),
                          date(2026, 12, 1), date(2027, 3, 31)):
            data = build_dataset(reference)
            with self.subTest(reference=reference):
                self.assertTrue(3 <= len(data['budget_tabs']) <= 4)
                self.assertEqual(
                    len({t['month'] for t in data['budget_tabs']}),
                    len(data['budget_tabs']))
                for tab in data['budget_tabs']:
                    for entry in tab['entries']:
                        self.assertTrue(entry['entry_date'].startswith(tab['month']))
                for transaction in data['transaction_tab']['transactions']:
                    self.assertLessEqual(transaction['transaction_date'], reference.isoformat())
                self.assertGreaterEqual(
                    len({t['month_year'] for t in data['transaction_tab']['transactions']}), 3)


class TestSeederSourceSafety(unittest.TestCase):
    """The seeder must not carry credentials or a hard-coded production target."""

    @classmethod
    def setUpClass(cls):
        path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'demo_seed', 'seed_demo_account.py')
        with open(path, encoding='utf-8') as handle:
            cls.source = handle.read()

    def test_credentials_come_from_the_environment(self):
        self.assertIn("os.getenv('DEMO_ACCOUNT_USERNAME'", self.source)
        self.assertIn("os.getenv('DEMO_ACCOUNT_PASSWORD'", self.source)

    def test_no_password_literal_is_committed(self):
        for line in self.source.splitlines():
            self.assertNotRegex(
                line, r'(?i)password\s*=\s*[\'"][^\'"]+[\'"]',
                f'possible credential literal: {line.strip()}')

    def test_the_password_is_never_printed(self):
        for line in self.source.splitlines():
            if re.search(r'\bprint\(', line):
                self.assertNotIn('password', line.lower(), line.strip())

    def test_the_default_target_is_local(self):
        self.assertIn("DEFAULT_API_BASE = 'http://127.0.0.1:5001/api'", self.source)


if __name__ == '__main__':
    unittest.main()
