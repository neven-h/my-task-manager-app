"""
Tests for transaction-import dedup (occurrence-multiplicity).

Regression guard for the export -> import round-trip bug where genuinely
distinct rows sharing the same (date, amount, description) were silently
dropped because dedup treated the key as present/absent instead of counting
occurrences. See helpers.select_non_duplicate_indices.

Runs with stdlib unittest (no pytest needed):
    backend/venv/bin/python -m unittest backend.tests.test_transactions_dedup
or, from the backend/ directory:
    venv/bin/python -m unittest tests.test_transactions_dedup
It is also collected by pytest if installed.
"""
import os
import sys
import unittest
from collections import Counter

# Make `import helpers` work regardless of the runner's cwd.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import select_non_duplicate_indices  # noqa: E402


def _key(date, amount, desc):
    """Build a dedup key matching the shape used by the route."""
    return (date, round(float(amount), 2), desc.strip().lower())


class TestSelectNonDuplicateIndices(unittest.TestCase):
    def test_round_trip_into_empty_tab_keeps_all_rows(self):
        """The reported bug: 1785 rows incl. 31 same-key repeats -> none dropped."""
        keys = []
        # 1754 unique rows.
        for i in range(1754):
            keys.append(_key('2026-01-01', i + 1, f'tx-{i}'))
        # 31 extra rows that each duplicate an existing key within the same file.
        for i in range(31):
            keys.append(_key('2026-01-01', i + 1, f'tx-{i}'))
        self.assertEqual(len(keys), 1785)

        kept, skipped = select_non_duplicate_indices(keys, Counter())

        self.assertEqual(skipped, 0)
        self.assertEqual(len(kept), 1785)
        self.assertEqual(kept, list(range(1785)))

    def test_genuine_same_day_duplicates_are_preserved(self):
        """Two identical purchases on the same day are both kept (new tab)."""
        keys = [
            _key('2026-06-25', 12.50, 'Coffee Shop'),
            _key('2026-06-25', 12.50, 'Coffee Shop'),
        ]
        kept, skipped = select_non_duplicate_indices(keys, Counter())
        self.assertEqual(skipped, 0)
        self.assertEqual(kept, [0, 1])

    def test_reimport_same_statement_is_idempotent(self):
        """Re-importing a file already fully present -> everything skipped."""
        keys = [
            _key('2026-06-25', 12.50, 'Coffee Shop'),
            _key('2026-06-25', 12.50, 'Coffee Shop'),
            _key('2026-06-24', -100.0, 'Rent'),
        ]
        existing = Counter(keys)  # tab already holds exactly these rows
        kept, skipped = select_non_duplicate_indices(keys, existing)
        self.assertEqual(kept, [])
        self.assertEqual(skipped, 3)

    def test_partial_overlap_keeps_only_the_excess(self):
        """Tab has 1 copy of a key; batch has 3 -> keep the 2 new occurrences."""
        k = _key('2026-06-25', 12.50, 'Coffee Shop')
        keys = [k, k, k]
        existing = Counter({k: 1})
        kept, skipped = select_non_duplicate_indices(keys, existing)
        self.assertEqual(skipped, 1)
        self.assertEqual(len(kept), 2)
        # The kept rows are the later occurrences in batch order.
        self.assertEqual(kept, [1, 2])

    def test_existing_more_than_batch_skips_all(self):
        """Existing multiplicity exceeds the batch -> all batch rows skipped."""
        k = _key('2026-06-25', 12.50, 'Coffee Shop')
        keys = [k]
        existing = Counter({k: 5})
        kept, skipped = select_non_duplicate_indices(keys, existing)
        self.assertEqual(kept, [])
        self.assertEqual(skipped, 1)

    def test_mixed_new_and_duplicate_rows(self):
        dup = _key('2026-06-25', 12.50, 'Coffee Shop')
        new1 = _key('2026-06-25', 30.00, 'Groceries')
        new2 = _key('2026-06-26', 9.99, 'Streaming')
        keys = [dup, new1, dup, new2]
        existing = Counter({dup: 1})  # one copy of `dup` already in the tab
        kept, skipped = select_non_duplicate_indices(keys, existing)
        # First `dup` matches the existing copy (skipped); second `dup` is kept.
        self.assertEqual(skipped, 1)
        self.assertEqual(kept, [1, 2, 3])

    def test_empty_batch(self):
        kept, skipped = select_non_duplicate_indices([], Counter())
        self.assertEqual(kept, [])
        self.assertEqual(skipped, 0)

    def test_accepts_plain_dict_for_existing_counts(self):
        """existing_counts only needs .get(); a plain dict must also work."""
        k = _key('2026-06-25', 12.50, 'Coffee Shop')
        kept, skipped = select_non_duplicate_indices([k, k], {k: 1})
        self.assertEqual(skipped, 1)
        self.assertEqual(kept, [1])


if __name__ == '__main__':
    unittest.main()
