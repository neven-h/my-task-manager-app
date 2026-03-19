# from __future__ import annotations

import pandas as pd


def normalize_description_series(s: pd.Series) -> pd.Series:
    """Normalize transaction descriptions by substring rules.

    If a description contains any of the configured substrings, it is replaced by a
    canonical description. Rules are applied in order.
    """
    out = s.fillna("").astype(str)

    rules = [
        # Airbnb
        (["AIRBNB PAYMENTS UK LIMITED", "פיוניר אינ"], "Airbnb"),

        # bit transfers
        (["העברה מנועה אבן חשבון ב.הפועלים-ביט"], "bit"),

        # cash deposit
        (["הפקדת מזומן לדיסקונט"], "הפקדת מזומן"),

        # Lipshitz transfer
        (["העברה מליפשיץ לאה וליפש"], "העברה מבני ליפשיץ יעוץ ארגוני"),

        # transfer from Daria Even (with account string)
        (["העברה מאבן דריה חשבון 31-127-0000-105052078"], "העברה מאבן דריה"),

        # (As written this is a no-op; kept for completeness)
        (["העברה מאבן גיא מירון"], "העברה מאבן גיא מירון"),

        # ATM / cash withdrawal variants
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

# from __future__ import annotations

import pandas as pd


def normalize_description_series(s: pd.Series) -> pd.Series:
    """Normalize transaction descriptions by substring rules.

    If a description contains any of the configured substrings, it is replaced by a
    canonical description. Rules are applied in order.
    """

    out = s.fillna("").astype(str)

    rules = [
        # Airbnb
        (["AIRBNB PAYMENTS UK LIMITED", "פיוניר אינ"], "Airbnb"),

        # bit transfers
        (["העברה מנועה אבן חשבון ב.הפועלים-ביט"], "bit"),

        # cash deposit
        (["הפקדת מזומן לדיסקונט"], "הפקדת מזומן"),

        # Lipshitz transfer
        (["העברה מליפשיץ לאה וליפש"], "העברה מבני ליפשיץ יעוץ ארגוני"),

        # transfer from Daria Even (with account string)
        (["העברה מאבן דריה חשבון 31-127-0000-105052078"], "העברה מאבן דריה"),

        # (As written this is a no-op; kept for completeness)
        (["העברה מאבן גיא מירון"], "העברה מאבן גיא מירון"),

        # ATM / cash withdrawal variants
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
