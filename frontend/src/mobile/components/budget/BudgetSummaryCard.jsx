import React, { memo } from 'react';

const IOS = {
    card:   '#fff',
    muted:  '#8E8E93',
    blue:   '#007AFF',
    radius: 16,
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

export const SummaryCard = memo(({ icon: Icon, label, amount, color, sign, badge }) => (
    <div style={{
        flex: '1 1 0',
        background: IOS.card,
        borderRadius: IOS.radius,
        padding: '14px 14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column', gap: 4,
        minWidth: 0,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: IOS.muted, fontSize: '0.7rem', fontWeight: 500 }}>
            <Icon size={12} color={color} />
            <span style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
            {badge && (
                <span style={{
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: 0.2,
                    background: 'rgba(0,122,255,0.1)', color: IOS.blue,
                    borderRadius: 4, padding: '1px 4px', textTransform: 'uppercase',
                }}>
                    {badge}
                </span>
            )}
        </div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color, lineHeight: 1.2, wordBreak: 'break-all' }}>
            {sign}{fmt(amount)}
        </div>
    </div>
));

export default SummaryCard;
