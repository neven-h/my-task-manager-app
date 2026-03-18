"""Substring-based description normalisation rules for Israeli bank transactions."""
from __future__ import annotations

import pandas as pd

# Each rule: (list_of_substrings_to_match, canonical_replacement)
DEFAULT_RULES = [
    (["AIRBNB PAYMENTS UK LIMITED", "פיוניר אינ"], "Airbnb"),
    (["העברה מנועה אבן חשבון ב.הפועלים-ביט"], "bit"),
    (["הפקדת מזומן לדיסקונט"], "הפקדת מזומן"),
    (["העברה מליפשיץ לאה וליפש"], "העברה מבני ליפשיץ יעוץ ארגוני"),
    (["העברה מאבן דריה חשבון 31-127-0000-105052078"], "העברה מאבן דריה"),
    (["העברה מאבן גיא מירון"], "העברה מאבן גיא מירון"),
    (["משיכה מכספומט כספונט", "משיכת מזומן ללא כרטיס"], "משיכת מזומן"),
]


def normalize_description_series(s: pd.Series, rules=None) -> pd.Series:
    """Normalize transaction descriptions by substring rules.

    Rules are applied in order; first match wins per row.
    Pass a custom ``rules`` list to override the defaults.
    """
    rules = rules if rules is not None else DEFAULT_RULES
    out = s.fillna("").astype(str)
    for needles, replacement in rules:
        mask = pd.Series(False, index=out.index)
        for needle in needles:
            mask = mask | out.str.contains(needle, na=False)
        out = out.where(~mask, replacement)
    return out


def normalize_descriptions_df(df: pd.DataFrame, col: str = "description", rules=None) -> pd.DataFrame:
    """Apply description normalisation to df[col] and return a copy."""
    if col not in df.columns:
        return df
    df2 = df.copy()
    df2[col] = normalize_description_series(df2[col], rules=rules)
    return df2
