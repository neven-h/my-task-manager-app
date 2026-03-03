import React from 'react';
import { THEME, BAUHAUS } from '../../theme';

const BauhausSectionTitle = ({ icon: Icon, children }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: BAUHAUS.spacing.md,
        paddingBottom: BAUHAUS.spacing.sm,
        borderBottom: BAUHAUS.subCardBorder
    }}>
        {Icon && <Icon size={18} color={THEME.primary} />}
        <h3 style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: BAUHAUS.labelWeight,
            textTransform: 'uppercase',
            margin: 0,
            letterSpacing: '0.5px'
        }}>
            {children}
        </h3>
    </div>
);

export default BauhausSectionTitle;
