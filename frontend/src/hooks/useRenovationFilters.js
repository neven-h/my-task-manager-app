import { useState, useMemo, useCallback } from 'react';

const useRenovationFilters = (items) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [contractorFilter, setContractorFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [groupMode, setGroupMode] = useState('area');

    const uniqueAreas = useMemo(() => [...new Set(items.map(i => (i.area || '').trim()).filter(Boolean))].sort(), [items]);
    const uniqueContractors = useMemo(() => [...new Set(items.map(i => (i.contractor || '').trim()).filter(Boolean))].sort(), [items]);
    const uniqueCategories = useMemo(() => [...new Set(items.map(i => (i.category || '').trim()).filter(Boolean))].sort(), [items]);

    const filtered = useMemo(() => {
        let result = items;
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            result = result.filter(i =>
                (i.name || '').toLowerCase().includes(q) ||
                (i.contractor || '').toLowerCase().includes(q) ||
                (i.notes || '').toLowerCase().includes(q) ||
                (i.category || '').toLowerCase().includes(q)
            );
        }
        if (statusFilter) result = result.filter(i => i.status === statusFilter);
        if (areaFilter) result = result.filter(i => (i.area || '').trim() === areaFilter);
        if (contractorFilter) result = result.filter(i => (i.contractor || '').trim() === contractorFilter);
        if (categoryFilter) result = result.filter(i => (i.category || '').trim() === categoryFilter);
        if (dateFrom) result = result.filter(i => (i.created_at || '') >= dateFrom);
        if (dateTo) result = result.filter(i => (i.created_at || '').slice(0, 10) <= dateTo);
        return result;
    }, [items, searchTerm, statusFilter, areaFilter, contractorFilter, categoryFilter, dateFrom, dateTo]);

    const hasActiveFilters = !!(searchTerm || statusFilter || areaFilter || contractorFilter || categoryFilter || dateFrom || dateTo);

    const clearFilters = useCallback(() => {
        setSearchTerm(''); setStatusFilter(''); setAreaFilter('');
        setContractorFilter(''); setCategoryFilter('');
        setDateFrom(''); setDateTo('');
    }, []);

    const grouped = useMemo(() => {
        const map = {};
        const fallback = groupMode === 'contractor' ? 'Unassigned' : groupMode === 'category' ? 'Uncategorized' : 'Other';
        filtered.forEach(item => {
            let key;
            if (groupMode === 'contractor') key = (item.contractor || '').trim() || fallback;
            else if (groupMode === 'category') key = (item.category || '').trim() || fallback;
            else key = (item.area || '').trim() || 'Other';
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return Object.entries(map).sort(([a], [b]) => {
            if (a === fallback) return 1;
            if (b === fallback) return -1;
            return a.localeCompare(b);
        });
    }, [filtered, groupMode]);

    return {
        searchTerm, setSearchTerm, statusFilter, setStatusFilter,
        areaFilter, setAreaFilter, contractorFilter, setContractorFilter,
        categoryFilter, setCategoryFilter, dateFrom, setDateFrom, dateTo, setDateTo,
        groupMode, setGroupMode, uniqueAreas, uniqueContractors, uniqueCategories,
        filtered, grouped, hasActiveFilters, clearFilters,
    };
};

export default useRenovationFilters;
