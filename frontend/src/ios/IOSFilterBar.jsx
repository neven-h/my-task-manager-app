import React from 'react';
import { THEME, FONT_STACK } from './theme';

const FILTERS = [
    { key: 'all', label: 'All Tasks' },
    { key: 'done', label: 'Completed Only' },
    { key: 'active', label: 'Uncompleted Only' }
];

const IOSFilterBar = ({ filterMode, setFilterMode }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 16px', marginBottom: '20px' }}>
        {FILTERS.map(({ key, label }) => (
            <button
                key={key}
                type="button"
                onClick={() => setFilterMode(key)}
                style={{
                    fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                    fontSize: '0.8rem', padding: '12px 18px', border: '3px solid #000',
                    background: filterMode === key ? THEME.primary : '#fff',
                    color: filterMode === key ? '#fff' : THEME.text,
                    cursor: 'pointer'
                }}
            >
                {label}
            </button>
        ))}
    </div>
);

export default React.memo(IOSFilterBar);
