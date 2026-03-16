"""Budget file parser — detect and parse Israeli bank account statements."""
import os, re
import pandas as pd

_DATE_RE = re.compile(r'^\d{2}[./]\d{2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')
_DATE_NAMES = {'תאריך', 'תאריך ערך', 'תאריך פעולה', 'date'}
_DESC_NAMES = {'תיאור', 'פרטים', 'פעולה', 'תאור', 'בית עסק', 'description', 'details'}
_CREDIT_NAMES = {'זכות', 'credit', 'הכנסה'}
_DEBIT_NAMES = {'חובה', 'debit', 'הוצאה'}
_AMOUNT_NAMES = {'סכום', 'amount', 'סכום בש"ח', 'סכום עסקה'}
_CATEGORY_NAMES = {'קטגוריה', 'category', 'סוג'}


def _find_col(df_columns, name_set):
    """Find first column whose lowered/stripped name matches any in name_set."""
    for col in df_columns:
        cleaned = re.sub(r'[\r\n]+', ' ', str(col)).strip().lower()
        if cleaned in {n.lower() for n in name_set}:
            return col
    return None


def _load_df(file_path):
    """Load CSV or Excel, auto-detect header row, return DataFrame."""
    ext = os.path.splitext(file_path)[1].lower()

    HEADER_KEYWORDS = {
        "תאריך", "סכום", "תיאור", "פרטים", "חובה", "זכות", "יתרה",
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


def _parse_date(val):
    """Parse a date value, handling common Israeli formats."""
    if isinstance(val, pd.Timestamp):
        return val
    s = str(val).strip()
    if not s or s in ('nan', 'NaT', 'NaN'):
        return pd.NaT
    for fmt in ('%d/%m/%Y', '%d/%m/%y', '%d.%m.%Y', '%d.%m.%y',
                '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        result = pd.to_datetime(s, format=fmt, errors='coerce')
        if pd.notna(result):
            return result
    return pd.to_datetime(s, dayfirst=True, errors='coerce')


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
    """Detect date/desc/amount columns by name or content fallback."""
    date_col = _find_col(df.columns, _DATE_NAMES)
    desc_col = _find_col(df.columns, _DESC_NAMES)
    amount_col = _find_col(df.columns, _AMOUNT_NAMES)
    credit_col = _find_col(df.columns, _CREDIT_NAMES)
    debit_col = _find_col(df.columns, _DEBIT_NAMES)
    category_col = _find_col(df.columns, _CATEGORY_NAMES)

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

    return date_col, desc_col, amount_col, credit_col, debit_col, category_col


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


def parse_budget_file(file_path):
    """Parse a bank statement file and return list of budget entry dicts.

    Each entry: {type, description, amount, entry_date, category}
    """
    df = _load_df(file_path)
    date_col, desc_col, amount_col, credit_col, debit_col, category_col = \
        _detect_columns(df)

    if not date_col:
        raise ValueError("Could not detect a date column")
    if not amount_col and not (credit_col or debit_col):
        raise ValueError("Could not detect amount/credit/debit columns")

    entries = []
    for _, row in df.iterrows():
        dt = _parse_date(row[date_col])
        if pd.isna(dt):
            continue
        result = _resolve_amount(row, amount_col, credit_col, debit_col)
        if result is None:
            continue
        entry_type, amount = result

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

        entries.append({
            'type': entry_type,
            'description': description,
            'amount': round(amount, 2),
            'entry_date': dt.strftime('%Y-%m-%d'),
            'category': category,
        })

    if not entries:
        raise ValueError("No valid entries found in file")

    inc = sum(1 for e in entries if e['type'] == 'income')
    print(f"[BUDGET_PARSER] Parsed {len(entries)} entries "
          f"({inc} income, {len(entries) - inc} expense)", flush=True)
    return entries
