import { useRef, useState, useEffect } from 'react';

// The iOS shell scrolls the window, not the wrapper div, so "at top" must read window scroll.
const isAtTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

const usePullToRefresh = ({ onRefresh, threshold = 70 } = {}) => {
    const [pullY, setPullY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef(null);
    const startY = useRef(0);
    const armed = useRef(false);
    const locked = useRef(null);
    const pullRef = useRef(0);
    const refreshingRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const setPull = (v) => { pullRef.current = v; setPullY(v); };

        const handleTouchStart = (e) => {
            // Only a gesture that starts while already at the top can become a pull.
            armed.current = !refreshingRef.current && isAtTop();
            startY.current = e.touches[0].clientY;
            locked.current = null;
        };

        const handleTouchMove = (e) => {
            if (!armed.current) return;
            const dy = e.touches[0].clientY - startY.current;
            if (locked.current === null && Math.abs(dy) > 8) {
                locked.current = dy > 0 && isAtTop() ? 'pull' : 'scroll';
            }
            if (locked.current !== 'pull') return;
            e.preventDefault();
            setPull(Math.max(0, Math.min(dy * 0.5, threshold * 1.5)));
        };

        const handleTouchEnd = async () => {
            if (!armed.current) return;
            armed.current = false;
            const shouldRefresh = pullRef.current >= threshold && onRefreshRef.current;
            setPull(0);
            if (!shouldRefresh) return;
            refreshingRef.current = true;
            setRefreshing(true);
            try { await onRefreshRef.current(); } finally {
                refreshingRef.current = false;
                setRefreshing(false);
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [threshold]);

    return { pullY, refreshing, threshold, containerRef };
};

export default usePullToRefresh;
