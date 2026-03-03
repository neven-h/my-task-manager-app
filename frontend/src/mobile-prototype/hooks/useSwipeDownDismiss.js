import { useState, useRef, useCallback } from 'react';

/**
 * Hook for swipe-down to dismiss bottom-sheet modals.
 *
 * Tracks downward swipe on modal content and fires `onDismiss()`
 * when the swipe exceeds `threshold` px.
 *
 * Returns:
 *   offset     — current vertical pixel offset (for translateY animation)
 *   isDragging — true while swipe is active
 *   handlers   — { onTouchStart, onTouchMove, onTouchEnd } for the modal content div
 */
const useSwipeDownDismiss = ({
    onDismiss,
    threshold = 120,
    enabled = true
}) => {
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(null);
    const startX = useRef(null);
    const directionLocked = useRef(false);
    const isVertical = useRef(false);

    const onTouchStart = useCallback((e) => {
        if (!enabled) return;
        const touch = e.touches[0];
        startY.current = touch.clientY;
        startX.current = touch.clientX;
        directionLocked.current = false;
        isVertical.current = false;
    }, [enabled]);

    const onTouchMove = useCallback((e) => {
        if (startY.current === null) return;

        const touch = e.touches[0];
        const diffY = touch.clientY - startY.current;
        const diffX = touch.clientX - startX.current;

        // Lock direction after 10px total movement
        if (!directionLocked.current && (Math.abs(diffY) > 10 || Math.abs(diffX) > 10)) {
            directionLocked.current = true;
            isVertical.current = Math.abs(diffY) > Math.abs(diffX);
        }

        if (!directionLocked.current || !isVertical.current) return;

        // Only track downward movement
        if (diffY > 0) {
            setOffset(diffY);
            setIsDragging(true);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (offset >= threshold && onDismiss) {
            onDismiss();
        }
        setOffset(0);
        setIsDragging(false);
        startY.current = null;
        startX.current = null;
        directionLocked.current = false;
        isVertical.current = false;
    }, [offset, threshold, onDismiss]);

    return {
        offset,
        isDragging,
        handlers: { onTouchStart, onTouchMove, onTouchEnd }
    };
};

export default useSwipeDownDismiss;
