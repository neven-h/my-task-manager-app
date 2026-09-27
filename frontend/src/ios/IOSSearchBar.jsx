import React, { useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const iconBtnStyle = {
    background: '#fff', border: '3px solid #000', padding: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

/**
 * Keyword search pinned inside the sticky header, so the on-screen keyboard can never cover it.
 * The task list refetches (debounced) as filters.search changes, so results update while typing.
 */
const IOSSearchBar = ({ onClose, onOpenFilters }) => {
    const { filters, setFilters } = useTaskContext();
    const inputRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    const handleClose = () => {
        setFilters(f => ({ ...f, search: '' }));
        onClose();
    };

    return (
        <form
            role="search"
            onSubmit={e => { e.preventDefault(); inputRef.current?.blur(); }}
            style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 16px 12px', background: '#fff', fontFamily: FONT_STACK }}
        >
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <Search size={18} color={THEME.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                    ref={inputRef}
                    type="search"
                    enterKeyHint="search"
                    placeholder="Search tasks..."
                    value={filters.search || ''}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    style={{ paddingLeft: 38, border: '3px solid #000', WebkitAppearance: 'none', appearance: 'none' }}
                />
            </div>
            <button type="button" onClick={() => { inputRef.current?.blur(); onOpenFilters(); }} style={iconBtnStyle} aria-label="Filters">
                <SlidersHorizontal size={20} color={THEME.text} />
            </button>
            <button type="button" onClick={handleClose} style={iconBtnStyle} aria-label="Close search">
                <X size={20} color={THEME.text} />
            </button>
        </form>
    );
};

export default IOSSearchBar;
