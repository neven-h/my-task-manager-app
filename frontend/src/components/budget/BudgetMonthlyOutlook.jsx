import React from 'react';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export const MonthlyOutlook = ({ monthlyProj }) => (
    <>
        <div style={{
            padding: '5px 16px', background: '#f0fdf4',
            fontSize: '0.68rem', fontWeight: 700, color: '#166534',
            textTransform: 'uppercase', letterSpacing: '0.4px',
            borderBottom: '1px solid #bbf7d0',
        }}>
            Monthly Outlook
        </div>
        {/* Table header */}
        <div style={{
            display: 'flex', alignItems: 'center',
            padding: '5px 16px', borderBottom: '1px solid #e5e7eb',
            fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.3px',
            background: '#f9fafb',
        }}>
            <div style={{ width: 80 }}>Month</div>
            <div style={{ width: 90, textAlign: 'right' }}>In</div>
            <div style={{ width: 90, textAlign: 'right' }}>Out</div>
            <div style={{ width: 90, textAlign: 'right' }}>Net</div>
            <div style={{ flex: 1, textAlign: 'right' }}>End Balance</div>
        </div>
        {monthlyProj.map((m, i) => {
            const netPos = m.net >= 0;
            const isLast = i === monthlyProj.length - 1;
            return (
                <div key={m.month} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '7px 16px',
                    borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                    fontSize: '0.82rem',
                    background: i % 2 === 0 ? '#fff' : '#fafafa',
                }}>
                    <div style={{ width: 80, fontWeight: 600, color: SYS.light, fontSize: '0.76rem' }}>
                        {fmtMonth(m.month)}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', color: SYS.success, fontWeight: 700 }}>
                        {m.income > 0 ? `+₪${fmt(m.income)}` : '—'}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', color: SYS.accent, fontWeight: 700 }}>
                        −₪{fmt(m.expense)}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontWeight: 800,
                        color: netPos ? SYS.success : SYS.accent }}>
                        {netPos ? '+' : '−'}₪{fmt(Math.abs(m.net))}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 700,
                        color: m.endBalance >= 0 ? SYS.primary : SYS.accent }}>
                        {m.endBalance >= 0 ? '' : '−'}₪{fmt(m.endBalance)}
                    </div>
                </div>
            );
        })}
    </>
);

export default MonthlyOutlook;
