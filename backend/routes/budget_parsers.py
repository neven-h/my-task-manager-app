"""Budget file parser — detect and parse Israeli bank account statements."""
import os, re
import pandas as pd

_DATE_RE = re.compile(r'^\d{1,2}[./]\d{1,2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')
_DATE_NAMES = {'תאריך', 'תאריך ערך', 'תאריך פעולה', 'יום ערך', 'date'}
_DESC_NAMES = {
    'תיאור', 'תיאור התנועה', 'פרטים', 'פעולה', 'תאור',
    'בית עסק', 'description', 'details',
}
_CREDIT_NAMES = {'זכות', 'credit', 'הכנסה'}
_DEBIT_NAMES = {'חובה', 'debit', 'הוצאה'}
_AMOUNT_NAMES = {
    'סכום', 'amount', 'סכום בש"ח', 'סכום עסקה',
    '₪ זכות/חובה', 'זכות/חובה',
}
_CATEGORY_NAMES = {'קטגוריה', 'category', 'סוג'}
_BALANCE_NAMES = {'יתרה', 'balance', '₪ יתרה'}


def _find_col(df_columns, name_set):
    """Find first column whose lowered/stripped name matches any in name_set.

    Tries exact match first, then substring containment as fallback.
    """
    lower_names = {n.lower() for n in name_set}
    # Exact match
    for col in df_columns:
        cleaned = re.sub(r'[\r\n]+', ' ', str(col)).strip().lower()
        if cleaned in lower_names:
            return col
    # Substring fallback (e.g. 'זכות' matches '₪ זכות/חובה')
    for col in df_columns:
        cleaned = re.sub(r'[\r\n]+', ' ', str(col)).strip().lower()
        for n in lower_names:
            if n in cleaned or cleaned in n:
                return col
    return None


def _load_df(file_path):
    """Load CSV or Excel, auto-detect header row, return DataFrame."""
    ext = os.path.splitext(file_path)[1].lower()

    HEADER_KEYWORDS = {
        "תאריך", "סכום", "תיאור", "פרטים", "חובה", "זכות", "יתרה",
        "תיאור התנועה", "זכות/חובה", "יום ערך", "אסמכתה", "ערוץ ביצוע",
        "date", "amount", "description", "balance", "credit", "debit",
    }

    enc = 'utf-8-sig'
    if ext in ('.xlsx', '.xls'):
        raw = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)
    else:
        for enc in ('utf-8-sig', 'utf-8', 'windows-1255', 'iso-8859-8'):
            try:
                raw = pd.read_csv(file_path, header=None, dtype=str, encoding=enc)
                if len(raw.columns) > 1:
                    break
            except Exception:
                continue
        else:
            raise ValueError("Could not decode file")

    # Find the header row
    header_row = 0
    best_hits = 0
    for i, row in raw.iterrows():
        if i > 20:
            break
        cells = [str(c).strip().lower() for c in row if pd.notna(c) and str(c).strip()]
        hits = sum(1 for kw in HEADER_KEYWORDS if any(kw.lower() in c for c in cells))
        if hits > best_hits:
            best_hits = hits
            header_row = i

    if ext in ('.xlsx', '.xls'):
        df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    else:
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding=enc)

    df.columns = [re.sub(r'[\r\n]+', ' ', str(c)).strip() for c in df.columns]
    df = df.dropna(how='all').reset_index(drop=True)
    return df


def _detect_date_order(df, date_col):
    """Detect whether dates use D/M/Y or M/D/Y by scanning for values > 12."""
    for _, val in df[date_col].dropna().head(50).items():
        s = str(val).strip()
        parts = re.split(r'[./]', s)
        if len(parts) >= 2:
            try:
                second = int(parts[1])
                if second > 12:
                    return 'mdy'
            except ValueError:
                continue
    return 'dmy'


def _parse_date(val, date_order='dmy'):
    """Parse a date value, handling common Israeli and US formats."""
    if isinstance(val, pd.Timestamp):
        return val
    s = str(val).strip()
    if not s or s in ('nan', 'NaT', 'NaN'):
        return pd.NaT

    if date_order == 'mdy':
        fmts = ('%m/%d/%Y', '%m/%d/%y', '%m.%d.%Y', '%m.%d.%y',
                '%Y-%m-%d %H:%M:%S', '%Y-%m-%d')
    else:
        fmts = ('%d/%m/%Y', '%d/%m/%y', '%d.%m.%Y', '%d.%m.%y',
                '%Y-%m-%d %H:%M:%S', '%Y-%m-%d')

    for fmt in fmts:
        result = pd.to_datetime(s, format=fmt, errors='coerce')
        if pd.notna(result):
            return result
    return pd.to_datetime(s, dayfirst=(date_order == 'dmy'), errors='coerce')


