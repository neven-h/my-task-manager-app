import React from 'react';
import { STATUS_COLORS, STATUS_LABELS } from './renovationConstants';

const RenovationStatusBadge = ({ status }) => (
    <span style={{
        display: 'inline-block', padding: '2px 8px',
        background: STATUS_COLORS[status] || '#666',
        color: '#fff', fontSize: '0.68rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
        {STATUS_LABELS[status] || status}
    </span>
);

export default RenovationStatusBadge;
