"""Regression tests for complete account-data deletion."""
import ast
import os
import unittest


AUTH_DELETE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'routes',
    'auth_delete.py',
)


def _deletion_targets():
    """Read the constant without importing the configured Flask application."""
    with open(AUTH_DELETE_PATH, encoding='utf-8') as source:
        tree = ast.parse(source.read())
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'USER_DATA_DELETIONS':
                    return tuple(ast.literal_eval(node.value))
    raise AssertionError('USER_DATA_DELETIONS was not found')


class TestAccountDeletionCoverage(unittest.TestCase):
    def test_all_user_owned_data_is_deleted(self):
        targets = set(_deletion_targets())
        expected = {
            ('password_reset_tokens', 'user_id'),
            ('tasks', 'created_by'),
            ('stock_portfolio', 'created_by'),
            ('portfolio_tabs', 'owner'),
            ('bank_transactions', 'uploaded_by'),
            ('transaction_tabs', 'owner'),
            ('budget_bank_links', 'owner'),
            ('bank_transaction_audit_log', 'username'),
            ('budget_entries', 'owner'),
            ('budget_daily_balances', 'owner'),
            ('budget_tabs', 'owner'),
            ('watched_stocks', 'username'),
            ('yahoo_portfolio', 'username'),
            ('tags', 'owner'),
            ('categories_master', 'owner'),
            ('clients', 'owner'),
            ('trash', 'owner'),
            ('renovation_attachments', 'owner'),
            ('renovation_payments', 'owner'),
            ('renovation_items', 'owner'),
        }
        self.assertEqual(targets, expected)

    def test_bank_transactions_use_the_real_owner_column(self):
        self.assertIn(('bank_transactions', 'uploaded_by'), _deletion_targets())
        self.assertNotIn(('bank_transactions', 'username'), _deletion_targets())


if __name__ == '__main__':
    unittest.main()
