import React from 'react';
import { Menu } from 'lucide-react';
import { THEME, FONT_STACK } from './theme';

const IOSHeader = ({ onMenuOpen }) => (
    <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '4px solid #000'
    }}>
        {/* Top bar: solid pink */}
        <div style={{ height: '12px', width: '100%', background: '#F8B4D9' }} />
        <div style={{
            padding: '16px',
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
            <button
                onClick={onMenuOpen}
                style={{
                    background: '#fff',
                    border: '3px solid #000',
                    padding: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                aria-label="Menu"
            >
                <Menu size={24} color={THEME.text} />
            </button>
        </div>
    </div>
);

export default React.memo(IOSHeader);
