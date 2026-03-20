import React, { useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const SYS = { border: '#000', primary: '#0000FF', accent: '#FF0000', success: '#00AA00', text: '#000', light: '#666', bg: '#fff' };

const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const fmtBal = (n) => {
    const abs = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
    return (n < 0 ? '−' : '+') + abs;
};

const BudgetMonthSidebar = ({ monthsData, monthBalances = {}, selectedMonth, onSelectMonth, onClearMonth, onClearTab, tabEntries }) => {
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmMonthClear, setConfirmMonthClear] = useState(null);

    return (
        <div style={{ background: SYS.bg, border: `2px solid ${SYS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `2px solid ${SYS.border}`, background: '#F5F5F5', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} />
                <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Months</span>
            </div>

            {/* All entries in tab */}
            <button
                type="button"
                onClick={() => onSelectMonth(null)}
                style={{
                    width: '100%', padding: '10px 14px', border: 'none', borderBottom: `1px solid #eee`,
                    background: selectedMonth === null ? SYS.primary : 'transparent',
                    color: selectedMonth === null ? '#fff' : SYS.text,
                    cursor: 'pointer', textAlign: 'left',
                    fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.3px',
                    fontFamily: 'inherit',
                }}
            >
                All entries
                <span style={{ float: 'right', fontSize: '0.72rem', opacity: 0.75 }}>
                    {tabEntries.length}
                </span>
            </button>

            {monthsData.map(([ym, d]) => {
                const isSelected = selectedMonth === ym;
                const isConfirming = confirmMonthClear === ym;

                return (
                    <div key={ym} style={{
                        borderBottom: `1px solid #eee`,
                        background: isSelected ? SYS.primary : 'transparent',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <button type="button" onClick={() => onSelectMonth(ym)}
                                style={{
                                    flex: 1, padding: '9px 14px', border: 'none', background: 'transparent',
                                    color: isSelected ? '#fff' : SYS.text,
                                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                                }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{fmtMonth(ym)}</div>
                                <div style={{ fontSize: '0.7rem', marginTop: 2, opacity: 0.8, display: 'flex', gap: 6 }}>
                                    <span style={{ color: isSelected ? '#cfc' : SYS.success }}>+{formatCurrency(d.income)}</span>
                                    <span style={{ color: isSelected ? '#fcc' : SYS.accent }}>−{formatCurrency(d.expense)}</span>
                                </div>
                                {monthBalances[ym] != null && (
                                    <div style={{ fontSize: '0.7rem', marginTop: 2, fontWeight: 700,
                                        color: isSelected ? '#fff' : (monthBalances[ym] >= 0 ? SYS.success : SYS.accent) }}>
                                        ⚖ {fmtBal(monthBalances[ym])}
                                    </div>
                                )}
                            </button>
                            <button type="button"
                                onClick={() => setConfirmMonthClear(isConfirming ? null : ym)}
                                title={`Delete all entries for ${fmtMonth(ym)}`}
                                style={{
                                    padding: '0 10px', border: 'none', background: 'transparent',
                                    borderLeft: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : '#ddd'}`,
                                    cursor: 'pointer',
                                    color: isConfirming ? SYS.accent : (isSelected ? 'rgba(255,255,255,0.7)' : '#ccc'),
                                }}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                        {isConfirming && (
                            <div style={{ padding: '6px 14px 8px', background: isSelected ? 'rgba(0,0,0,0.15)' : '#fff8f8' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isSelected ? '#fff' : SYS.light, marginBottom: 5 }}>
                                    Delete all {d.count} entries for {fmtMonth(ym)}?
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button type="button"
                                        onClick={() => { onClearMonth(ym); setConfirmMonthClear(null); }}
                                        style={{ flex: 1, padding: '4px 0', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                        Delete
                                    </button>
                                    <button type="button" onClick={() => setConfirmMonthClear(null)}
                                        style={{ padding: '4px 8px', border: `2px solid ${SYS.border}`, background: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {monthsData.length === 0 && (
                <div style={{ padding: '24px 14px', textAlign: 'center', color: SYS.light, fontSize: '0.82rem' }}>
                    No entries yet
                </div>
            )}

            {/* Clear entire tab */}
            {tabEntries.length > 0 && (
                <div style={{ padding: '10px 14px', borderTop: `2px solid ${SYS.border}`, background: '#fafafa' }}>
                    {confirmClear ? (
                        <div style={{ fontSize: '0.75rem' }}>
                            <div style={{ color: SYS.light, marginBottom: 6, fontWeight: 600 }}>
                                Delete all {tabEntries.length} entries from this tab?
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button type="button" onClick={() => { onClearTab(); setConfirmClear(false); }}
                                    style={{ flex: 1, padding: '4px 0', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                    Clear all
                                </button>
                                <button type="button" onClick={() => setConfirmClear(false)}
                                    style={{ padding: '4px 8px', border: `2px solid ${SYS.border}`, background: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirmClear(true)}
                            style={{ width: '100%', padding: '5px 0', border: `1px solid #ddd`, background: 'none', color: '#aaa', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            Clear tab…
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BudgetMonthSidebar;
