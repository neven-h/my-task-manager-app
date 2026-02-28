import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const IOSActiveFilterBanner = () => {
    const { hasActiveFilters, clearFilters } = useTaskContext();

    if (!hasActiveFilters) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', background: THEME.secondary, borderBottom: '2px solid #000',
            fontFamily: FONT_STACK
        }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                <SlidersHorizontal size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Filters active
            </span>
            <button
                onClick={clearFilters}
                style={{
                    background: 'none', border: 'none', fontWeight: 900,
                    fontSize: '0.8rem', cursor: 'pointer', fontFamily: FONT_STACK,
                    textDecoration: 'underline'
                }}
            >
                Clear
            </button>
        </div>
    );
};

export default React.memo(IOSActiveFilterBanner);
