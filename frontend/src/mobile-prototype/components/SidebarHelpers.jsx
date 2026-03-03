import React from 'react';
import { ChevronRight } from 'lucide-react';
import { FONT_STACK } from '../theme';

export const SectionTitle = ({ children }) => (
    <h3 style={{
        fontSize: '0.7rem',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
        color: '#999',
        fontFamily: FONT_STACK,
        paddingLeft: '4px'
    }}>
        {children}
    </h3>
);

export const GroupedItem = ({ icon: Icon, label, onClick, badge, color, destructive }) => (
    <button
        className="ios-grouped-item"
        onClick={onClick}
        style={{
            width: '100%',
            border: 'none',
            fontFamily: FONT_STACK,
            fontSize: '1rem',
            fontWeight: 500,
            color: destructive ? '#FF3B30' : '#000',
            position: 'relative',
            textAlign: 'left'
        }}
    >
        <Icon size={20} color={color || (destructive ? '#FF3B30' : '#666')} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
            <span style={{
                background: '#FF0000',
                borderRadius: '50%',
                width: '8px',
                height: '8px',
                display: 'inline-block',
                flexShrink: 0
            }} />
        )}
        <ChevronRight size={16} color="#C7C7CC" style={{ flexShrink: 0 }} />
    </button>
);
