import React from 'react';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";
const FILTERS = [
    { key: 'all', label: 'All Tasks' },
    { key: 'done', label: 'Completed Only' },
    { key: 'active', label: 'Uncompleted Only' }
];

const MobileFilterBar = ({ filterMode, setFilterMode }) => {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 16px', marginBottom: '20px' }}>
            {FILTERS.map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setFilterMode(key)}
                    style={{
                        fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                        fontSize: '0.8rem', padding: '12px 18px', border: '3px solid #000',
                        background: filterMode === key ? '#0000FF' : '#fff',
                        color: filterMode === key ? '#fff' : '#000',
                        cursor: 'pointer'
                    }}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default React.memo(MobileFilterBar);
