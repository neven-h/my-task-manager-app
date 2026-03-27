import React, { useState } from 'react';
import { FONT_STACK } from './theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

export const SectionLabel = ({ children, first }) => (
    <div style={{
        fontSize: '0.7rem', fontWeight: 700, color: '#666', textTransform: 'uppercase',
        letterSpacing: '0.5px', padding: first ? '16px 16px 4px' : '20px 16px 4px', fontFamily: FONT_STACK
    }}>
        {children}
    </div>
);

export const SectionCard = ({ children }) => (
    <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
        {children}
    </div>
);

export const Row = ({ icon: Icon, label, onClick, destructive = false, showDivider = true }) => {
    const [pressed, setPressed] = useState(false);
    return (
        <button
            onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
            onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
            onClick={onClick}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '0 16px', height: 52,
                background: pressed ? '#000' : 'transparent',
                border: 'none',
                borderBottom: showDivider ? '1px solid #ddd' : 'none',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: FONT_STACK,
                color: pressed ? '#fff' : (destructive ? '#FF0000' : '#000'),
            }}
        >
            <Icon size={18} strokeWidth={2.5} color={pressed ? '#fff' : (destructive ? '#FF0000' : '#000')} />
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1 }}>
                {label}
            </span>
        </button>
    );
};
