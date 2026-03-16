import { useRef, useState, useCallback } from 'react';

/**
 * Hook for touch-based left-swipe gesture detection.
 *
 * Two modes:
 *   Legacy (onSwipe provided): fires onSwipe at threshold, snaps back.
 *   Snap-open (snapWidth provided, no onSwipe): locks card open at snapWidth,
 *     exposes isOpen + reset() so the caller can render a tappable action button.
 *
 * Direction locking prevents vertical scrolling from accidentally triggering a swipe.
 */
const useSwipeGesture = ({ threshold = 80, onSwipe, snapWidth = 90, disabled = false } = {}) => {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isTracking, setIsTracking] = useState(false);

    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchCurrentX = useRef(0);
    const directionLocked = useRef(null); // 'h' | 'v' | null
    const snapMode = !onSwipe;

    const onTouchStart = useCallback((e) => {
        if (disabled) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchCurrentX.current = e.touches[0].clientX;
        directionLocked.current = null;
        setIsTracking(true);
    }, [disabled]);

    const onTouchMove = useCallback((e) => {
        if (disabled) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        const dy = e.touches[0].clientY - touchStartY.current;

        // Lock scroll direction on first significant movement
        if (!directionLocked.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            directionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
        if (directionLocked.current === 'v') return;

        touchCurrentX.current = e.touches[0].clientX;
        if (dx < 0) setSwipeOffset(dx);
    }, [disabled]);

    const onTouchEnd = useCallback(() => {
        setIsTracking(false);
        const diff = touchCurrentX.current - touchStartX.current;

        if (directionLocked.current === 'v') {
            setSwipeOffset(0);
            return;
        }

        if (!snapMode) {
            // Legacy: fire immediately at threshold, snap back
            if (Math.abs(diff) > threshold && onSwipe) onSwipe('left');
            setSwipeOffset(0);
        } else {
            // Snap-open: lock at -snapWidth when threshold exceeded
            if (diff < -threshold) {
                setIsOpen(true);
                setSwipeOffset(-snapWidth);
            } else {
                setIsOpen(false);
                setSwipeOffset(0);
            }
        }
    }, [threshold, onSwipe, snapMode, snapWidth]);

    const reset = useCallback(() => {
        setIsOpen(false);
        setSwipeOffset(0);
    }, []);

    return {
        swipeOffset,
        isOpen,
        isTracking,
        reset,
        handlers: { onTouchStart, onTouchMove, onTouchEnd },
    };
};

export default useSwipeGesture;
