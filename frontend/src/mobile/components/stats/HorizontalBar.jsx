import React from 'react';
import { BAUHAUS } from '../../theme';

const HorizontalBar = ({ label, value, maxValue, color, suffix = '' }) => {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div style={{ marginBottom: BAUHAUS.spacing.sm }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: BAUHAUS.spacing.xs,
                fontSize: '0.75rem'
            }}>
                <span style={{ fontWeight: BAUHAUS.labelWeight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {label}
                </span>
                <span style={{ fontWeight: BAUHAUS.headingWeight, flexShrink: 0, marginLeft: '8px' }}>
                    {value}{suffix}
                </span>
            </div>
            <div style={{ height: '8px', background: BAUHAUS.cardSecondaryBg, border: '1px solid #000' }}>
                <div style={{
                    height: '100%',
                    width: `${Math.max(pct, 2)}%`,
                    background: color,
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};

export default HorizontalBar;
