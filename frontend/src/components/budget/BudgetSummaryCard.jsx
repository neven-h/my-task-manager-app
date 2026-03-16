import React from 'react';

const SYS = { bg: '#fff', border: '#000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

export const SummaryCard = ({ icon: Icon, label, amount, color, sub, badge }) => (
    <div style={{
        flex: '1 1 180px',
        background: SYS.bg,
        border: `3px solid ${SYS.border}`,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 6,
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: SYS.light, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.6px',
        }}>
            <Icon size={13} color={color} />
            {label}
            {badge && (
                <span style={{
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: 0.2,
                    background: 'rgba(0,0,255,0.08)', color: '#0000FF',
                    borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase',
                }}>
                    {badge}
                </span>
            )}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1.15 }}>
            {sub}{fmt(amount)}
        </div>
    </div>
);

export default SummaryCard;
