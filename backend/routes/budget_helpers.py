"""Shared DB helpers for budget routes."""
import logging
from mysql.connector import Error as MySQLError

logger = logging.getLogger(__name__)

_CREATE_BUDGET_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS budget_entries (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        type        ENUM('income','outcome') NOT NULL,
        description VARCHAR(500) NOT NULL,
        amount      DECIMAL(12,2) NOT NULL,
        entry_date  DATE NOT NULL,
        category    VARCHAR(100),
        notes       TEXT,
        owner       VARCHAR(255),
        tab_id      INT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_budget_owner  (owner),
        INDEX idx_budget_date   (entry_date),
        INDEX idx_budget_tab    (tab_id)
    )
"""


def ensure_budget_table(conn):
    """Guarantee budget_entries exists with all required columns."""
    cur = conn.cursor()
    cur.execute(_CREATE_BUDGET_TABLE_SQL)
    for ddl in (
        "ALTER TABLE budget_entries ADD COLUMN tab_id INT",
        "ALTER TABLE budget_entries ADD INDEX idx_budget_tab (tab_id)",
        "ALTER TABLE budget_entries ADD COLUMN source VARCHAR(20) DEFAULT 'manual'",
    ):
        try:
            cur.execute(ddl)
        except MySQLError as e:
            if 'Duplicate column' not in str(e) and 'Duplicate key' not in str(e):
                logger.warning('budget migration note: %s', e)
    cur.close()


def serialize_entry(e):
    """Convert Decimal/date fields to JSON-safe types."""
    e['amount'] = float(e['amount'])
    for f in ('entry_date', 'created_at', 'updated_at'):
        if e.get(f):
            e[f] = str(e[f])
    return e
