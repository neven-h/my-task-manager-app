"""Rotating DATA_ENCRYPTION_KEY: after rekey, nothing needs the old key.

Every encrypted value opens under the new key alone, a second pass rewrites
nothing, legacy plaintext is encrypted, and a value no key opens is an error
(decrypt_field never hands ciphertext back as data).

Runs with stdlib unittest, from backend/:
    venv/bin/python -m unittest tests.test_rekey
"""
import os
import sys
import unittest

from cryptography.fernet import Fernet, InvalidToken

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('CI', 'true')  # auth_utils skips its production secret checks

import crypto  # noqa: E402
from rekey import ENCRYPTED, rekey_all  # noqa: E402

OLD, NEW = Fernet.generate_key().decode(), Fernet.generate_key().decode()


def use(current, previous=None):
    os.environ['DATA_ENCRYPTION_KEY'] = current
    os.environ.pop('DATA_ENCRYPTION_KEY_PREVIOUS', None)
    if previous:
        os.environ['DATA_ENCRYPTION_KEY_PREVIOUS'] = previous
    crypto._ring.cache_clear()
    crypto._current.cache_clear()


class FakeCursor:
    """Just the two statements rekey issues, over {table: {id: row}}."""

    def __init__(self, tables):
        self.tables, self._rows = tables, []

    def execute(self, sql, params=()):
        table = sql.split(' FROM ')[-1].split()[0] if sql.startswith('SELECT') else sql.split()[1]
        if sql.startswith('SELECT'):
            self._rows = [dict(row) for row in self.tables[table].values()]
        else:
            columns = [part.split(' = ')[0] for part in sql.split(' SET ')[1].split(' WHERE ')[0].split(', ')]
            self.tables[table][params[-1]].update(zip(columns, params[:-1]))

    def fetchall(self):
        return self._rows


class RekeyTest(unittest.TestCase):

    def setUp(self):
        self.saved = {k: os.environ.get(k) for k in ('DATA_ENCRYPTION_KEY', 'DATA_ENCRYPTION_KEY_PREVIOUS')}
        use(OLD)
        enc = crypto.encrypt_field
        self.cursor = FakeCursor({
            'bank_transactions': {
                1: {'id': 1, 'account_number': enc('12-345'), 'description': enc('SUPER-SAL'), 'amount': enc('-82.5')},
                2: {'id': 2, 'account_number': '', 'description': 'legacy plaintext', 'amount': '10'},
            },
            'users': {1: {'id': 1, 'two_factor_secret': enc('JBSWY3DPEHPK3PXP')},
                      2: {'id': 2, 'two_factor_secret': None}},
        })

    def tearDown(self):
        for key, value in self.saved.items():
            os.environ.pop(key, None) if value is None else os.environ.__setitem__(key, value)
        crypto._ring.cache_clear()
        crypto._current.cache_clear()

    def stored(self):
        for table, columns in ENCRYPTED.items():
            for row in self.cursor.tables[table].values():
                for column in columns:
                    if row[column]:
                        yield row[column]

    def test_after_rekey_nothing_needs_the_old_key(self):
        use(NEW, previous=OLD)
        rekey_all(self.cursor)
        self.assertEqual(rekey_all(self.cursor),
                         {table: (0, 0) for table in ENCRYPTED})  # idempotent
        use(NEW)  # the old key removed from the environment
        opened = [crypto.decrypt_field(value) for value in self.stored()]
        self.assertEqual(sorted(opened), sorted(
            ['12-345', 'SUPER-SAL', '-82.5', 'legacy plaintext', '10', 'JBSWY3DPEHPK3PXP']))

    def test_a_value_no_key_opens_is_an_error_not_data(self):
        use(NEW)
        with self.assertRaises(InvalidToken):
            crypto.decrypt_field(self.cursor.tables['users'][1]['two_factor_secret'])
        self.assertEqual(rekey_all(self.cursor)['users'], (0, 1))  # counted, left as it was

    def test_new_writes_use_the_new_key(self):
        use(NEW, previous=OLD)
        token = crypto.encrypt_field('x')
        use(NEW)
        self.assertEqual(crypto.decrypt_field(token), 'x')


if __name__ == '__main__':
    unittest.main()
