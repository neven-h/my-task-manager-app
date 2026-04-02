import React from 'react';
import { Menu, Search } from 'lucide-react';
import { THEME, FONT_STACK } from './theme';

const btnStyle = {
    background: '#fff',
    border: '3px solid #000',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const IOSHeader = ({ onMenuOpen, onSearchOpen }) => (
    <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#F8B4D9',
        borderBottom: '4px solid #000',
        paddingTop: 'env(safe-area-inset-top, 0px)'
    }}>
        <div style={{ height: '12px', width: '100%', background: '#F8B4D9' }} />
        <div style={{
            padding: '16px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h1 style={{
                fontFamily: FONT_STACK,
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-1px',
                textTransform: 'uppercase',
                color: THEME.text
            }}>
                TASK TRACKER
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {onSearchOpen && (
                    <button onClick={onSearchOpen} style={btnStyle} aria-label="Search">
                        <Search size={22} color={THEME.text} />
                    </button>
                )}
                <button onClick={onMenuOpen} style={btnStyle} aria-label="Menu">
                    <Menu size={24} color={THEME.text} />
                </button>
            </div>
        </div>
    </div>
);

export default React.memo(IOSHeader);
