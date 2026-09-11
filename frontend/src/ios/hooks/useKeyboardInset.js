import { useEffect, useState } from 'react';

/**
 * Height (px) of the area at the bottom of the screen hidden by the on-screen keyboard.
 *
 * The WKWebView is not resized when the keyboard opens, so `position: fixed; bottom: 0`
 * elements end up behind it. `window.visualViewport` does shrink, so the difference
 * between the layout viewport and the visual viewport is the keyboard height.
 */
export default function useKeyboardInset() {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (!vv) return undefined;

        const update = () => {
            const hidden = window.innerHeight - vv.height - vv.offsetTop;
            setInset(hidden > 40 ? Math.round(hidden) : 0);
        };

        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    return inset;
}
