/**
 * Cashflow AI helpers — narrative, health score, runway, what-if.
 * Used by TransactionBalanceForecast (desktop) and MobileTransactionBalanceForecast.
 */

// ── Runway ────────────────────────────────────────────────────────────────────

/**
 * Compute months of runway from balance + average monthly spend.
 * Returns null if inputs are invalid.
 */
export function runwayMonths(balance, avgMonthlySpend) {
    if (balance == null || !avgMonthlySpend || avgMonthlySpend <= 0) return null;
    return balance / avgMonthlySpend;
}

/**
 * Runway info: label, color, urgency level.
 */
export function runwayInfo(months) {
    if (months == null) return { label: '—', color: '#9ca3af', level: 'unknown', emoji: '?' };
    if (months >= 12)   return { label: `${months.toFixed(0)}+ mo`,  color: '#059669', level: 'healthy',  emoji: '✅' };
    if (months >= 6)    return { label: `~${months.toFixed(1)} mo`,  color: '#16a34a', level: 'good',     emoji: '🟢' };
    if (months >= 3)    return { label: `~${months.toFixed(1)} mo`,  color: '#d97706', level: 'moderate', emoji: '🟡' };
    if (months >= 1.5)  return { label: `~${months.toFixed(1)} mo`,  color: '#ea580c', level: 'tight',    emoji: '🟠' };
    return               { label: `~${months.toFixed(1)} mo`,  color: '#dc2626', level: 'critical', emoji: '🔴' };
}

// ── Health score ──────────────────────────────────────────────────────────────

/**
 * 0–100 cashflow health score.
 * Factors: runway, spending momentum, anomaly count.
 */
export function healthScore(runway, momentum, anomalyCount = 0) {
    let score = 100;

    // Runway penalty
    if (runway == null)      score -= 30;
    else if (runway < 1)     score -= 55;
    else if (runway < 2)     score -= 35;
    else if (runway < 3)     score -= 20;
    else if (runway < 6)     score -= 8;

    // Momentum
    if (momentum === 'increasing') score -= 12;
    if (momentum === 'decreasing') score += 5;

    // Anomalies
    score -= Math.min(anomalyCount * 4, 16);

    return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthLabel(score) {
    if (score >= 80) return { text: 'Healthy',     color: '#059669', bg: '#f0fdf4' };
    if (score >= 60) return { text: 'Moderate',    color: '#d97706', bg: '#fffbeb' };
    if (score >= 40) return { text: 'Watch Out',   color: '#ea580c', bg: '#fff7ed' };
    return              { text: 'Critical',    color: '#dc2626', bg: '#fef2f2' };
}

// ── AI narrative ──────────────────────────────────────────────────────────────

/**
 * Generate a plain-English narrative from cashflow data.
 * Returns an array of insight strings (3 max).
 */
export function generateInsights(data, startingBalance) {
    if (!data) return [];
    const { avg_monthly_spend, momentum, anomalies = [], predicted_monthly = [] } = data;
    const insights = [];

    const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });

    // 1. Runway insight (most important)
    if (startingBalance != null && avg_monthly_spend > 0) {
        const runway = startingBalance / avg_monthly_spend;
        const { level, emoji } = runwayInfo(runway);
        if (level === 'healthy' || level === 'good') {
            insights.push(`${emoji} Solid runway of ~${runway.toFixed(1)} months at current spend rates.`);
        } else if (level === 'moderate') {
            insights.push(`${emoji} ~${runway.toFixed(1)} months of runway — consider reducing variable costs.`);
        } else {
            insights.push(`${emoji} Only ~${runway.toFixed(1)} months of runway. Review Fixed Costs immediately.`);
        }
    }

    // 2. Momentum insight
    if (momentum === 'increasing') {
        insights.push(`📈 Spending is trending up. If unchecked, monthly costs will grow beyond ₪${fmt(avg_monthly_spend)}.`);
    } else if (momentum === 'decreasing') {
        insights.push(`📉 Spending is trending down — your cost discipline is working.`);
    } else if (avg_monthly_spend > 0) {
        insights.push(`📊 Monthly spend is stable at ~₪${fmt(avg_monthly_spend)}.`);
    }

    // 3. Anomaly insight
    if (anomalies.length > 0) {
        const top = anomalies[0];
        insights.push(
            `⚠️ ${top.description} is ${top.pct_above}% above average this month (₪${fmt(top.current)} vs ₪${fmt(top.avg)} avg).`
        );
    } else if (predicted_monthly.length > 0 && startingBalance != null) {
        const endBal = predicted_monthly.reduce((b, m) => b - m.total, startingBalance);
        const change = endBal - startingBalance;
        if (change < 0) {
            insights.push(`📆 Projected spend over ${predicted_monthly.length} months: ₪${fmt(Math.abs(change))} total.`);
        }
    }

    return insights.slice(0, 3);
}

// ── Budget-level insights ────────────────────────────────────────────────────

/**
 * Generate structured insights from monthly budget data.
 * Returns array of { type: 'positive'|'warning'|'info', icon, text }.
 */
