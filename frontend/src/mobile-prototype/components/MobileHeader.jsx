import React, { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { FONT_STACK, IOS_BLEND } from '../theme';

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
            background: IOS_BLEND.accentBarColor,
            borderBottom: `${IOS_BLEND.headerBorderWidth} solid #000`,
            boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition: 'box-shadow 0.2s ease',
            paddingTop: 'env(safe-area-inset-top, 0px)'
        }}>
            <div style={{ height: IOS_BLEND.accentBarHeight, width: '100%', background: IOS_BLEND.accentBarColor }} />
            <div style={{ padding: '16px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{
                    fontFamily: FONT_STACK, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                    fontWeight: 900, margin: 0, letterSpacing: '-1px',
                    textTransform: 'uppercase', color: '#000'
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
                        justifyContent: 'center',
                        minWidth: IOS_BLEND.minTapTarget,
                        minHeight: IOS_BLEND.minTapTarget
                    }}
                    aria-label="Menu"
                >
                    <Menu size={24} color="#000" />
                </button>
            </div>
        </div>
    );
};

export default React.memo(MobileHeader);
