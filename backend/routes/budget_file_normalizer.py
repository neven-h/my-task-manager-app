"""Budget file normalizer for Israeli bank exports (Poalim/Discount style)."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import pandas as pd
import routes.budget_parsers_io as bio
from routes.description_rules import normalize_descriptions_df


DEFAULT_HEADER_MAP: Dict[str, str] = {
    "תאריך": "transaction_date",
    "יום ערך": "value_date",
    "תיאור התנועה": "description",
    "₪ זכות/חובה": "amount",
    "₪ יתרה": "balance",
    "₪ זכות/חובה ": "amount",
    "₪ יתרה ": "balance",
}

NOISE_COLUMN_NAMES = {"אסמכתה", "עמלה", "ערוץ ביצוע"}


@dataclass
class NormalizeReport:
    header_row_index: int
    dropped_future_section: bool
    dropped_columns: List[str]
    rows_in: int
    rows_out: int


def _find_header_row_deep(raw: pd.DataFrame, max_scan: int = 500) -> int:
    """Find header row by scanning for known Hebrew/English column keywords."""
    header_keywords = {
        "תאריך",
        "סכום",
        "תיאור",
        "פרטים",
        "חובה",
        "זכות",
        "יתרה",
        "תיאור התנועה",
        "זכות/חובה",
        "יום ערך",
        "אסמכתה",
        "ערוץ ביצוע",
        "date",
        "amount",
        "description",
        "balance",
        "credit",
        "debit",
    }

    best_hits, header_row = 0, 0
    for i, row in raw.iterrows():
        if i > max_scan:
            break
        cells = [str(c).strip().lower() for c in row if pd.notna(c) and str(c).strip()]
        hits = sum(1 for kw in header_keywords if any(kw.lower() in c for c in cells))
        if hits > best_hits:
            best_hits, header_row = hits, i
    return int(header_row)


def _load_df_deep(file_path: str) -> Tuple[pd.DataFrame, int]:
    """Load CSV/XLSX and detect header row by scanning deep."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".xlsx", ".xls"):
        raw = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)
        header_row = _find_header_row_deep(raw)
        df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    else:
        raw = None
        used_enc = None
        for enc in ("utf-8-sig", "utf-8", "windows-1255", "iso-8859-8"):
            try:
                raw_try = pd.read_csv(file_path, header=None, dtype=str, encoding=enc)
                if len(raw_try.columns) > 1:
                    raw, used_enc = raw_try, enc
                    break
            except Exception:
                continue
        if raw is None:
            raise ValueError("Could not decode CSV file with common encodings")
        header_row = _find_header_row_deep(raw)
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding=used_enc)

    df.columns = [re.sub(r"[\r\n]+", " ", str(c)).strip() for c in df.columns]
    df = df.dropna(how="all").reset_index(drop=True)
    return df, header_row


def _trim_future_section(df: pd.DataFrame) -> Tuple[pd.DataFrame, bool]:
    """Drop 'תנועות עתידיות' section and everything after it, if present."""
    if df.empty:
        return df, False
    first_col = df.columns[0]
    s = df[first_col].astype(str).str.strip()
    idx = s[s == "תנועות עתידיות"].index
    if len(idx) > 0:
        cut_at = idx[0]
        return df.loc[: cut_at - 1].copy(), True
    return df, False


def _drop_noise_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Drop noisy columns by name (and fallback Excel F/G/H positions)."""
    dropped: List[str] = []
    if df.empty:
        return df, dropped

    cols_by_name = [c for c in df.columns if str(c).strip() in NOISE_COLUMN_NAMES]
    if cols_by_name:
        dropped.extend([str(c) for c in cols_by_name])
        df = df.drop(columns=cols_by_name, errors="ignore")

    if len(df.columns) >= 8:
        idxs = {5, 6, 7}
        cols_by_pos = [c for i, c in enumerate(df.columns) if i in idxs]
        for c in cols_by_pos:
            if str(c) not in dropped and c in df.columns:
                dropped.append(str(c))
        df = df.drop(columns=[c for c in cols_by_pos if c in df.columns], errors="ignore")

    return df, dropped


def _rename_headers(df: pd.DataFrame, mapping: Optional[Dict[str, str]]) -> pd.DataFrame:
    """Rename headers Hebrew -> English using mapping."""
    mapping = mapping or DEFAULT_HEADER_MAP
    out = df.copy()
    out.columns = [mapping.get(str(c).strip(), str(c).strip()) for c in out.columns]
    return out


def normalize_poalim_osh_file_to_utf8_csv(
    input_path: Union[str, Path],
    output_csv: Union[str, Path],
    header_map: Optional[Dict[str, str]] = None,
    apply_description_rules: bool = True,
    encoding: str = "utf-8",
    description_rules: Optional[list] = None,
) -> NormalizeReport:
    """Normalize a Poalim/Discount bank export to a canonical UTF-8 CSV."""
    input_path = str(Path(input_path).expanduser().resolve())
    output_csv = str(Path(output_csv).expanduser().resolve())

    df, header_row = _load_df_deep(input_path)
    rows_in = len(df)

    df, dropped_future = _trim_future_section(df)
    df, dropped_cols = _drop_noise_columns(df)
    df = _rename_headers(df, mapping=header_map)

    if apply_description_rules and "description" in df.columns:
        df = normalize_descriptions_df(df, col="description", rules=description_rules)

    if "transaction_date" in df.columns:
        order = bio._detect_date_order(df, "transaction_date")
        parsed = df["transaction_date"].apply(lambda v: bio._parse_date(v, order))
        df["transaction_date"] = pd.to_datetime(parsed, errors="coerce").dt.strftime("%Y-%m-%d")

    if "amount" in df.columns:
        df["amount"] = df["amount"].apply(bio._parse_amount)
        df["amount"] = df["amount"].apply(lambda x: "" if x is None else f"{x:.2f}")

    df.to_csv(output_csv, index=False, encoding=encoding)

    return NormalizeReport(
        header_row_index=header_row,
        dropped_future_section=dropped_future,
        dropped_columns=dropped_cols,
        rows_in=rows_in,
        rows_out=len(df),
    )
