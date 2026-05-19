import { useState, useMemo, useCallback } from 'react';

/**
 * useBudgetFilters — manages search, category, amount range, and type filters.
 * Returns filtered entries and filter controls.
 */
const useBudgetFilters = (entries) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [onlyFixed, setOnlyFixed] = useState(false);

    const filtered = useMemo(() => {
        let result = entries;
        if (typeFilter !== 'all') result = result.filter(e => e.type === typeFilter);
        if (onlyFixed) result = result.filter(e => !!e.is_fixed);
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            result = result.filter(e =>
                e.description.toLowerCase().includes(q) ||
                (e.notes && e.notes.toLowerCase().includes(q)));
        }
        if (categoryFilter) result = result.filter(e => e.category === categoryFilter);
        const min = parseFloat(amountMin);
        if (!isNaN(min)) result = result.filter(e => e.amount >= min);
        const max = parseFloat(amountMax);
        if (!isNaN(max)) result = result.filter(e => e.amount <= max);
        // Sort newest-first
        return [...result].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.id - a.id);
    }, [entries, typeFilter, searchTerm, categoryFilter, amountMin, amountMax, onlyFixed]);

    const clearFilters = useCallback(() => {
        setSearchTerm(''); setCategoryFilter(''); setAmountMin(''); setAmountMax(''); setOnlyFixed(false);
    }, []);

    const hasActiveFilters = searchTerm || categoryFilter || amountMin || amountMax || onlyFixed;

    return {
        filtered, typeFilter, setTypeFilter,
        searchTerm, setSearchTerm,
        categoryFilter, setCategoryFilter,
        amountMin, setAmountMin, amountMax, setAmountMax,
        onlyFixed, setOnlyFixed,
        clearFilters, hasActiveFilters,
    };
};

export default useBudgetFilters;
