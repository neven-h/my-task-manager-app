"""Low-level I/O and parsing primitives used by budget_parsers.py."""
import os
import re

import pandas as pd

# ── Column name sets ──────────────────────────────────────────────────────────
_DATE_RE = re.compile(r'^\d{1,2}[./]\d{1,2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')
_DATE_NAMES     = {'תאריך', 'תאריך ערך', 'תאריך פעולה', 'יום ערך', 'date'}
_DESC_NAMES     = {'תיאור', 'תיאור התנועה', 'פרטים', 'פעולה', 'תאור', 'בית עסק', 'description', 'details'}
_CREDIT_NAMES   = {'זכות', 'credit', 'הכנסה'}
_DEBIT_NAMES    = {'חובה', 'debit', 'הוצאה'}
_AMOUNT_NAMES   = {'סכום', 'amount', 'סכום בש"ח', 'סכום עסקה', '₪ זכות/חובה', 'זכות/חובה'}
_CATEGORY_NAMES = {'קטגוריה', 'category', 'סוג'}
_BALANCE_NAMES  = {'יתרה', 'balance', '₪ יתרה'}
# Self-export columns
_TYPE_NAMES     = {'type', 'entry type', 'transaction type', 'סוג פעולה'}
_NOTES_NAMES    = {'notes', 'note', 'הערות', 'הערה', 'remarks'}


def _find_col(df_columns, name_set):
    """Return the first column matching any name in name_set (exact then substring)."""
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


def _load_df(file_path):
    """Load CSV or Excel, auto-detect header row, return cleaned DataFrame."""
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

    header_row, best_hits = 0, 0
    for i, row in raw.iterrows():
        if i > 20:
            break
        cells = [str(c).strip().lower() for c in row if pd.notna(c) and str(c).strip()]
        hits = sum(1 for kw in HEADER_KEYWORDS if any(kw.lower() in c for c in cells))
        if hits > best_hits:
            best_hits, header_row = hits, i

    if ext in ('.xlsx', '.xls'):
        df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    else:
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding=enc)

    df.columns = [re.sub(r'[\r\n]+', ' ', str(c)).strip() for c in df.columns]
    return df.dropna(how='all').reset_index(drop=True)


def _detect_date_order(df, date_col):
    """Return 'mdy' if month comes first, else 'dmy'."""
    for _, val in df[date_col].dropna().head(50).items():
        parts = re.split(r'[./]', str(val).strip())
        if len(parts) >= 2:
            try:
                if int(parts[1]) > 12:
                    return 'mdy'
            except ValueError:
                continue
    return 'dmy'


def _parse_date(val, date_order='dmy'):
    """Parse a date value supporting common Israeli and US formats."""
    if isinstance(val, pd.Timestamp):
        return val
    s = str(val).strip()
    if not s or s in ('nan', 'NaT', 'NaN'):
        return pd.NaT
    fmts = (
        ('%m/%d/%Y', '%m/%d/%y', '%m.%d.%Y', '%m.%d.%y', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d')
        if date_order == 'mdy' else
        ('%d/%m/%Y', '%d/%m/%y', '%d.%m.%Y', '%d.%m.%y', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d')
    )
    for fmt in fmts:
        result = pd.to_datetime(s, format=fmt, errors='coerce')
        if pd.notna(result):
            return result
    return pd.to_datetime(s, dayfirst=(date_order == 'dmy'), errors='coerce')


def _parse_amount(val):
    """Parse amount string, handling commas and Hebrew RTL markers."""
    if pd.isna(val):
        return None
    s = str(val).strip().replace(',', '').replace('₪', '').replace('\u200e', '').replace('\u200f', '')
    if not s or s in ('nan', 'NaN'):
        return None
    try:
        return float(s)
    except ValueError:
        return None
