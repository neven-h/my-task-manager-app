import { useRef, useState, useCallback } from 'react';

/**
 * Detects an iOS-style edge-swipe-back gesture.
 * Only activates when the touch starts within `edgeWidth` px of the left edge,
 * ensuring it doesn't conflict with horizontal scrolling inside the view.
 *
 * Returns:
 *  - dragX       — current horizontal drag offset (px), 0 when idle
 *  - handlers    — { onTouchStart, onTouchMove, onTouchEnd } to spread on the root element
 */
const useSwipeBack = ({ onBack, edgeWidth = 30, threshold = 80 } = {}) => {
    const [dragX, setDragX] = useState(0);

    const startX = useRef(null);
    const startY = useRef(null);
    const isActive = useRef(false);
    const currentDragX = useRef(0); // ref so onTouchEnd always reads the latest value

    const onTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        if (touch.clientX <= edgeWidth) {
            startX.current = touch.clientX;
            startY.current = touch.clientY;
            isActive.current = true;
        } else {
            isActive.current = false;
        }
    }, [edgeWidth]);

    const onTouchMove = useCallback((e) => {
        if (!isActive.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX.current;
        const dy = Math.abs(touch.clientY - startY.current);

        // Cancel if predominantly vertical (user is scrolling, not swiping back)
        if (dy > Math.abs(dx) * 0.8) {
            isActive.current = false;
            currentDragX.current = 0;
            setDragX(0);
            return;
        }

        if (dx > 0) {
            const clamped = Math.min(dx, window.innerWidth);
            currentDragX.current = clamped;
            setDragX(clamped);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!isActive.current) return;
        isActive.current = false;

        if (currentDragX.current > threshold) {
            onBack?.();
        }

        // Always snap back to 0 (if onBack unmounts the view, this is a no-op)
        currentDragX.current = 0;
        setDragX(0);
    }, [threshold, onBack]);

    return {
        dragX,
        handlers: { onTouchStart, onTouchMove, onTouchEnd },
    };
};

export default useSwipeBack;
