import { useEffect, useState } from 'react';

const QUERY = '(max-width: 640px)';

/**
 * True when the viewport is phone-sized. Tracks orientation / resize changes.
 * Used by the shared (desktop-first) pages so they can tighten spacing on iOS.
 */
export default function useIsNarrowScreen() {
    const [narrow, setNarrow] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mql = window.matchMedia(QUERY);
        const onChange = (e) => setNarrow(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return narrow;
}