export function generateBudgetInsights(monthlyTotals, tabEntries) {
    if (!monthlyTotals || monthlyTotals.length < 2) return [];
    const result = [];
    const months = monthlyTotals.map(([m, d]) => ({ month: m, ...d }));
    const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });

    const avgIncome  = months.reduce((s, m) => s + m.income, 0) / months.length;
    const avgExpense = months.reduce((s, m) => s + m.expense, 0) / months.length;

    // 1. Savings rate
    if (avgIncome > 0 && avgExpense > 0) {
        const rate = Math.round(((avgIncome - avgExpense) / avgIncome) * 100);
        if (rate > 20) {
            result.push({ type: 'positive', icon: '\u2713',
                text: `Average savings rate: ${rate}% of income — above the recommended 20%.` });
        } else if (rate > 10) {
            result.push({ type: 'info', icon: '\u2139',
                text: `Average savings rate: ${rate}% of income. Aim for 20%+ as a safety buffer.` });
        } else if (rate > 0) {
            result.push({ type: 'warning', icon: '\u26A0',
                text: `Average savings rate: only ${rate}% of income. Try to build a bigger margin.` });
        } else {
            result.push({ type: 'warning', icon: '\u26A0',
                text: `You're spending more than you earn on average. Monthly deficit: ₪${fmt(avgExpense - avgIncome)}.` });
        }
    }

    // 2. Break-even
    if (avgExpense > 0) {
        result.push({ type: 'info', icon: '\u2139',
            text: `Break-even: you need at least ₪${fmt(avgExpense)}/month to cover average expenses.` });
    }

    // 3. Expense volatility
    if (months.length >= 3) {
        const expenses = months.map(m => m.expense);
        const mean = expenses.reduce((s, v) => s + v, 0) / expenses.length;
        if (mean > 0) {
            const stdDev = Math.sqrt(expenses.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / expenses.length);
            const cv = (stdDev / mean) * 100;
            if (cv > 30) {
                result.push({ type: 'warning', icon: '\u26A0',
                    text: `Monthly expenses vary a lot (±₪${fmt(stdDev)} from average). Keep a buffer of at least ₪${fmt(stdDev * 2)} for unexpected spikes.` });
            } else if (cv > 15) {
                result.push({ type: 'info', icon: '\u2139',
                    text: `Monthly expenses are moderately variable (±₪${fmt(stdDev)} from average).` });
            }
        }
    }

    // 4. Seasonal spikes
    if (months.length >= 6) {
        const avgExp = months.reduce((s, m) => s + m.expense, 0) / months.length;
        const spikes = months.filter(m => m.expense > avgExp * 1.4);
        if (spikes.length > 0) {
            const names = spikes.map(m => {
                const [y, mo] = m.month.split('-');
                return new Date(+y, +mo - 1).toLocaleDateString(undefined, { month: 'long' });
            }).join(', ');
            result.push({ type: 'warning', icon: '\u26A0',
                text: `Spending spikes detected in: ${names}. Plan ahead for these high-spending periods.` });
        }
    }

    // 5. Category concentration
    if (tabEntries && tabEntries.length > 0) {
        const catMap = {};
        tabEntries.filter(e => e.type === 'outcome').forEach(e => {
            const cat = e.category || e.description || 'Other';
            catMap[cat] = (catMap[cat] || 0) + e.amount;
        });
        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const totalExp = sorted.reduce((s, [, v]) => s + v, 0);
        if (sorted.length >= 3 && totalExp > 0) {
            const top3Total = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0);
            const top3Pct = Math.round((top3Total / totalExp) * 100);
            const top3Names = sorted.slice(0, 3).map(([name]) => name).join(', ');
            if (top3Pct > 70) {
                result.push({ type: 'warning', icon: '\u26A0',
                    text: `Top 3 categories (${top3Names}) account for ${top3Pct}% of spending. A change in any of these would significantly impact your budget.` });
            } else {
                result.push({ type: 'info', icon: '\u2139',
                    text: `Top 3 categories (${top3Names}) account for ${top3Pct}% of spending.` });
            }
        }
    }

    return result.slice(0, 5);
}

// ── What-if ───────────────────────────────────────────────────────────────────

/**
 * Apply a percentage adjustment to predicted monthly spending.
 * Returns adjusted predicted_monthly and end balance.
 */
export function applyWhatIf(predicted_monthly, startingBalance, pctAdjust) {
    if (!predicted_monthly?.length || startingBalance == null) return { adjusted: [], endBalance: null };
    const factor = 1 + pctAdjust / 100;
    let bal = startingBalance;
    const adjusted = predicted_monthly.map(({ month, total }) => {
        const adjTotal = Math.round(total * factor * 100) / 100;
        bal = Math.round((bal - adjTotal) * 100) / 100;
        return { month, total: adjTotal, balance: bal };
    });
    return { adjusted, endBalance: bal };
}

export const WHAT_IF_OPTIONS = [
    { label: '−30%', value: -30 },
    { label: '−20%', value: -20 },
    { label: '−10%', value: -10 },
    { label: 'Current', value: 0 },
    { label: '+10%', value: 10 },
];
