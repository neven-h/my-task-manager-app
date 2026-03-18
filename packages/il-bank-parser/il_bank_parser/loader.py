"""File loading: CSV/Excel with automatic encoding and header-row detection."""
from __future__ import annotations

import os
import re
from typing import Tuple

import pandas as pd

HEADER_KEYWORDS = {
    "תאריך", "סכום", "תיאור", "תאור", "פרטים", "פעולה", "עסקה",
    "בית עסק", "כרטיס", "אסמכתא", "חובה", "זכות", "יתרה",
    "תיאור התנועה", "זכות/חובה", "יום ערך", "אסמכתה", "ערוץ ביצוע",
    "date", "amount", "description", "balance", "credit", "debit", "transaction",
}

_ENCODINGS = ("utf-8-sig", "utf-8", "windows-1255", "cp1255", "iso-8859-8")


def _find_header_row(raw: pd.DataFrame, max_scan: int) -> int:
    best_hits, header_row = 0, 0
    for i, row in raw.iterrows():
        if i > max_scan:
            break
        cells = [str(c).strip().lower() for c in row if pd.notna(c) and str(c).strip()]
        hits = sum(1 for kw in HEADER_KEYWORDS if any(kw.lower() in c for c in cells))
        if hits > best_hits:
            best_hits, header_row = hits, int(i)
        if best_hits >= 3 and i > header_row + 5:
            break  # early exit once we have a confident match
    return header_row


def _clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [re.sub(r"[\r\n]+", " ", str(c)).strip() for c in df.columns]
    return df.dropna(how="all").reset_index(drop=True)


def load_file(file_path: str, max_header_scan: int = 50) -> pd.DataFrame:
    """Load a CSV or Excel bank export and return a cleaned DataFrame.

    Handles Hebrew encodings, detects the header row, strips newlines from
    column names, and drops entirely-empty rows.
    """
    ext = os.path.splitext(file_path)[1].lower()
    enc = "utf-8-sig"

    if ext in (".xlsx", ".xls"):
        raw = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)
        header_row = _find_header_row(raw, max_header_scan)
        df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    else:
        raw = None
        for enc in _ENCODINGS:
            try:
                raw = pd.read_csv(file_path, header=None, dtype=str, encoding=enc)
                if len(raw.columns) > 1:
                    break
            except Exception:
                continue
        if raw is None:
            raise ValueError("Could not decode file with known encodings")
        header_row = _find_header_row(raw, max_header_scan)
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding=enc)

    return _clean_columns(df)


def load_file_deep(file_path: str, max_header_scan: int = 500) -> Tuple[pd.DataFrame, int]:
    """Like load_file but scans deeper for the header row (useful for Poalim exports).

    Returns (df, header_row_index).
    """
    ext = os.path.splitext(file_path)[1].lower()
    enc = "utf-8-sig"

    if ext in (".xlsx", ".xls"):
        raw = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)
        header_row = _find_header_row(raw, max_header_scan)
        df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    else:
        raw = None
        for enc in _ENCODINGS:
            try:
                raw = pd.read_csv(file_path, header=None, dtype=str, encoding=enc)
                if len(raw.columns) > 1:
                    break
            except Exception:
                continue
        if raw is None:
            raise ValueError("Could not decode CSV file with known encodings")
        header_row = _find_header_row(raw, max_header_scan)
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding=enc)

    return _clean_columns(df), header_row
