import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

const HistoryRow = memo(({ m, isLast }) => {
    const [exp, setExp] = useState(false);
    const netPos = m.net >= 0;

    return (
        <div style={{ borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}` }}>
            <div onClick={() => setExp(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', cursor: 'pointer',
            }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: IOS.muted, width: 64, flexShrink: 0 }}>
                    {fmtMonth(m.month)}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{
                        background: netPos ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.08)',
                        color: netPos ? IOS.green : IOS.red,
                        padding: '2px 8px', borderRadius: 20,
                        fontWeight: 700, fontSize: '0.78rem', flexShrink: 0,
                    }}>
                        {netPos ? '+' : '−'}₪{fmt(m.net)}
                    </span>
                    {!exp && (
                        <span style={{ fontSize: '0.68rem', color: IOS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[
                                m.budget_income > 0 && `in ₪${fmt(m.budget_income)}`,
                                m.bank_expense > 0  && `bank −₪${fmt(m.bank_expense)}`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>
                <div style={{
                    fontSize: '0.88rem', fontWeight: 800, flexShrink: 0,
                    color: m.running_balance >= 0 ? IOS.blue : IOS.red,
                }}>
                    {m.running_balance >= 0 ? '' : '−'}₪{fmt(m.running_balance)}
                </div>
                {exp ? <ChevronUp size={13} color={IOS.muted} /> : <ChevronDown size={13} color={IOS.muted} />}
            </div>
            {exp && (
                <div style={{
                    padding: '2px 16px 10px 80px',
                    display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
                    fontSize: '0.74rem',
                }}>
                    {m.budget_income > 0  && <span style={{ color: IOS.green }}>Budget income +₪{fmt(m.budget_income)}</span>}
                    {m.budget_expense > 0 && <span style={{ color: IOS.red }}>Budget exp −₪{fmt(m.budget_expense)}</span>}
                    {m.bank_income > 0    && <span style={{ color: IOS.green }}>Transfers in +₪{fmt(m.bank_income)}</span>}
                    {m.bank_expense > 0   && <span style={{ color: IOS.red }}>Bank exp −₪{fmt(m.bank_expense)}</span>}
                </div>
            )}
        </div>
    );
});

export { HistoryRow };
export default HistoryRow;
