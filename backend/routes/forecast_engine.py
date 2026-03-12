"""Shared forecast engine — EWMA + linear trend prediction.

Uses exponentially weighted moving average with linear regression slope
for zero-config sequence prediction. Pure Python (math + statistics only).

Replaces the previous flat IQR method with per-step trend-aware forecasts.
"""
import logging
import math
import statistics
import time

logger = logging.getLogger(__name__)

# ── In-memory prediction cache ────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 300  # seconds


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def cache_set(key: str, value):
    _cache[key] = (time.time(), value)


def invalidate_prediction_cache(username: str, tab_id: str = None):
    """Remove cached predictions for a user (optionally scoped to a tab)."""
    prefixes = [f"txpredict:{username}:", f"budgetpredict:{username}:",
                f"balancefc:{username}:"]
    to_delete = []
    for key in _cache:
        for pfx in prefixes:
            if key.startswith(pfx):
                if tab_id is None or f":{tab_id}:" in key:
                    to_delete.append(key)
                    break
    for key in to_delete:
        _cache.pop(key, None)


# ── EWMA + Linear Trend helpers ───────────────────────────────────────────────

def _ewma(values: list, alpha: float = 0.3) -> list:
    """Compute exponentially weighted moving average."""
    result = [values[0]]
    for v in values[1:]:
        result.append(alpha * v + (1 - alpha) * result[-1])
    return result


def _ols_slope(values: list) -> float:
    """Ordinary least-squares slope over the series (or last 12 points)."""
    v = values[-12:] if len(values) > 12 else values
    n = len(v)
    if n < 2:
        return 0.0
    sx = sum(range(n))
    sy = sum(v)
    sxx = sum(i * i for i in range(n))
    sxy = sum(i * v[i] for i in range(n))
    denom = n * sxx - sx * sx
    if denom == 0:
        return 0.0
    return (n * sxy - sx * sy) / denom


def _trend_label(slope: float, mean_val: float) -> str:
    """Classify trend as up/down/stable based on slope relative to mean."""
    if mean_val == 0:
        return 'stable'
    ratio = slope / abs(mean_val)
    if ratio > 0.02:
        return 'up'
    if ratio < -0.02:
        return 'down'
    return 'stable'


# ── Core prediction ───────────────────────────────────────────────────────────

def predict_sequence(values: list, n: int = 3) -> dict:
    """Predict the next *n* values using EWMA + linear trend.

    Returns:
        { 'median': [float]*n, 'low': [float]*n, 'high': [float]*n,
          'trend': 'up' | 'down' | 'stable' }
    """
    if len(values) < 2:
        v = float(values[-1]) if values else 0.0
        return {'median': [v] * n, 'low': [v * 0.9] * n,
                'high': [v * 1.1] * n, 'trend': 'stable'}

    # EWMA baseline + OLS slope for trend
    ewma_vals = _ewma(values)
    baseline = ewma_vals[-1]
    slope = _ols_slope(values)
    mean_val = statistics.mean(values)
    trend = _trend_label(slope, mean_val)

    # Residual std for confidence bands
    residuals = [values[i] - ewma_vals[i] for i in range(len(values))]
    res_std = statistics.stdev(residuals) if len(residuals) >= 2 else abs(mean_val) * 0.1

    medians, lows, highs = [], [], []
    for i in range(n):
        pred = baseline + slope * (i + 1)
        band = res_std * math.sqrt(i + 1)
        medians.append(pred)
        lows.append(pred - band)
        highs.append(pred + band)

    return {'median': medians, 'low': lows, 'high': highs, 'trend': trend}


# ── Confidence scoring ────────────────────────────────────────────────────────

def confidence_score(amount_fc: dict, interval_fc: dict,
                     n_entries: int, idx: int = 0) -> float:
    """Compute a [0,1] confidence score from prediction uncertainty + data volume.

    Weighting: 40% amount stability, 30% interval regularity, 30% data volume.
    """
    # Amount stability via coefficient of variation of the band
    a_med = amount_fc['median'][idx]
    a_spread = amount_fc['high'][idx] - amount_fc['low'][idx]
    a_cv = a_spread / max(abs(a_med), 0.01)
    amount_conf = max(0.0, 1.0 - a_cv / 2.0)

    # Interval regularity
    i_med = interval_fc['median'][idx]
    i_spread = interval_fc['high'][idx] - interval_fc['low'][idx]
    i_cv = i_spread / max(abs(i_med), 1.0)
    timing_conf = max(0.0, 1.0 - i_cv / 2.0)

    # Data volume — requires more entries to saturate (n/(n+5))
    data_conf = n_entries / (n_entries + 5)

    return round(min(1.0, 0.40 * amount_conf + 0.30 * timing_conf + 0.30 * data_conf), 2)
