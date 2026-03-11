import { useMemo } from 'react';
import { BAUHAUS } from '../theme';

const useMobileBankFilters = (transactions, typeFilter, searchTerm, dateFrom = '', dateTo = '', amountMin = '', amountMax = '') => {
    const filteredTransactions = useMemo(() =>
        transactions.filter(t => {
            if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
            if (searchTerm && !(t.description || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (dateFrom) { const d = (t.transaction_date || '').split('T')[0]; if (d < dateFrom) return false; }
            if (dateTo) { const d = (t.transaction_date || '').split('T')[0]; if (d > dateTo) return false; }
            if (amountMin !== '' && (Number(t.amount) || 0) < Number(amountMin)) return false;
            if (amountMax !== '' && (Number(t.amount) || 0) > Number(amountMax)) return false;
            return true;
        }),
        [transactions, typeFilter, searchTerm, dateFrom, dateTo, amountMin, amountMax]
    );

    const aggregateByCategory = (list) => {
        const categoryData = {};
        (list || []).forEach(t => {
            const desc = t.description || 'Other';
            const amount = Number(t.amount) || 0;
            if (!categoryData[desc]) categoryData[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
            categoryData[desc].count++;
            categoryData[desc].total += amount;
            if (t.transaction_type === 'cash') categoryData[desc].cash += amount;
            else categoryData[desc].credit += amount;
        });
        return categoryData;
    };

    const chartData = useMemo(() => {
        if (filteredTransactions.length === 0) return null;
        const categoryData = aggregateByCategory(filteredTransactions);
        const totalAmount = filteredTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        if (totalAmount === 0 || !Number.isFinite(totalAmount)) return null;
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5);
        return { sortedCategories, totalAmount };
    }, [filteredTransactions]);

    const PIE_COLORS = BAUHAUS.pieColors;

    return { filteredTransactions, aggregateByCategory, chartData, PIE_COLORS };
};

export default useMobileBankFilters;
