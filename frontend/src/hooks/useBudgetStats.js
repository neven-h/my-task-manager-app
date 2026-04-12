import { useMemo } from 'react';
import { healthScore, healthLabel, runwayMonths, runwayInfo, generateInsights, generateBudgetInsights } from '../utils/cashflowHelpers';

/**
 * useBudgetStats — derives monthly aggregations, health score, runway,
 * and chart data from budget entries.
 */
const useBudgetStats = (entries, cutoff, activeTabId, forecast = null, linkedTab = null, dateFrom = '') => {
    // Only show entries that belong to the active tab; if no tab is selected, show nothing
    const tabEntries = useMemo(() =>
        activeTabId === null ? [] : entries.filter(e => e.tab_id === activeTabId),
        [entries, activeTabId]);

    const filtered = useMemo(() =>
        tabEntries.filter(e => e.entry_date <= cutoff && (!dateFrom || e.entry_date >= dateFrom)),
        [tabEntries, cutoff, dateFrom]);

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
            const cat = e.category || e.description || 'Other';
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

    // Health metrics — when linked to a bank tab, include bank income/expense
    const health = useMemo(() => {
        if (monthlyTotals.length === 0) return null;
        const budgetExpense = monthlyTotals.reduce((s, [, d]) => s + d.expense, 0);
        const budgetIncome  = monthlyTotals.reduce((s, [, d]) => s + d.income, 0);

        // Add bank data when linked
        const bankExpense = (linkedTab && forecast) ? (forecast.bank_expense ?? 0) : 0;
        const bankIncome  = (linkedTab && forecast) ? (forecast.bank_income  ?? 0) : 0;
        const totalExpense = budgetExpense + bankExpense;
        const totalIncome  = budgetIncome  + bankIncome;

        // When a specific date range is active, divide by the actual time span
        // (in months) rather than the number of distinct calendar-month buckets.
        // Example: "Last 30 days" spans 2 calendar months but is only ~1 month
        // of data, so dividing by 2 would halve the correct figure.
        const monthDivisor = dateFrom
            ? Math.max(1, (new Date(cutoff) - new Date(dateFrom)) / (1000 * 60 * 60 * 24 * 30.44))
            : monthlyTotals.length;
        const avgMonthly = totalExpense / monthDivisor;

        // Momentum: compare last 3 months
        const recent = monthlyTotals.slice(-3).map(([, d]) => d.expense);
        let momentum = 'stable';
        if (recent.length >= 2) {
            const last = recent[recent.length - 1];
            const prev = recent.slice(0, -1).reduce((s, v) => s + v, 0) / (recent.length - 1);
            if (last > prev * 1.1) momentum = 'increasing';
            else if (last < prev * 0.9) momentum = 'decreasing';
        }

        const avgMonthlyIncome = totalIncome / monthDivisor;
        const balance = totalIncome - totalExpense;
        const monthlyNet = avgMonthlyIncome - avgMonthly; // positive = monthly surplus
        const runway = runwayMonths(balance > 0 ? balance : null, avgMonthly);
        const rwInfo = runwayInfo(runway);
        const score = healthScore(runway, momentum, 0);
        const label = healthLabel(score);
        const insights = generateInsights(
            { avg_monthly_spend: avgMonthly, momentum, anomalies: [] },
            balance > 0 ? balance : null,
        );
        const budgetInsights = generateBudgetInsights(monthlyTotals, tabEntries);

        return { score, label, runway, rwInfo, momentum, avgMonthly, avgMonthlyIncome, monthlyNet, insights, budgetInsights, balance };
    }, [monthlyTotals, tabEntries, forecast, linkedTab]);

    return { tabEntries, monthlyTotals, chartData, allCategories, health };
};

export default useBudgetStats;
