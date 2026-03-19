"""Normalizer for Bank Hapoalim 'עובר ושב' (current account) exports."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import pandas as pd

from il_bank_parser.loader import load_file_deep
from il_bank_parser.normalizers import detect_date_order, parse_date, parse_amount
from il_bank_parser.description_rules import normalize_descriptions_df

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


def _trim_future_section(df: pd.DataFrame) -> Tuple[pd.DataFrame, bool]:
    """Drop 'תנועות עתידיות' section and everything after it."""
    if df.empty:
        return df, False
    first_col = df.columns[0]
    s = df[first_col].astype(str).str.strip()
    idx = s[s == "תנועות עתידיות"].index
    if len(idx) > 0:
        return df.loc[: idx[0] - 1].copy(), True
    return df, False


def _drop_noise_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Drop known noisy columns and positional fallback columns F/G/H."""
    dropped: List[str] = []
    if df.empty:
        return df, dropped
    cols_by_name = [c for c in df.columns if str(c).strip() in NOISE_COLUMN_NAMES]
    if cols_by_name:
        dropped.extend(str(c) for c in cols_by_name)
        df = df.drop(columns=cols_by_name, errors="ignore")
    if len(df.columns) >= 8:
        for i, c in enumerate(df.columns):
            if i in {5, 6, 7} and str(c) not in dropped and c in df.columns:
                dropped.append(str(c))
        df = df.drop(
            columns=[c for i, c in enumerate(list(df.columns)) if i in {5, 6, 7}],
            errors="ignore",
        )
    return df, dropped


def _rename_headers(df: pd.DataFrame, mapping: Optional[Dict[str, str]] = None) -> pd.DataFrame:
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
) -> NormalizeReport:
    """Normalize a Poalim 'עובר ושב' CSV/XLSX to a clean UTF-8 CSV.

    Steps:
    - Deep header-row scan (up to 500 rows)
    - Drop noise columns (F/G/H) and trim 'תנועות עתידיות' section
    - Rename headers Hebrew → English
    - Apply description normalization rules
    - Normalize transaction_date → YYYY-MM-DD
    - Normalize amount → plain decimal string
    - Write UTF-8 CSV
    """
    input_path = str(Path(input_path).expanduser().resolve())
    output_csv = str(Path(output_csv).expanduser().resolve())

    df, header_row = load_file_deep(input_path)
    rows_in = len(df)

    df, dropped_future = _trim_future_section(df)
    df, dropped_cols = _drop_noise_columns(df)
    df = _rename_headers(df, mapping=header_map)

    if apply_description_rules:
        df = normalize_descriptions_df(df, col="description")

    if "transaction_date" in df.columns:
        order = detect_date_order(df, "transaction_date")
        parsed = df["transaction_date"].apply(lambda v: parse_date(v, order))
        df["transaction_date"] = pd.to_datetime(parsed, errors="coerce").dt.strftime("%Y-%m-%d")

    if "amount" in df.columns:
        df["amount"] = df["amount"].apply(parse_amount)
        df["amount"] = df["amount"].apply(lambda x: "" if x is None else f"{x:.2f}")

    df.to_csv(output_csv, index=False, encoding=encoding)

    return NormalizeReport(
        header_row_index=header_row,
        dropped_future_section=dropped_future,
        dropped_columns=dropped_cols,
        rows_in=rows_in,
        rows_out=len(df),
    )


def interactive_main() -> int:
    print("\n=== Poalim OSH file normalizer ===\n")
    src = input("Input file path (.xlsx/.csv): ").strip().strip('"').strip("'")
    if not src:
        print("No input provided.")
        return 1
    src_p = Path(src).expanduser().resolve()
    if not src_p.exists():
        print(f"ERROR: file not found: {src_p}")
        return 1
    default_out = src_p.with_suffix(".normalized.csv")
    out = input(f"Output csv path [default: {default_out}]: ").strip().strip('"').strip("'")
    out_p = Path(out).expanduser().resolve() if out else default_out
    rep = normalize_poalim_osh_file_to_utf8_csv(src_p, out_p)
    print("\nDone")
    print("Output:", out_p)
    print("Header row:", rep.header_row_index)
    print("Dropped future section:", rep.dropped_future_section)
    print("Dropped columns:", rep.dropped_columns)
    print("Rows in/out:", rep.rows_in, "->", rep.rows_out)
    return 0


if __name__ == "__main__":
    raise SystemExit(interactive_main())
