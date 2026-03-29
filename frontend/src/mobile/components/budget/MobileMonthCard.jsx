import React, { memo } from 'react';

const IOS = {
    bg: '#F2F2F7', card: '#fff', separator: 'rgba(0,0,0,0.08)',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', muted: '#8E8E93',
    radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0.00';
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
};

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const MonthCard = memo(({ m }) => {
    const netPos = m.net >= 0;
    return (
        <div style={{
            flexShrink: 0, width: 118,
            borderRadius: 12,
            border: `1px solid ${netPos ? '#bbf7d0' : '#fecaca'}`,
            overflow: 'hidden',
        }}>
            <div style={{
                background: netPos ? '#f0fdf4' : '#fef2f2',
                padding: '6px 10px',
                fontSize: '0.68rem', fontWeight: 700,
                color: netPos ? '#166534' : '#991b1b',
                textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
                {fmtMonth(m.month)}
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {m.income > 0 && (
                    <div style={{ fontSize: '0.72rem', color: IOS.green, fontWeight: 500 }}>
                        +₪{fmt(m.income)}
                    </div>
                )}
                <div style={{ fontSize: '0.72rem', color: IOS.red, fontWeight: 500 }}>
                    −₪{fmt(m.expense)}
                </div>
                <div style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: netPos ? IOS.green : IOS.red,
                    borderTop: `0.5px solid ${IOS.separator}`,
                    marginTop: 2, paddingTop: 4,
                }}>
                    {netPos ? '+' : '−'}₪{fmt(Math.abs(m.net))}
                </div>
                <div style={{ fontSize: '0.7rem', color: IOS.blue, fontWeight: 600 }}>
                    ₪{m.endBalance >= 0 ? '' : '−'}{fmt(m.endBalance)}
                </div>
            </div>
        </div>
    );
});

export { MonthCard };
export default MonthCard;
