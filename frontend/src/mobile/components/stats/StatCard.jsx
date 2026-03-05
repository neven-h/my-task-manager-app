import React from 'react';
import { THEME, BAUHAUS } from '../../theme';

const StatCard = ({ label, value, bg = '#fff', color = THEME.text, sub }) => (
    <div style={{
        borderRadius: 16,
        padding: BAUHAUS.spacing.lg,
        background: bg,
        textAlign: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
        <div style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: 500,
            color: color === '#fff' ? 'rgba(255,255,255,0.8)' : THEME.muted,
            marginBottom: BAUHAUS.spacing.sm
        }}>
            {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
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
