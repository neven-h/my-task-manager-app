import { useState, useMemo, useCallback } from 'react';

const useBankTransactionFilters = (monthTransactions) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [descriptionFilter, setDescriptionFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [previewFilter, setPreviewFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');

    const filteredTransactions = useMemo(() => {
        if (!Array.isArray(monthTransactions)) return [];
        return monthTransactions.filter(t => {
            if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
            if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (descriptionFilter && t.description !== descriptionFilter) return false;
            if (dateFrom) {
                const d = (t.transaction_date || '').split('T')[0];
                if (d < dateFrom) return false;
            }
            if (dateTo) {
                const d = (t.transaction_date || '').split('T')[0];
                if (d > dateTo) return false;
            }
            if (amountMin !== '' && t.amount < Number(amountMin)) return false;
            if (amountMax !== '' && t.amount > Number(amountMax)) return false;
            return true;
        });
    }, [monthTransactions, typeFilter, searchTerm, descriptionFilter, dateFrom, dateTo, amountMin, amountMax]);

    const { totalFiltered, creditTotal, cashTotal } = useMemo(() => (
        filteredTransactions.reduce((acc, t) => ({
            totalFiltered: acc.totalFiltered + t.amount,
            creditTotal: acc.creditTotal + (t.transaction_type === 'credit' ? t.amount : 0),
            cashTotal: acc.cashTotal + (t.transaction_type === 'cash' ? t.amount : 0)
        }), { totalFiltered: 0, creditTotal: 0, cashTotal: 0 })
    ), [filteredTransactions]);

    const aggregateByCategory = useCallback((transactions) => {
        const categoryData = {};
        transactions.forEach(t => {
            const desc = t.description || 'Other';
            if (!categoryData[desc]) categoryData[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
            categoryData[desc].count++;
            categoryData[desc].total += t.amount;
            if (t.transaction_type === 'cash') categoryData[desc].cash += t.amount;
            else categoryData[desc].credit += t.amount;
        });
        return categoryData;
    }, []);

    const chartData = useMemo(() => {
        if (monthTransactions.length === 0) return null;
        const categoryData = aggregateByCategory(filteredTransactions);
        const sortedCategories = Object.entries(categoryData).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
        return { sortedCategories, totalAmount: totalFiltered };
    }, [filteredTransactions, monthTransactions.length, totalFiltered, aggregateByCategory]);

    const getFilteredPreview = useCallback((uploadedData) => {
        if (!uploadedData?.transactions) return [];
        return uploadedData.transactions.filter(t => {
            if (previewFilter === 'positive' && t.amount < 0) return false;
            return !(previewFilter === 'negative' && t.amount >= 0);
        });
    }, [previewFilter]);

    return {
        searchTerm, setSearchTerm,
        descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter,
        previewFilter, setPreviewFilter,
        dateFrom, setDateFrom, dateTo, setDateTo,
        amountMin, setAmountMin, amountMax, setAmountMax,
        filteredTransactions,
        totalFiltered, creditTotal, cashTotal,
        chartData, aggregateByCategory, getFilteredPreview,
    };
};

export default useBankTransactionFilters;
