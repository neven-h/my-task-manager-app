"""Description normalization rules for bank transaction descriptions."""
from __future__ import annotations

import pandas as pd


def normalize_description_series(s: pd.Series) -> pd.Series:
    """Normalize transaction descriptions by substring rules.

    If a description contains any of the configured substrings, it is replaced by a
    canonical description. Rules are applied in order.
    """
    out = s.fillna("").astype(str)

    rules = [
        (["AIRBNB PAYMENTS UK LIMITED", "פיוניר אינ"], "Airbnb"),
        (["העברה מנועה אבן חשבון ב.הפועלים-ביט"], "bit"),
        (["הפקדת מזומן לדיסקונט"], "הפקדת מזומן"),
        (["משיכה מכספומט כספונט", "משיכת מזומן ללא כרטיס"], "משיכת מזומן"),
    ]

    for needles, replacement in rules:
        mask = False
        for n in needles:
            mask = mask | out.str.contains(n, na=False)
        out = out.where(~mask, replacement)

    return out


def normalize_descriptions_df(df: pd.DataFrame, col: str = "description") -> pd.DataFrame:
    """Apply description normalization to df[col] if present and return a copy."""
    if col not in df.columns:
        return df

    df2 = df.copy()
    df2[col] = normalize_description_series(df2[col])
    return df2
