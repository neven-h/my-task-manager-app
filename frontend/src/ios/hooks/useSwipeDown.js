import { useRef, useState, useCallback } from 'react';

/**
 * Hook for detecting a downward swipe gesture to dismiss a bottom-sheet panel.
 *
 * - Only activates when the touch is moving primarily downward (direction-locked).
 * - Respects scroll position: if the panel is scrolled down, lets native scroll
 *   handle the movement instead of triggering dismiss.
 * - Returns `dragY` for live visual feedback and `handlers` to spread onto the
 *   drag-handle element.
 *
 * @param {object} options
 * @param {Function} options.onClose   Called when the user drags past the threshold.
 * @param {React.RefObject} options.scrollRef  Ref to the scrollable container.
 * @param {number} [options.threshold=80]  Pixels of drag required to dismiss.
 */
const useSwipeDown = ({ onClose, scrollRef, threshold = 80 } = {}) => {
    const [dragY, setDragY] = useState(0);

    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const directionLocked = useRef(null); // 'v' | 'h' | null
    const active = useRef(false);

    const onTouchStart = useCallback((e) => {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
        directionLocked.current = null;
        active.current = false;
    }, []);

    const onTouchMove = useCallback((e) => {
        const dy = e.touches[0].clientY - touchStartY.current;
        const dx = e.touches[0].clientX - touchStartX.current;

        // Lock direction on first significant movement
        if (!directionLocked.current && (Math.abs(dy) > 5 || Math.abs(dx) > 5)) {
            directionLocked.current = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
        }

        // Only handle downward vertical drags
        if (directionLocked.current !== 'v') return;
        if (dy <= 0) return;

        // If the panel is scrolled, let native scroll handle it
        if (scrollRef?.current && scrollRef.current.scrollTop > 0) return;

        active.current = true;
        e.preventDefault?.();
        setDragY(dy);
    }, [scrollRef]);

    const onTouchEnd = useCallback(() => {
        if (!active.current) return;
        active.current = false;

        setDragY((prev) => {
            if (prev > threshold) {
                // Dismiss: snap completely off-screen then call onClose
                setTimeout(() => {
                    setDragY(0);
                    onClose?.();
                }, 0);
                return prev; // hold position briefly during close animation
            }
            return 0; // snap back
        });
    }, [threshold, onClose]);

    return {
        dragY,
        handlers: { onTouchStart, onTouchMove, onTouchEnd },
    };
};

export default useSwipeDown;
