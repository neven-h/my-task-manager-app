import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value
 * PERFORMANCE OPTIMIZATION: Prevents excessive API calls when filters change rapidly
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - The debounced value
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
};

export default useDebounce;
