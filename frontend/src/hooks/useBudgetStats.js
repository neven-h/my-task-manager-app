import { useMemo } from 'react';
import { healthScore, healthLabel, runwayMonths, runwayInfo, generateInsights } from '../utils/cashflowHelpers';

/**
 * useBudgetStats — derives monthly aggregations, health score, runway,
 * and chart data from budget entries.
 */
const useBudgetStats = (entries, cutoff, activeTabId) => {
    const tabEntries = useMemo(() =>
        activeTabId === null ? entries : entries.filter(e => e.tab_id === activeTabId),
        [entries, activeTabId]);

    const filtered = useMemo(() =>
        tabEntries.filter(e => e.entry_date <= cutoff),
        [tabEntries, cutoff]);

    // Monthly totals: { 'YYYY-MM': { income, expense } }
    const monthlyTotals = useMemo(() => {
        const map = {};
        filtered.forEach(e => {
            const m = e.entry_date.slice(0, 7);
            if (!map[m]) map[m] = { income: 0, expense: 0 };
            if (e.type === 'income') map[m].income += e.amount;
            else map[m].expense += e.amount;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    // Expense chart data: top categories
    const chartData = useMemo(() => {
        const catMap = {};
        filtered.filter(e => e.type === 'outcome').forEach(e => {
            const cat = e.category || 'Uncategorized';
            if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
            catMap[cat].total += e.amount;
            catMap[cat].count += 1;
        });
        const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
        const totalAmount = sorted.reduce((s, [, d]) => s + d.total, 0);
        return { sortedCategories: sorted, totalAmount };
    }, [filtered]);

    // All categories for filter dropdown
    const allCategories = useMemo(() =>
        [...new Set(tabEntries.map(e => e.category).filter(Boolean))].sort(),
        [tabEntries]);

    // Health metrics
    const health = useMemo(() => {
        if (monthlyTotals.length === 0) return null;
        const totalExpense = monthlyTotals.reduce((s, [, d]) => s + d.expense, 0);
        const avgMonthly = totalExpense / monthlyTotals.length;

        // Momentum: compare last 3 months
        const recent = monthlyTotals.slice(-3).map(([, d]) => d.expense);
        let momentum = 'stable';
        if (recent.length >= 2) {
            const last = recent[recent.length - 1];
            const prev = recent.slice(0, -1).reduce((s, v) => s + v, 0) / (recent.length - 1);
            if (last > prev * 1.1) momentum = 'increasing';
            else if (last < prev * 0.9) momentum = 'decreasing';
        }

        const totalIncome = monthlyTotals.reduce((s, [, d]) => s + d.income, 0);
        const balance = totalIncome - totalExpense;
        const runway = runwayMonths(balance, avgMonthly);
        const rwInfo = runwayInfo(runway);
        const score = healthScore(runway, momentum, 0);
        const label = healthLabel(score);
        const insights = generateInsights(
            { avg_monthly_spend: avgMonthly, momentum, anomalies: [] },
            balance,
        );

        return { score, label, runway, rwInfo, momentum, avgMonthly, insights, balance };
    }, [monthlyTotals]);

    return { tabEntries, monthlyTotals, chartData, allCategories, health };
};

export default useBudgetStats;
