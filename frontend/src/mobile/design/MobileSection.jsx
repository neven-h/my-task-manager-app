import React from 'react';

const MobileSection = ({ children, style }) => {
    return (
        <div
            style={{
                background: '#ffffff',
                borderRadius: '14px',
                overflow: 'hidden',
                marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                ...style
            }}
        >
            {children}
        </div>
    );
};

export default MobileSection;
