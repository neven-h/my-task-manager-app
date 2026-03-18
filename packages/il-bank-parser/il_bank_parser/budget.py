"""Budget file parser — detect and parse Israeli bank account statements."""
from __future__ import annotations

from typing import List, Dict, Any

import pandas as pd

from il_bank_parser.loader import load_file
from il_bank_parser.columns import detect_columns
from il_bank_parser.normalizers import detect_date_order, parse_date, parse_amount


def _resolve_amount(row, cols: dict):
    """Return (entry_type, amount) or None if the row should be skipped."""
    amount_col = cols['amount']
    credit_col = cols['credit']
    debit_col  = cols['debit']

    if credit_col and debit_col:
        credit_val = parse_amount(row[credit_col])
        debit_val  = parse_amount(row[debit_col])
        if credit_val and credit_val > 0:
            return 'income', credit_val
        if debit_val and debit_val > 0:
            return 'outcome', debit_val
        if credit_val and credit_val < 0:
            return 'outcome', abs(credit_val)
        if debit_val and debit_val < 0:
            return 'income', abs(debit_val)
        return None

    amt = parse_amount(row[amount_col])
    if amt is None or amt == 0:
        return None
    return ('income', amt) if amt > 0 else ('outcome', abs(amt))


def _derive_expenses_from_balance(rows: list) -> list:
    """Derive implied expense entries from consecutive balance differences."""
    expenses = []
    for i in range(1, len(rows)):
        prev_bal = rows[i - 1]['balance']
        cur = rows[i]
        implied = prev_bal + cur['income'] - cur['balance']
        if implied > 0.01:
            expenses.append({
                'type': 'outcome',
                'description': 'Bank expense (derived)',
                'amount': round(implied, 2),
                'entry_date': cur['entry_date'],
                'category': 'Bank expense',
                'notes': None,
            })
    return expenses


def parse_budget_file(file_path: str) -> List[Dict[str, Any]]:
    """Parse a bank statement file; return a list of budget entry dicts.

    Each dict has keys: type, description, amount, entry_date, category, notes.
    Raises ValueError if the file cannot be parsed.
    """
    df = load_file(file_path)
    cols = detect_columns(df)

    date_col = cols['date']
    amount_col = cols['amount']
    credit_col = cols['credit']
    debit_col  = cols['debit']

    if not date_col:
        raise ValueError("Could not detect a date column")
    if not amount_col and not (credit_col or debit_col):
        raise ValueError("Could not detect amount/credit/debit columns")

    date_order = detect_date_order(df, date_col)
    entries, balance_rows, has_direct_expenses = [], [], False

    for _, row in df.iterrows():
        dt = parse_date(row[date_col], date_order)
        if pd.isna(dt):
            continue

        result = _resolve_amount(row, cols)
        if result is None:
            continue
        entry_type, amount = result

        # Self-export round-trip: override type from explicit Type column
        type_col = cols['type']
        if type_col and pd.notna(row[type_col]):
            type_str = str(row[type_col]).strip().lower()
            if type_str in ('income', 'הכנסה'):
                entry_type = 'income'
            elif type_str in ('expense', 'outcome', 'הוצאה'):
                entry_type = 'outcome'

        if entry_type == 'outcome':
            has_direct_expenses = True

        desc_col = cols['desc']
        description = str(row[desc_col]).strip() if desc_col and pd.notna(row[desc_col]) else ''
        if description in ('nan', 'NaN', ''):
            description = 'Unknown'

        category = None
        cat_col = cols['category']
        if cat_col and pd.notna(row[cat_col]):
            cat = str(row[cat_col]).strip()
            if cat not in ('nan', 'NaN', ''):
                category = cat

        notes = None
        notes_col = cols['notes']
        if notes_col and pd.notna(row[notes_col]):
            n = str(row[notes_col]).strip()
            if n not in ('nan', 'NaN', ''):
                notes = n

        entry_date = dt.strftime('%Y-%m-%d')
        entries.append({
            'type': entry_type,
            'description': description,
            'amount': round(amount, 2),
            'entry_date': entry_date,
            'category': category,
            'notes': notes,
        })

        bal_col = cols['balance']
        if bal_col:
            bal = parse_amount(row[bal_col])
            if bal is not None:
                balance_rows.append({
                    'entry_date': entry_date,
                    'income': amount if entry_type == 'income' else 0,
                    'balance': bal,
                })

    if not has_direct_expenses and len(balance_rows) >= 2:
        if balance_rows[0]['entry_date'] > balance_rows[-1]['entry_date']:
            balance_rows = list(reversed(balance_rows))
        entries.extend(_derive_expenses_from_balance(balance_rows))

    if not entries:
        raise ValueError("No valid entries found in file")

    return entries
