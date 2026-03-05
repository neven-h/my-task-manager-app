import React from 'react';
import { THEME, BAUHAUS } from '../../theme';

const BauhausSectionTitle = ({ icon: Icon, children }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: BAUHAUS.spacing.md,
        paddingBottom: BAUHAUS.spacing.sm,
        borderBottom: '1px solid rgba(0,0,0,0.08)'
    }}>
        {Icon && <Icon size={18} color={THEME.primary} />}
        <h3 style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: 600,
            margin: 0
        }}>
            {children}
        </h3>
    </div>
);

export default BauhausSectionTitle;
