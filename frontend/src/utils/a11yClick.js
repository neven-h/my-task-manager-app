// Keyboard + screen-reader behaviour for non-<button> elements that react to clicks.
// Spread onto the element: <div {...clickable(handler)} />. Enter/Space only activate
// when the element itself has focus, so controls nested inside it keep their own keys.
export const keyActivate = (handler) => ({
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler(e);
        }
    },
});

export const clickable = (handler, extra) => ({
    ...keyActivate(handler),
    onClick: handler,
    ...extra,
});
