"""Column-name sets and detection logic for Israeli bank/budget exports."""
from __future__ import annotations

import re
from typing import Optional

import pandas as pd

from il_bank_parser.normalizers import _DATE_RE

# ── Column name sets ──────────────────────────────────────────────────────────
DATE_NAMES     = {'תאריך', 'תאריך ערך', 'תאריך פעולה', 'יום ערך', 'date'}
DESC_NAMES     = {'תיאור', 'תיאור התנועה', 'פרטים', 'פעולה', 'תאור', 'בית עסק', 'description', 'details'}
CREDIT_NAMES   = {'זכות', 'credit', 'הכנסה'}
DEBIT_NAMES    = {'חובה', 'debit', 'הוצאה'}
AMOUNT_NAMES   = {'סכום', 'amount', 'סכום בש"ח', 'סכום עסקה', '₪ זכות/חובה', 'זכות/חובה'}
CATEGORY_NAMES = {'קטגוריה', 'category', 'סוג'}
BALANCE_NAMES  = {'יתרה', 'balance', '₪ יתרה'}
TYPE_NAMES     = {'type', 'entry type', 'transaction type', 'סוג פעולה'}
NOTES_NAMES    = {'notes', 'note', 'הערות', 'הערה', 'remarks'}


def find_col(df_columns, name_set) -> Optional[str]:
    """Return the first column matching any name in name_set (exact, then substring)."""
    lower_names = {n.lower() for n in name_set}
    for col in df_columns:
        cleaned = re.sub(r'[\r\n]+', ' ', str(col)).strip().lower()
        if cleaned in lower_names:
            return col
    for col in df_columns:
        cleaned = re.sub(r'[\r\n]+', ' ', str(col)).strip().lower()
        for n in lower_names:
            if n in cleaned or cleaned in n:
                return col
    return None


def detect_columns(df: pd.DataFrame) -> dict:
    """Detect all known column roles in a bank/budget DataFrame.

    Returns a dict with keys:
      date, desc, amount, credit, debit, category, balance, type, notes
    Values are column-name strings or None.
    """
    date_col     = find_col(df.columns, DATE_NAMES)
    desc_col     = find_col(df.columns, DESC_NAMES)
    amount_col   = find_col(df.columns, AMOUNT_NAMES)
    credit_col   = find_col(df.columns, CREDIT_NAMES)
    debit_col    = find_col(df.columns, DEBIT_NAMES)
    category_col = find_col(df.columns, CATEGORY_NAMES)
    balance_col  = find_col(df.columns, BALANCE_NAMES)
    type_col     = find_col(df.columns, TYPE_NAMES)
    notes_col    = find_col(df.columns, NOTES_NAMES)

    # Resolve conflicts: don't let the same column fill two roles
    if amount_col and credit_col == amount_col:
        credit_col = None
    if amount_col and debit_col == amount_col:
        debit_col = None
    if balance_col and balance_col == amount_col:
        balance_col = None
    if type_col and type_col == amount_col:
        type_col = None

    # Heuristic fallback when headers weren't recognised
    if not date_col or (not amount_col and not (credit_col or debit_col)):
        for col in df.columns:
            sample = df[col].dropna().head(10).astype(str).str.strip()
            non_empty = sample[sample.ne('') & sample.ne('nan')]
            if non_empty.empty:
                continue
            if not date_col and non_empty.str.match(_DATE_RE).mean() > 0.5:
                date_col = col
            elif not amount_col and not credit_col:
                nums = pd.to_numeric(non_empty.str.replace(',', '', regex=False), errors='coerce')
                if nums.notna().mean() > 0.5:
                    amount_col = col
            elif not desc_col:
                if non_empty.str.contains(r'[\u0590-\u05FF]|[a-zA-Z]{3,}', regex=True).mean() > 0.3:
                    desc_col = col

    return dict(
        date=date_col, desc=desc_col, amount=amount_col,
        credit=credit_col, debit=debit_col, category=category_col,
        balance=balance_col, type=type_col, notes=notes_col,
    )
