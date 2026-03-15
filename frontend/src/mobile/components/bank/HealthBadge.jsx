import React from 'react';

const HealthBadge = ({ score, label }) => (
    <div style={{
        background: label.bg, borderRadius: 10,
        padding: '6px 12px', textAlign: 'center', minWidth: 80,
    }}>
        <div style={{ fontWeight: 900, fontSize: '1.4rem', color: label.color, lineHeight: 1 }}>
            {score}
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: label.color, textTransform: 'uppercase', marginTop: 2 }}>
            {label.text}
        </div>
    </div>
);

export { HealthBadge };
export default HealthBadge;
