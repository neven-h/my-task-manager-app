"""Bank transaction file parser (credit, debit, cash)."""
from __future__ import annotations

import os
import re

import pandas as pd

from il_bank_parser.loader import load_file
from il_bank_parser.normalizers import parse_amount

try:
    from bank_csv_normalizer.normalize.io import load_csv
    from bank_csv_normalizer.convert import convert_df as _normalizer_convert
    _HAS_NORMALIZER = True
except ImportError:
    _HAS_NORMALIZER = False

_DATE_RE = re.compile(r'^\d{2}[./]\d{2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')
_DATE_FMTS = ('%d.%m.%Y', '%d/%m/%Y', '%d/%m/%y', '%d.%m.%y', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d')


def _parse_tx_date(val):
    if isinstance(val, pd.Timestamp):
        return val
    s = str(val).strip()
    if not s or s in ('nan', 'NaN', 'NaT'):
        return pd.NaT
    for fmt in _DATE_FMTS:
        result = pd.to_datetime(s, format=fmt, errors='coerce')
        if pd.notna(result):
            return result
    return pd.to_datetime(s, dayfirst=True, errors='coerce')


def _fix_credit_card_column_alignment(df: pd.DataFrame) -> pd.DataFrame:
    """Fix a common Israeli credit-card CSV export column-shift issue.

    Some exports include both 'חיוב לתאריך' (billing date) and 'תאריך'
    (transaction date) as headers, but data rows only have one date value,
    shifting every subsequent column by one.
    """
    if 'חיוב לתאריך' not in df.columns or 'תאריך' not in df.columns:
        return df
    taarich_sample = df['תאריך'].dropna().head(5).astype(str).str.strip()
    if taarich_sample.str.match(_DATE_RE).any():
        return df
    chiyuv_sample = df['חיוב לתאריך'].dropna().head(5).astype(str).str.strip()
    if not chiyuv_sample.str.match(_DATE_RE).any():
        return df
    cols = list(df.columns)
    cols.pop(cols.index('חיוב לתאריך'))
    cols.append(f'_extra_{len(cols)}')
    df.columns = cols
    return df


def _fallback_credit_parse(df: pd.DataFrame) -> pd.DataFrame:
    """Content-based fallback when the normalizer returns 0 rows."""
    date_col = amount_col = desc_col = account_col = None

    for col_name in df.columns:
        sample = df[col_name].dropna().head(10).astype(str).str.strip()
        non_empty = sample[sample.ne('') & sample.ne('nan')]
        if non_empty.empty:
            continue
        if account_col is None and non_empty.str.match(r'^\d{4}$').mean() > 0.5:
            account_col = col_name
        elif date_col is None and non_empty.str.match(_DATE_RE).mean() > 0.5:
            date_col = col_name
        elif amount_col is None:
            numeric = pd.to_numeric(non_empty.str.replace(',', '', regex=False), errors='coerce')
            if numeric.notna().mean() > 0.5:
                amount_col = col_name
        elif desc_col is None:
            if non_empty.str.contains(r'[\u0590-\u05FF]|[a-zA-Z]{3,}', regex=True).mean() > 0.3:
                desc_col = col_name

    if date_col is None:
        raise ValueError("Fallback parser: could not detect a date column")
    if amount_col is None:
        raise ValueError("Fallback parser: could not detect an amount column")

    transactions = []
    for _, row in df.iterrows():
        try:
            raw_val = row[date_col]
            transaction_date = _parse_tx_date(raw_val)
            if pd.isna(transaction_date):
                continue
            amount_str = str(row[amount_col]).strip().replace(',', '')
            if not amount_str or amount_str in ('nan', 'NaN', ''):
                continue
            amount = float(amount_str)
            description = ''
            if desc_col and pd.notna(row[desc_col]):
                description = str(row[desc_col]).strip()
                if description in ('nan', 'NaN'):
                    description = ''
            account = ''
            if account_col and pd.notna(row[account_col]):
                account = str(row[account_col]).strip()
                if account in ('nan', 'NaN'):
                    account = ''
            transactions.append({
                'account_number': account,
                'transaction_date': transaction_date,
                'description': description,
                'amount': amount,
                'month_year': transaction_date.strftime('%Y-%m'),
                'transaction_type': 'credit',
            })
        except Exception:
            continue

    if not transactions:
        raise ValueError("Fallback parser: no valid transactions found")

    result = pd.DataFrame(transactions)
    result.attrs['normalizer_profile'] = 'fallback_content_detection'
    result.attrs['normalizer_confidence'] = 0.5
    return result


def _parse_cash(file_path: str) -> pd.DataFrame:
    """Parse a cash-transaction CSV file."""
    df = load_file(file_path)
    df = df[~df.apply(lambda r: r.astype(str).str.contains('סה״כ', na=False).any(), axis=1)]

    date_col = amount_col = desc_col = account_col = None
    for i, col in enumerate(df.columns):
        col_str = str(col).strip()
        if 'תאריך' in col_str or 'date' in col_str.lower():
            date_col = i
        elif 'סכום' in col_str or 'amount' in col_str.lower():
            amount_col = i
        elif 'בית עסק' in col_str or 'description' in col_str.lower() or 'עסק' in col_str:
            desc_col = i
        elif 'כרטיס' in col_str or 'חשבון' in col_str or 'account' in col_str.lower():
            account_col = i

    date_pattern = re.compile(r'\d{2}\.\d{2}\.\d{4}')
    if date_col is None:
        for i in range(len(df.columns)):
            if df.iloc[:5, i].astype(str).str.match(date_pattern).any():
                date_col = i
                break
    if amount_col is None:
        for i in range(len(df.columns)):
            if i == date_col:
                continue
            try:
                pd.to_numeric(
                    df.iloc[:5, i].astype(str).str.replace(',', '').str.replace('"', ''),
                    errors='raise',
                )
                amount_col = i
                break
            except Exception:
                continue

    date_col    = date_col    if date_col    is not None else 1
    amount_col  = amount_col  if amount_col  is not None else 3
    desc_col    = desc_col    if desc_col    is not None else 2
    account_col = account_col if account_col is not None else 0

    transactions = []
    for _, row in df.iterrows():
        try:
            date_str = str(row.iloc[date_col]).strip()
            if not date_str or date_str in ('', 'nan', 'NaN'):
                continue
            transaction_date = _parse_tx_date(date_str)
            if pd.isna(transaction_date):
                continue
            amount_str = str(row.iloc[amount_col]).strip().replace(',', '').replace('"', '')
            if not amount_str or amount_str in ('nan', 'NaN', ''):
                continue
            amount = float(amount_str)
            description = str(row.iloc[desc_col]).strip() if pd.notna(row.iloc[desc_col]) else 'משיכת מזומן'
            if description in ('nan', 'NaN', ''):
                description = 'משיכת מזומן'
            account_number = str(row.iloc[account_col]).strip() if pd.notna(row.iloc[account_col]) else ''
            if account_number in ('nan', 'NaN'):
                account_number = ''
            transactions.append({
                'transaction_date': transaction_date,
                'amount': amount,
                'account_number': account_number,
                'description': description,
                'month_year': transaction_date.strftime('%Y-%m'),
                'transaction_type': 'cash',
            })
        except Exception:
            continue

    if not transactions:
        raise ValueError("No valid cash transactions could be parsed from the file")
    return pd.DataFrame(transactions)


def parse_transaction_file(file_path: str, transaction_type: str = 'credit') -> pd.DataFrame:
    """Parse a bank transaction file and return a canonical DataFrame.

    Columns: account_number, transaction_date (Timestamp), description,
             amount (float), month_year (str), transaction_type (str).

    Uses bank_csv_normalizer when available for credit/debit files;
    falls back to content-based heuristic detection otherwise.
    """
    if transaction_type == 'cash':
        return _parse_cash(file_path)

    ext = os.path.splitext(file_path)[1].lower()

    if _HAS_NORMALIZER:
        if ext in ('.xlsx', '.xls'):
            df, _ = load_file(file_path), None  # load_file already handles Excel
            # Re-load via load_file so we have proper header detection
            df = load_file(file_path)
        else:
            load_res = load_csv(file_path)
            df = load_res.df

        df = _fix_credit_card_column_alignment(df)
        canonical, report = _normalizer_convert(df)

        if len(canonical) == 0:
            return _fallback_credit_parse(df)

        canonical['transaction_date'] = pd.to_datetime(
            canonical['transaction_date'], format='%Y-%m-%d', errors='coerce'
        )
        canonical['amount'] = pd.to_numeric(canonical['amount'], errors='coerce')
        canonical = canonical.dropna(subset=['transaction_date', 'amount'])
        canonical['month_year'] = canonical['transaction_date'].dt.strftime('%Y-%m')
        canonical['transaction_type'] = transaction_type
        canonical.attrs['normalizer_profile'] = report.profile
        canonical.attrs['normalizer_confidence'] = report.confidence
        return canonical

    # No normalizer available — use generic loader + fallback
    df = load_file(file_path)
    df = _fix_credit_card_column_alignment(df)
    return _fallback_credit_parse(df)
