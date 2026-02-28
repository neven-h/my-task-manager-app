import { useRef, useState, useCallback } from 'react';

/**
 * Hook for touch-based left-swipe gesture detection.
 * Returns the current swipe offset and touch event handlers.
 */
const useSwipeGesture = ({ threshold = 100, onSwipe } = {}) => {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);

    const onTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
    }, []);

    const onTouchMove = useCallback((e) => {
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchCurrentX.current - touchStartX.current;
        // Only allow left swipe (negative diff)
        if (diff < 0) {
            setSwipeOffset(diff);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        const diff = touchCurrentX.current - touchStartX.current;
        if (Math.abs(diff) > threshold && onSwipe) {
            onSwipe('left');
        }
        setSwipeOffset(0);
    }, [threshold, onSwipe]);

    return {
        swipeOffset,
        handlers: { onTouchStart, onTouchMove, onTouchEnd }
    };
};

export default useSwipeGesture;