def _parse_amount(val):
    """Parse amount string, handling commas and Hebrew formatting."""
    if pd.isna(val):
        return None
    s = str(val).strip().replace(',', '').replace('₪', '')
    s = s.replace('\u200e', '').replace('\u200f', '')
    if not s or s in ('nan', 'NaN', ''):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _detect_columns(df):
    """Detect date/desc/amount/balance columns by name or content fallback."""
    date_col = _find_col(df.columns, _DATE_NAMES)
    desc_col = _find_col(df.columns, _DESC_NAMES)
    amount_col = _find_col(df.columns, _AMOUNT_NAMES)
    credit_col = _find_col(df.columns, _CREDIT_NAMES)
    debit_col = _find_col(df.columns, _DEBIT_NAMES)
    category_col = _find_col(df.columns, _CATEGORY_NAMES)
    balance_col = _find_col(df.columns, _BALANCE_NAMES)

    # If credit/debit resolved to the same column as amount, clear them
    # (happens when a combined column like '₪ זכות/חובה' matches all three)
    if amount_col and credit_col == amount_col:
        credit_col = None
    if amount_col and debit_col == amount_col:
        debit_col = None

    # Balance column must not collide with amount column
    if balance_col and balance_col == amount_col:
        balance_col = None

    if not date_col or (not amount_col and not (credit_col or debit_col)):
        for col in df.columns:
            sample = df[col].dropna().head(10).astype(str).str.strip()
            non_empty = sample[sample.ne('') & sample.ne('nan')]
            if non_empty.empty:
                continue
            if not date_col and non_empty.str.match(_DATE_RE).mean() > 0.5:
                date_col = col
            elif not amount_col and not credit_col:
                nums = pd.to_numeric(
                    non_empty.str.replace(',', '', regex=False), errors='coerce')
                if nums.notna().mean() > 0.5:
                    amount_col = col
            elif not desc_col:
                has_text = non_empty.str.contains(
                    r'[\u0590-\u05FF]|[a-zA-Z]{3,}', regex=True)
                if has_text.mean() > 0.3:
                    desc_col = col

    return date_col, desc_col, amount_col, credit_col, debit_col, category_col, balance_col


def _resolve_amount(row, amount_col, credit_col, debit_col):
    """Return (entry_type, amount) or None if row should be skipped."""
    if credit_col and debit_col:
        credit_val = _parse_amount(row[credit_col])
        debit_val = _parse_amount(row[debit_col])
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
    """Given rows sorted chronologically with (date, desc, income, balance),
    derive implied expense entries from consecutive balance differences.

    Formula: implied_expense = prev_balance + current_income - current_balance
    """
    expenses = []
    for i in range(1, len(rows)):
        prev_bal = rows[i - 1]['balance']
        cur = rows[i]
        implied = prev_bal + cur['income'] - cur['balance']
        if implied > 0.01:  # threshold to avoid floating-point noise
            expenses.append({
                'type': 'outcome',
                'description': f"Bank expense (derived)",
                'amount': round(implied, 2),
                'entry_date': cur['entry_date'],
                'category': 'Bank expense',
            })
    return expenses


def parse_budget_file(file_path):
    """Parse a bank statement file and return list of budget entry dicts.

    Each entry: {type, description, amount, entry_date, category}

    When a balance column is detected, implied expenses are derived from
    consecutive balance differences.
    """
    df = _load_df(file_path)
    date_col, desc_col, amount_col, credit_col, debit_col, category_col, balance_col = \
        _detect_columns(df)

    if not date_col:
        raise ValueError("Could not detect a date column")
    if not amount_col and not (credit_col or debit_col):
        raise ValueError("Could not detect amount/credit/debit columns")

    # Detect date format (M/D/Y vs D/M/Y)
    date_order = _detect_date_order(df, date_col)

    entries = []
    balance_rows = []  # for deriving expenses when balance_col present
    has_direct_expenses = False  # True if file already contains explicit expense rows

    for row_idx, row in df.iterrows():
        dt = _parse_date(row[date_col], date_order)
        if pd.isna(dt):
            continue
        result = _resolve_amount(row, amount_col, credit_col, debit_col)
        if result is None:
            continue
        entry_type, amount = result

        if entry_type == 'outcome':
            has_direct_expenses = True

        description = ''
        if desc_col and pd.notna(row[desc_col]):
            description = str(row[desc_col]).strip()
            if description in ('nan', 'NaN'):
                description = ''
        if not description:
            description = 'Unknown'

        category = None
        if category_col and pd.notna(row[category_col]):
            cat = str(row[category_col]).strip()
            if cat not in ('nan', 'NaN', ''):
                category = cat

        entry_date = dt.strftime('%Y-%m-%d')

        entries.append({
            'type': entry_type,
            'description': description,
            'amount': round(amount, 2),
            'entry_date': entry_date,
            'category': category,
        })

        # Collect balance data for expense derivation (only used for income-only files)
        if balance_col:
            bal = _parse_amount(row[balance_col])
            if bal is not None:
                balance_rows.append({
                    'row_idx': row_idx,
                    'entry_date': entry_date,
                    'income': amount if entry_type == 'income' else 0,
                    'balance': bal,
                })

    # Only derive implied expenses from balance when the file has NO direct expense rows.
    # Combined income+expense files (e.g. עובר ושב / checking account export) already
    # contain every transaction explicitly — running the derivation would create duplicates.
    if not has_direct_expenses and balance_rows and len(balance_rows) >= 2:
        # Detect order: if first date > last date, file is newest-first
        if balance_rows[0]['entry_date'] > balance_rows[-1]['entry_date']:
            balance_rows = list(reversed(balance_rows))

        derived = _derive_expenses_from_balance(balance_rows)
        entries.extend(derived)
        print(f"[BUDGET_PARSER] Derived {len(derived)} expense entries from balance column", flush=True)
    elif has_direct_expenses and balance_rows:
        print(f"[BUDGET_PARSER] Skipping balance derivation — file contains explicit expense rows", flush=True)

    if not entries:
        raise ValueError("No valid entries found in file")

    inc = sum(1 for e in entries if e['type'] == 'income')
    print(f"[BUDGET_PARSER] Parsed {len(entries)} entries "
          f"({inc} income, {len(entries) - inc} expense)", flush=True)
    return entries
