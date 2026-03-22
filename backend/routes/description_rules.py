"""Description normalization rules for bank transaction descriptions."""
from __future__ import annotations

import json
import logging

import pandas as pd

logger = logging.getLogger(__name__)

# Fallback hardcoded rules (used when DB is unavailable)
_FALLBACK_RULES = [
    (["AIRBNB PAYMENTS UK LIMITED", "פיוניר אינ"], "Airbnb"),
    (["העברה מנועה אבן חשבון ב.הפועלים-ביט"], "bit"),
    (["הפקדת מזומן לדיסקונט"], "הפקדת מזומן"),
    (["משיכה מכספומט כספונט", "משיכת מזומן ללא כרטיס"], "משיכת מזומן"),
]


def load_rules_from_db(conn) -> list[tuple[list[str], str]]:
    """Load normalization rules from DB. Returns list of (needles, replacement)."""
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT needles, replacement FROM description_rules ORDER BY sort_order ASC, id ASC")
        rows = cur.fetchall()
        rules = []
        for row in rows:
            try:
                needles = json.loads(row['needles'])
                if isinstance(needles, list) and needles:
                    rules.append((needles, row['replacement']))
            except Exception:
                pass
        return rules if rules else _FALLBACK_RULES
    except Exception as e:
        logger.warning("Could not load description_rules from DB, using fallback: %s", e)
        return _FALLBACK_RULES


def normalize_description_series(s: pd.Series, rules: list | None = None) -> pd.Series:
    """Normalize transaction descriptions by substring rules."""
    if rules is None:
        rules = _FALLBACK_RULES
    out = s.fillna("").astype(str)
    for needles, replacement in rules:
        mask = False
        for n in needles:
            mask = mask | out.str.contains(n, na=False)
        out = out.where(~mask, replacement)
    return out


def normalize_descriptions_df(df: pd.DataFrame, col: str = "description", rules: list | None = None) -> pd.DataFrame:
    """Apply description normalization to df[col] if present and return a copy."""
    if col not in df.columns:
        return df
    df2 = df.copy()
    df2[col] = normalize_description_series(df2[col], rules=rules)
    return df2
