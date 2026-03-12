/**
 * Shared AI UX helpers for forecast components.
 *
 * Implements the four AI UX principles:
 *  1. "So What? Now What?" — actionable context per prediction
 *  2. Correction loop — dismiss/restore with total recalculation
 *  3. Progressive disclosure — human-readable defaults, nerdy details on expand
 *  4. Semantic grouping — Fixed Costs / Variable Spending / Anomalies
 */

// ── Semantic grouping ────────────────────────────────────────────────────────

/**
 * Group predictions into three semantic buckets.
 * @param {Array} predictions - raw prediction array
 * @param {Set} dismissed - set of dismissed indices
 * @returns {{ fixed: Array, variable: Array, anomalies: Array }}
 */
export function groupPredictions(predictions, dismissed = new Set()) {
    const fixed = [];
    const variable = [];
    const anomalies = [];

    predictions.forEach((p, idx) => {
        const item = { ...p, _idx: idx, _dismissed: dismissed.has(idx) };
        if (p.confidence >= 0.7) fixed.push(item);
        else if (p.confidence >= 0.45) variable.push(item);
        else anomalies.push(item);
    });

    return { fixed, variable, anomalies };
}

export const GROUP_META = {
    fixed:     { label: 'Upcoming Fixed Costs',     color: '#16a34a', icon: '■' },
    variable:  { label: 'Variable Spending Trends',  color: '#d97706', icon: '▲' },
    anomalies: { label: 'Anomalies / Spikes',        color: '#dc2626', icon: '●' },
};

// ── Human-readable frequency ─────────────────────────────────────────────────

export function humanFrequency(intervalDays) {
    if (!intervalDays || intervalDays <= 0) return '';
    if (intervalDays <= 9)  return 'Weekly';
    if (intervalDays <= 18) return 'Bi-weekly';
    if (intervalDays >= 25 && intervalDays <= 35) return 'Monthly';
    if (intervalDays >= 55 && intervalDays <= 70) return 'Bi-monthly';
    if (intervalDays >= 80 && intervalDays <= 100) return 'Quarterly';
    if (intervalDays >= 170 && intervalDays <= 200) return 'Semi-annual';
    if (intervalDays >= 350 && intervalDays <= 380) return 'Yearly';
    return `Every ~${intervalDays} days`;
}

// ── Basis text (progressive disclosure detail) ───────────────────────────────

export function humanBasis(entryCount, intervalDays) {
    const span = entryCount * (intervalDays || 30);
    const months = Math.round(span / 30);
    const period = months >= 12 ? `${Math.round(months / 12)} year${months >= 24 ? 's' : ''}`
        : `${months} month${months !== 1 ? 's' : ''}`;
    return `Based on ${entryCount} transactions over ~${period}`;
}

// ── Totals excluding dismissed ───────────────────────────────────────────────

export function activePredictions(predictions, dismissed) {
    return predictions.filter((_, i) => !dismissed.has(i));
}
