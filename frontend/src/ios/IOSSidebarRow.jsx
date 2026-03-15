import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { FONT_STACK } from './theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

export const SectionLabel = ({ children, first }) => (
    <div style={{
        fontSize: '12px', fontWeight: 400, color: '#6C6C70', textTransform: 'uppercase',
        letterSpacing: '0.4px', padding: first ? '8px 20px 6px' : '20px 20px 6px', fontFamily: FONT_STACK
    }}>
        {children}
    </div>
);

export const SectionCard = ({ children }) => (
    <div style={{ background: '#fff', borderRadius: 12, margin: '0 16px', overflow: 'hidden' }}>
        {children}
    </div>
);

export const Row = ({ icon: Icon, iconBg, label, onClick, destructive = false, showDivider = true, isAction = false }) => {
    const [pressed, setPressed] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <button
                onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
                onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
                onClick={onClick}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '0 14px 0 16px', height: 52,
                    background: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: `background 120ms ${SPRING}`, fontFamily: FONT_STACK
                }}
            >
                <div style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: destructive ? '#FF3B30' : (iconBg || '#8E8E93'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <Icon size={17} color="#fff" strokeWidth={2.2} />
                </div>
                <span style={{ flex: 1, fontSize: '1rem', fontWeight: 400, color: destructive ? '#FF3B30' : '#000', fontFamily: FONT_STACK, lineHeight: 1 }}>
                    {label}
                </span>
                {!isAction && !destructive && (
                    <ChevronRight size={16} color="#C7C7CC" strokeWidth={2.5} />
                )}
            </button>
            {showDivider && (
                <div style={{ position: 'absolute', bottom: 0, left: 58, right: 0, height: '0.5px', background: 'rgba(0,0,0,0.12)' }} />
            )}
        </div>
    );
};
