import React from 'react';

const RenovationGroupToggle = ({ groupMode, setGroupMode, filteredCount, totalCount }) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        {[['area', 'By Area'], ['contractor', 'By Contractor'], ['category', 'By Category']].map(([mode, label]) => (
            <button key={mode} onClick={() => setGroupMode(mode)} style={{
                padding: '5px 16px', border: '2px solid #000',
                background: groupMode === mode ? '#0000FF' : '#fff',
                color: groupMode === mode ? '#fff' : '#000',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
            }}>
                {label}
            </button>
        ))}
        {filteredCount !== totalCount && (
            <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600, marginLeft: 8 }}>
                Showing {filteredCount} of {totalCount} items
            </span>
        )}
    </div>
);

export default React.memo(RenovationGroupToggle);
