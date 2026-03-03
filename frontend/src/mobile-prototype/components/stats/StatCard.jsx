import React from 'react';
import { THEME, BAUHAUS } from '../../theme';

const StatCard = ({ label, value, bg = BAUHAUS.cardBg, color = THEME.text, sub }) => (
    <div style={{
        border: BAUHAUS.cardBorder,
        padding: BAUHAUS.spacing.lg,
        background: bg,
        textAlign: 'center'
    }}>
        <div style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: BAUHAUS.labelWeight,
            textTransform: 'uppercase',
            color: color === '#fff' ? 'rgba(255,255,255,0.8)' : THEME.muted,
            marginBottom: BAUHAUS.spacing.sm
        }}>
            {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: BAUHAUS.headingWeight, color }}>
            {value}
        </div>
        {sub && (
            <div style={{
                fontSize: '0.75rem',
                color: color === '#fff' ? 'rgba(255,255,255,0.7)' : THEME.muted,
                marginTop: BAUHAUS.spacing.xs
            }}>
                {sub}
            </div>
        )}
    </div>
);

export default StatCard;
