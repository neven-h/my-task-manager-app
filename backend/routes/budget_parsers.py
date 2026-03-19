"""Budget file parser — detect and parse Israeli bank account statements."""
import pandas as pd
from .budget_parsers_io import (
    _DATE_RE, _DATE_NAMES, _DESC_NAMES, _CREDIT_NAMES, _DEBIT_NAMES,
    _AMOUNT_NAMES, _CATEGORY_NAMES, _BALANCE_NAMES, _TYPE_NAMES, _NOTES_NAMES,
    _find_col, _load_df, _detect_date_order, _parse_date, _parse_amount,
)


def _detect_columns(df):
    """Detect date/desc/amount/credit/debit/category/balance/type/notes columns."""
    date_col     = _find_col(df.columns, _DATE_NAMES)
    desc_col     = _find_col(df.columns, _DESC_NAMES)
    amount_col   = _find_col(df.columns, _AMOUNT_NAMES)
    credit_col   = _find_col(df.columns, _CREDIT_NAMES)
    debit_col    = _find_col(df.columns, _DEBIT_NAMES)
    category_col = _find_col(df.columns, _CATEGORY_NAMES)
    balance_col  = _find_col(df.columns, _BALANCE_NAMES)
    type_col     = _find_col(df.columns, _TYPE_NAMES)
    notes_col    = _find_col(df.columns, _NOTES_NAMES)

    if amount_col and credit_col == amount_col:
        credit_col = None
    if amount_col and debit_col == amount_col:
        debit_col = None
    if balance_col and balance_col == amount_col:
        balance_col = None
    if type_col and type_col == amount_col:
        type_col = None

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

    return date_col, desc_col, amount_col, credit_col, debit_col, category_col, balance_col, type_col, notes_col


def _resolve_amount(row, amount_col, credit_col, debit_col):
    """Return (entry_type, amount) or None if the row should be skipped."""
    if credit_col and debit_col:
        credit_val = _parse_amount(row[credit_col])
        debit_val  = _parse_amount(row[debit_col])
        if credit_val and credit_val > 0:
            return 'income', credit_val
        if debit_val and debit_val > 0:
            return 'outcome', debit_val
        if credit_val and credit_val < 0:
            return 'outcome', abs(credit_val)
        if debit_val and debit_val < 0:
            return 'income', abs(debit_val)
        return None
    amt = _parse_amount(row[amount_col])
    if amt is None or amt == 0:
        return None
    return ('income', amt) if amt > 0 else ('outcome', abs(amt))


def _derive_expenses_from_balance(rows):
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
            })
    return expenses


def parse_budget_file(file_path):
    """Parse a bank statement file; return list of budget entry dicts.

    Each entry: {type, description, amount, entry_date, category}
    """
    df = _load_df(file_path)
    date_col, desc_col, amount_col, credit_col, debit_col, category_col, balance_col, type_col, notes_col = \
        _detect_columns(df)

    if not date_col:
        raise ValueError("Could not detect a date column")
    if not amount_col and not (credit_col or debit_col):
        raise ValueError("Could not detect amount/credit/debit columns")

    date_order = _detect_date_order(df, date_col)
    entries, balance_rows, has_direct_expenses = [], [], False

    for _, row in df.iterrows():
        dt = _parse_date(row[date_col], date_order)
        if pd.isna(dt):
            continue
        result = _resolve_amount(row, amount_col, credit_col, debit_col)
        if result is None:
            continue
        entry_type, amount = result

        # Self-export round-trip: override type from explicit Type column
        if type_col and pd.notna(row[type_col]):
            type_str = str(row[type_col]).strip().lower()
            if type_str in ('income', 'הכנסה'):
                entry_type = 'income'
            elif type_str in ('expense', 'outcome', 'הוצאה'):
                entry_type = 'outcome'

        if entry_type == 'outcome':
            has_direct_expenses = True

        description = str(row[desc_col]).strip() if desc_col and pd.notna(row[desc_col]) else ''
        if description in ('nan', 'NaN', ''):
            description = 'Unknown'

        category = None
        if category_col and pd.notna(row[category_col]):
            cat = str(row[category_col]).strip()
            if cat not in ('nan', 'NaN', ''):
                category = cat

        notes = None
        if notes_col and pd.notna(row[notes_col]):
            n = str(row[notes_col]).strip()
            if n not in ('nan', 'NaN', ''):
                notes = n

        entry_date = dt.strftime('%Y-%m-%d')
        row_balance = None
        if balance_col:
            row_balance = _parse_amount(row[balance_col])
            if row_balance is not None:
                balance_rows.append({'entry_date': entry_date,
                                     'income': amount if entry_type == 'income' else 0,
                                     'balance': row_balance})

        entries.append({'type': entry_type, 'description': description,
                        'amount': round(amount, 2), 'entry_date': entry_date,
                        'category': category, 'notes': notes,
                        'balance': round(row_balance, 2) if row_balance is not None else None})

    if not has_direct_expenses and len(balance_rows) >= 2:
        if balance_rows[0]['entry_date'] > balance_rows[-1]['entry_date']:
            balance_rows = list(reversed(balance_rows))
        derived = _derive_expenses_from_balance(balance_rows)
        # Ensure derived entries always have a balance key (None) for consistency
        for d in derived:
            d.setdefault('balance', None)
        entries.extend(derived)

    if not entries:
        raise ValueError("No valid entries found in file")

    inc = sum(1 for e in entries if e['type'] == 'income')
    print(f"[BUDGET_PARSER] Parsed {len(entries)} entries ({inc} income, {len(entries)-inc} expense)", flush=True)
    return entries
