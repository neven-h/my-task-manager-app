import React from 'react';

const dividerStyle = {
    height: '1px',
    background: 'rgba(0,0,0,0.08)',
    marginLeft: '16px'
};

const MobileRow = ({
    children,
    onClick,
    showDivider = true,
    style
}) => {
    return (
        <>
            <div
                onClick={onClick}
                style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                    ...style
                }}
            >
                {children}
            </div>
            {showDivider && <div style={dividerStyle} />}
        </>
    );
};

export default MobileRow;
