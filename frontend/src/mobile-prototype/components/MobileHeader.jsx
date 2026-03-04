import React, { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { FONT_STACK, IOS_BLEND, THEME } from '../theme';

const MobileHeader = ({ onMenuOpen }) => {
    const [scrolled, setScrolled] = useState(false);

    const handleScroll = useCallback(() => {
        setScrolled(window.scrollY > 0);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: '#fff',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'box-shadow 0.2s ease',
            paddingTop: 'env(safe-area-inset-top, 0px)'
        }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{
                        fontFamily: FONT_STACK,
                        fontSize: 'clamp(1.25rem, 4vw, 1.6rem)',
                        fontWeight: 700,
                        margin: 0,
                        letterSpacing: '-0.5px',
                        color: '#000'
                    }}>
                        Task Tracker
                    </h1>
                    <div style={{ height: 2, width: 28, background: THEME.primary, marginTop: 4, borderRadius: 1 }} />
                </div>
                <button
                    onClick={onMenuOpen}
                    style={{
                        background: 'rgba(0,0,0,0.06)',
                        border: 'none',
                        borderRadius: '50%',
                        width: IOS_BLEND.minTapTarget,
                        height: IOS_BLEND.minTapTarget,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 150ms ease',
                        flexShrink: 0
                    }}
                    aria-label="Menu"
                >
                    <Menu size={22} color="#000" />
                </button>
            </div>
        </div>
    );
};

export default React.memo(MobileHeader);
