import React from 'react';
import { SYS } from './renovationConstants';

const RenovationGroupToggle = ({ groupMode, setGroupMode, filteredCount, totalCount }) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        {[['area', 'By Area'], ['contractor', 'By Contractor'], ['category', 'By Category']].map(([mode, label]) => (
            <button key={mode} onClick={() => setGroupMode(mode)} style={{
                padding: '5px 16px', border: `2px solid ${SYS.border}`,
                background: groupMode === mode ? SYS.primary : SYS.bg,
                color: groupMode === mode ? '#fff' : SYS.text,
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
            }}>
                {label}
            </button>
        ))}
        {filteredCount !== totalCount && (
            <span style={{ fontSize: '0.78rem', color: SYS.light, fontWeight: 600, marginLeft: 8 }}>
                Showing {filteredCount} of {totalCount} items
            </span>
        )}
    </div>
);

export default React.memo(RenovationGroupToggle);
