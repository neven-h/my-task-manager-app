import { useRef, useState, useCallback, useEffect } from 'react';

const usePullToRefresh = ({ onRefresh, threshold = 60 } = {}) => {
    const [pullY, setPullY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef(null);
    const startY = useRef(0);
    const locked = useRef(null);

    const handleTouchStart = useCallback((e) => {
        if (refreshing) return;
        startY.current = e.touches[0].clientY;
        locked.current = null;
    }, [refreshing]);

    const handleTouchMove = useCallback((e) => {
        if (refreshing) return;
        const dy = e.touches[0].clientY - startY.current;

        if (locked.current === null && Math.abs(dy) > 5) {
            locked.current = dy > 0 ? 'down' : 'other';
        }
        if (locked.current !== 'down') return;

        const el = containerRef.current;
        const scrollTop = el ? el.scrollTop : (document.documentElement.scrollTop || document.body.scrollTop);
        if (scrollTop > 5) return;

        if (dy > 0) {
            e.preventDefault();
            setPullY(Math.min(dy * 0.45, threshold * 1.6));
        }
    }, [refreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (pullY >= threshold && onRefresh) {
            setRefreshing(true);
            try { await onRefresh(); } finally { setRefreshing(false); }
        }
        setPullY(0);
    }, [pullY, threshold, onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return { pullY, refreshing, containerRef };
};

export default usePullToRefresh;
