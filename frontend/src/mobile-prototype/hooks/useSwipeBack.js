import { useState, useRef, useCallback } from 'react';

/**
 * Hook for iOS-style swipe-from-left-edge to go back.
 *
 * Detects touches starting within `edgeThreshold` px of the left screen edge,
 * tracks rightward movement, and fires `onBack()` when the swipe exceeds
 * `swipeThreshold` px (or 40% of screen width).
 *
 * Returns:
 *   swipeProgress (0-1) — for driving transition animations
 *   isActive        — true while a qualifying swipe is in progress
 *   handlers        — { onTouchStart, onTouchMove, onTouchEnd } to spread on the container
 */
const useSwipeBack = ({
    onBack,
    enabled = true,
    edgeThreshold = 20,
    swipeThreshold = 100
}) => {
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const startX = useRef(null);
    const startY = useRef(null);
    const isEdgeSwipe = useRef(false);
    const directionLocked = useRef(false);

    const onTouchStart = useCallback((e) => {
        if (!enabled) return;
        const touch = e.touches[0];
        // Only activate when touch starts near the left edge
        if (touch.clientX <= edgeThreshold) {
            startX.current = touch.clientX;
            startY.current = touch.clientY;
            isEdgeSwipe.current = true;
            directionLocked.current = false;
        } else {
            isEdgeSwipe.current = false;
        }
    }, [enabled, edgeThreshold]);

    const onTouchMove = useCallback((e) => {
        if (!isEdgeSwipe.current || startX.current === null) return;

        const touch = e.touches[0];
        const diffX = touch.clientX - startX.current;
        const diffY = touch.clientY - startY.current;

        // Lock direction after 10px movement — ignore if more vertical than horizontal
        if (!directionLocked.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            directionLocked.current = true;
            if (Math.abs(diffY) > Math.abs(diffX)) {
                // Vertical scroll, not a back swipe
                isEdgeSwipe.current = false;
                setIsActive(false);
                setSwipeProgress(0);
                return;
            }
        }

        // Only track rightward swipe
        if (diffX > 0) {
            const screenWidth = window.innerWidth;
            const threshold = Math.min(swipeThreshold, screenWidth * 0.4);
            const progress = Math.min(diffX / threshold, 1);
            setSwipeProgress(progress);
            setIsActive(true);
        } else {
            setSwipeProgress(0);
            setIsActive(false);
        }
    }, [swipeThreshold]);

    const onTouchEnd = useCallback(() => {
        if (!isEdgeSwipe.current) return;

        if (swipeProgress >= 1 && onBack) {
            onBack();
        }

        // Reset
        setSwipeProgress(0);
        setIsActive(false);
        startX.current = null;
        startY.current = null;
        isEdgeSwipe.current = false;
        directionLocked.current = false;
    }, [swipeProgress, onBack]);

    return {
        swipeProgress,
        isActive,
        handlers: { onTouchStart, onTouchMove, onTouchEnd }
    };
};

export default useSwipeBack;
