"""Restore helpers for trash items — budget tabs, transaction tabs, and tasks.

None of these functions commit. The caller (restore_from_trash) commits
after deleting the trash record so the entire restore is atomic.
"""


def _restore_budget_tab(conn, owner: str, data: dict) -> int:
    """Restore a budget tab and its entries."""
    cursor = conn.cursor()

    tab_name = data.get('tab_name', 'Restored Tab')
    cursor.execute(
        "INSERT INTO budget_tabs (name, owner) VALUES (%s, %s)",
        (tab_name, owner)
    )
    new_tab_id = cursor.lastrowid

    for e in data.get('entries', []):
        cursor.execute(
            "INSERT INTO budget_entries (type, description, amount, entry_date, category, notes, owner, tab_id, source) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (e.get('type'), e.get('description'), e.get('amount'), e.get('entry_date'),
             e.get('category'), e.get('notes'), owner, new_tab_id, e.get('source', 'restored'))
        )

    for b in data.get('daily_balances', []):
        cursor.execute(
            "INSERT INTO budget_daily_balances (owner, tab_id, entry_date, balance, source) "
            "VALUES (%s, %s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE balance = VALUES(balance)",
            (owner, new_tab_id, b.get('entry_date'), b.get('balance'), 'restored')
        )

    cursor.close()
    return new_tab_id


def _restore_transaction_tab(conn, owner: str, data: dict) -> int:
    """Restore a transaction tab and its transactions."""
    cursor = conn.cursor()

    tab_name = data.get('tab_name', 'Restored Tab')
    cursor.execute(
        "INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)",
        (tab_name, owner)
    )
    new_tab_id = cursor.lastrowid

    for t in data.get('transactions', []):
        cursor.execute(
            "INSERT INTO bank_transactions "
            "(account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (t.get('account_number'), t.get('transaction_date'), t.get('description'),
             t.get('amount'), t.get('month_year'), t.get('transaction_type'),
             owner, new_tab_id)
        )

    cursor.close()
    return new_tab_id


def _restore_task(conn, owner: str, data: dict) -> int:
    """Restore a task."""
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO tasks
           (title, description, category, categories, client, task_date, task_time,
            duration, status, tags, notes, shared, is_draft, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (data.get('title'), data.get('description'), data.get('category'),
         data.get('categories'), data.get('client'), data.get('task_date'),
         data.get('task_time'), data.get('duration'), data.get('status', 'uncompleted'),
         data.get('tags'), data.get('notes'), data.get('shared'), data.get('is_draft', False),
         owner)
    )
    new_id = cursor.lastrowid
    cursor.close()
    return new_id
