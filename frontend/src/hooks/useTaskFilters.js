import { useState, useCallback } from 'react';
import useDebounce from './useDebounce';

const DEFAULT_FILTERS = {
    search: '',
    category: 'all',
    status: 'all',
    client: '',
    dateStart: '',
    dateEnd: '',
    tags: [],
    hasAttachment: false
};

const useTaskFilters = () => {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [taskViewMode, setTaskViewMode] = useState('all');

    const debouncedFilters = useDebounce(filters, 300);

    const buildFilterParams = useCallback((f) => {
        const activeFilters = f || filters;
        const params = new URLSearchParams();

        if (activeFilters.category !== 'all') params.append('category', activeFilters.category);
        if (activeFilters.status !== 'all') params.append('status', activeFilters.status);
        if (activeFilters.client) params.append('client', activeFilters.client);
        if (activeFilters.search) params.append('search', activeFilters.search);
        if (activeFilters.dateStart) params.append('date_start', activeFilters.dateStart);
        if (activeFilters.dateEnd) params.append('date_end', activeFilters.dateEnd);
        if (activeFilters.hasAttachment) params.append('has_attachment', 'true');

        return params;
    }, [filters]);

    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    const hasActiveFilters = filters.search || filters.category !== 'all' || filters.status !== 'all' ||
        filters.client || filters.dateStart || filters.dateEnd || filters.tags.length > 0 || filters.hasAttachment;

    return {
        filters, setFilters,
        taskViewMode, setTaskViewMode,
        debouncedFilters,
        buildFilterParams,
        clearFilters,
        hasActiveFilters
    };
};

export default useTaskFilters;
