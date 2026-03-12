"""Shared forecast engine — statistical IQR method.

Chronos/torch was removed because the T5 transformer OOM-killed gunicorn
workers on Railway (SIGKILL mid-inference).  The IQR fallback is fast,
deterministic, and requires no extra memory.
"""
import logging
import statistics
import time

logger = logging.getLogger(__name__)

_pipeline_tried = False  # kept for compat — always False/None path now

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


# ── Forecast pipeline ─────────────────────────────────────────────────────────
def _load_pipeline():
    """Returns None — Chronos disabled to prevent OOM on Railway.
    predict_sequence() always takes the _stat_forecast path."""
    return None


# ── Core prediction ───────────────────────────────────────────────────────────
def predict_sequence(values: list, n: int = 3) -> dict:
    """Predict the next *n* values of a numerical sequence.

    Returns:
        { 'median': [float]*n, 'low': [float]*n, 'high': [float]*n }
        where low/high are the 10th/90th percentile bounds.
    """
    if len(values) < 2:
        v = float(values[-1]) if values else 0.0
        return {'median': [v] * n, 'low': [v * 0.9] * n, 'high': [v * 1.1] * n}

    pipeline = _load_pipeline()
    if pipeline is None:
        return _stat_forecast(values, n)

    # Chronos disabled — always use statistical fallback
    return _stat_forecast(values, n)


def _stat_forecast(values: list, n: int) -> dict:
    """IQR-based statistical fallback (used when Chronos is unavailable)."""
    sv = sorted(values)
    length = len(sv)
    median = statistics.median(sv)
    q1 = sv[length // 4] if length >= 4 else sv[0]
    q3 = sv[(3 * length) // 4] if length >= 4 else sv[-1]
    half_iqr = (q3 - q1) * 0.5
    return {
        'median': [median] * n,
        'low':    [max(0.0, median - half_iqr)] * n,
        'high':   [median + half_iqr] * n,
    }


# ── Confidence scoring ────────────────────────────────────────────────────────
def confidence_score(amount_fc: dict, interval_fc: dict,
                     n_entries: int, idx: int = 0) -> float:
    """Compute a [0,1] confidence score from Chronos uncertainty + data volume."""
    a_med = amount_fc['median'][idx]
    a_spread = (amount_fc['high'][idx] - amount_fc['low'][idx]) / max(abs(a_med), 0.01)
    amount_conf = max(0.0, 1.0 - a_spread / 2.0)

    i_med = interval_fc['median'][idx]
    i_spread = (interval_fc['high'][idx] - interval_fc['low'][idx]) / max(i_med, 1.0)
    timing_conf = max(0.0, 1.0 - i_spread / 2.0)

    data_conf = n_entries / (n_entries + 2)  # Bayesian: more history = more confidence

    return round(min(1.0, 0.35 * amount_conf + 0.35 * timing_conf + 0.30 * data_conf), 2)
