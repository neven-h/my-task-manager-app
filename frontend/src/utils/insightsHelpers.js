/**
 * Shared helpers for Spending Insights components (desktop + mobile).
 */
export { trendArrow } from './forecastHelpers';

/** Format currency amount — no decimals for large numbers, 2 for small. */
export const fmtAmount = (n) => {
    const abs = Math.abs(n);
    if (abs >= 100) {
        return abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** "2025-12" → "Dec 2025" in user locale. */
export const fmtMonth = (monthYear) => {
    if (!monthYear) return '';
    const [y, m] = monthYear.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

/** CSS width percentage for bar charts. Minimum 3% so tiny values are visible. */
export const barWidth = (value, maxValue) => {
    if (!maxValue || maxValue === 0) return '3%';
    return `${Math.max(3, (value / maxValue) * 100)}%`;
};

/** Short month label: "2025-12" → "Dec" */
export const shortMonth = (monthYear) => {
    if (!monthYear) return '';
    const [y, m] = monthYear.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};
