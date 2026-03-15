import React from 'react';

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export const ProjectionTable = ({ adjMonthly, adjust, baseEndBal, adjEndBal }) => (
    <div style={{ borderTop: '1px solid #e5e7eb' }}>
        <div style={{
            padding: '8px 16px', background: '#f9fafb',
            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.4px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
            <span>Projected balance</span>
            {adjust !== 0 && baseEndBal != null && adjEndBal != null && (
                <span style={{
                    fontSize: '0.73rem', fontWeight: 700,
                    color: (adjEndBal - baseEndBal) > 0 ? '#16a34a' : '#dc2626',
                }}>
                    {(adjEndBal - baseEndBal) > 0 ? '+' : ''}
                    ₪{fmt(adjEndBal - baseEndBal)} vs baseline
                </span>
            )}
        </div>
        {adjMonthly.map((row, i) => (
            <div key={row.month} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 16px',
                borderBottom: i < adjMonthly.length - 1 ? '1px dashed #e5e7eb' : 'none',
                fontSize: '0.84rem',
            }}>
                <div style={{ width: 68, fontWeight: 700, color: '#555', flexShrink: 0 }}>
                    {fmtM(row.month)}
                </div>
                <div style={{ flex: 1, color: '#6b7280', fontSize: '0.78rem' }}>
                    −₪{fmt(row.total, true)} spending
                </div>
                <div style={{
                    fontWeight: 900, fontSize: '0.95rem',
                    color: row.balance >= 0 ? '#059669' : '#dc2626',
                }}>
                    {row.balance < 0 ? '−' : ''}₪{fmt(row.balance, true)}
                </div>
            </div>
        ))}
    </div>
);

export default ProjectionTable;
