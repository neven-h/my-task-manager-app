import React, { useState, memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SYS = { primary: '#0000FF', success: '#00AA00', accent: '#FF0000', light: '#666' };

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export const HistoryRow = memo(({ m, isLast }) => {
    const [exp, setExp] = useState(false);
    const netPos = m.net >= 0;

    return (
        <div style={{ borderBottom: isLast ? 'none' : '1px dashed #e5e7eb' }}>
            <div onClick={() => setExp(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', cursor: 'pointer', fontSize: '0.83rem',
            }}>
                {/* Month */}
                <div style={{ width: 75, fontWeight: 700, color: SYS.light, flexShrink: 0, fontSize: '0.78rem' }}>
                    {fmtMonth(m.month)}
                </div>

                {/* Net badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                        background: netPos ? '#f0fdf4' : '#fef2f2',
                        color: netPos ? SYS.success : SYS.accent,
                        padding: '2px 7px', borderRadius: 4,
                        fontWeight: 800, fontSize: '0.76rem',
                    }}>
                        {netPos ? '+' : '−'}{fmt(m.net)}
                    </span>
                    {exp || (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 8 }}>
                            {[
                                m.budget_income > 0  && `+₪${fmt(m.budget_income)} income`,
                                m.budget_expense > 0 && `−₪${fmt(m.budget_expense)} budget`,
                                m.bank_expense > 0   && `−₪${fmt(m.bank_expense)} bank`,
                                m.bank_income > 0    && `+₪${fmt(m.bank_income)} transfers`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>

                {/* Running balance */}
                <div style={{
                    width: 100, textAlign: 'right', fontWeight: 800, flexShrink: 0,
                    color: m.running_balance >= 0 ? SYS.primary : SYS.accent, fontSize: '0.88rem',
                }}>
                    {m.running_balance >= 0 ? '' : '−'}{fmt(m.running_balance)}
                </div>

                {exp ? <ChevronUp size={12} color="#9ca3af" /> : <ChevronDown size={12} color="#9ca3af" />}
            </div>

            {/* Expanded breakdown */}
            {exp && (
                <div style={{
                    padding: '4px 16px 10px 91px', fontSize: '0.78rem',
                    display: 'flex', flexWrap: 'wrap', gap: '6px 18px', color: '#374151',
                }}>
                    {m.budget_income > 0  && <span style={{ color: SYS.success }}>Budget income: +₪{fmt(m.budget_income)}</span>}
                    {m.budget_expense > 0 && <span style={{ color: SYS.accent }}>Budget expense: −₪{fmt(m.budget_expense)}</span>}
                    {m.bank_income > 0    && <span style={{ color: SYS.success }}>Bank transfers in: +₪{fmt(m.bank_income)}</span>}
                    {m.bank_expense > 0   && <span style={{ color: SYS.accent }}>Bank expense: −₪{fmt(m.bank_expense)}</span>}
                </div>
            )}
        </div>
    );
});

export default HistoryRow;
