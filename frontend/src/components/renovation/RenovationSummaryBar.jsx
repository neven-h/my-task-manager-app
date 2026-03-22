import React from 'react';
import { SYS, fmt } from './renovationConstants';

const RenovationSummaryBar = ({ items }) => {
    const totalEstimated = items.reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
    const totalPaid = items.reduce((s, i) => s + (i.total_paid ?? 0), 0);
    const totalRemaining = items.reduce((s, i) => s + Math.max(0, (i.estimated_cost ?? 0) - (i.total_paid ?? 0)), 0);
    const totalOverage = items.reduce((s, i) => {
        if (i.estimated_cost == null) return s;
        return s + Math.max(0, (i.total_paid ?? 0) - i.estimated_cost);
    }, 0);

    return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
                { label: 'Total Estimated', value: totalEstimated, color: SYS.primary },
                { label: 'Total Paid', value: totalPaid, color: SYS.accent },
                { label: 'Remaining', value: totalRemaining, color: totalRemaining > 0 ? SYS.text : SYS.success },
            ].map(({ label, value, color }) => (
                <div key={label} style={{
                    flex: '1 1 160px', border: `3px solid ${SYS.border}`, padding: '14px 18px', background: SYS.bg,
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: SYS.light, marginBottom: 4 }}>
                        {label}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
                        ₪{fmt(value)}
                    </div>
                </div>
            ))}
            {totalOverage > 0 && (
                <div style={{
                    flex: '1 1 160px', border: '3px solid #000', padding: '14px 18px', background: SYS.accent,
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                        Over Budget
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                        ₪{fmt(totalOverage)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RenovationSummaryBar;
