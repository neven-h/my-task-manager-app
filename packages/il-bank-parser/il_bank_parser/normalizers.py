"""Value-level normalizers: date parsing, amount parsing, date-order detection."""
from __future__ import annotations

import re
from typing import Optional

import pandas as pd

_DATE_RE = re.compile(r'^\d{1,2}[./]\d{1,2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')


def detect_date_order(df: pd.DataFrame, date_col: str) -> str:
    """Return 'mdy' if month comes first in the date column, else 'dmy'."""
    for _, val in df[date_col].dropna().head(50).items():
        parts = re.split(r'[./]', str(val).strip())
        if len(parts) >= 2:
            try:
                if int(parts[1]) > 12:
                    return 'mdy'
            except ValueError:
                continue
    return 'dmy'


def parse_date(val, date_order: str = 'dmy') -> pd.Timestamp:
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


def parse_amount(val) -> Optional[float]:
    """Parse an amount string, handling commas, ₪ and Hebrew RTL markers."""
    if pd.isna(val):
        return None
    s = (str(val).strip()
         .replace(',', '')
         .replace('₪', '')
         .replace('\u200e', '')
         .replace('\u200f', ''))
    if not s or s in ('nan', 'NaN'):
        return None
    try:
        return float(s)
    except ValueError:
        return None
