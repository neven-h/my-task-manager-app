import React from 'react';
import BudgetDateRangePicker from './BudgetDateRangePicker';

const SYS = {
    primary: '#0000FF',
    success: '#00AA00',
    accent: '#FF0000',
    light: '#666',
    border: '#000',
};

const PRESET_LABELS = {
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'month': 'This Month',
    'all': 'All Time',
    'custom': 'Custom Range',
};

const BudgetRangePanel = ({
    rangeOpen,
    rangeLoading,
    rangeResult,
    cutoff,
    setCutoff,
    activeTabId,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    fetchRange,
    endMinusDays,
    setRangeResult,
    setRangeOpen,
    dateFrom,
    setDateFrom,
    datePreset,
    setDatePreset,
    applyPreset,
}) => {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light }}>Balance as of</span>
                <button
                    type="button"
                    onClick={() => setRangeOpen(o => !o)}
                    style={{
                        padding: '7px 14px',
                        border: `2px solid ${SYS.border}`,
                        background: rangeOpen ? '#f5f5f5' : '#fff',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                    }}
                >
                    {PRESET_LABELS[datePreset] ?? 'Custom Range'} {rangeOpen ? '▲' : '▼'}
                </button>
            </div>

            {rangeOpen && (
                <div style={{
                    border: '2px solid #000',
                    background: '#fafafa',
                    padding: 16,
                    marginBottom: 24,
                }}>
                    <BudgetDateRangePicker
                        dateFrom={dateFrom}
                        setDateFrom={setDateFrom}
                        dateTo={cutoff}
                        setDateTo={setCutoff}
                        datePreset={datePreset}
                        setDatePreset={setDatePreset}
                        applyPreset={applyPreset}
                    />

                    <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: '0.75rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Balance Details — Range ending: {cutoff || '—'}
                            </span>
                            {!activeTabId && (
                                <span style={{ fontSize: '0.75rem', color: SYS.accent, fontWeight: 600 }}>
                                    (Select a tab first)
                                </span>
                            )}
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 7), end: cutoff })}
                                disabled={!activeTabId || !cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!activeTabId || !cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: (!activeTabId || !cutoff || rangeLoading) ? 0.5 : 1 }}>
                                7 days
                            </button>
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 30), end: cutoff })}
                                disabled={!activeTabId || !cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!activeTabId || !cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: (!activeTabId || !cutoff || rangeLoading) ? 0.5 : 1 }}>
                                30 days
                            </button>
                            <button type="button"
                                onClick={() => fetchRange({ start: endMinusDays(cutoff, 90), end: cutoff })}
                                disabled={!activeTabId || !cutoff || rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: (!activeTabId || !cutoff || rangeLoading) ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: (!activeTabId || !cutoff || rangeLoading) ? 0.5 : 1 }}>
                                90 days
                            </button>
                            <button type="button"
                                onClick={() => { setRangeResult(null); setCustomStart(''); setCustomEnd(''); }}
                                disabled={rangeLoading}
                                style={{ padding: '7px 12px', border: `2px solid ${SYS.border}`, background: '#fff', cursor: rangeLoading ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                                Reset
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Custom:
                                </span>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                    style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                                <span style={{ fontSize: '0.8rem', color: SYS.light, fontWeight: 700 }}>→</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                    style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }} />
                            </div>
                            <button type="button"
                                onClick={() => fetchRange({ start: customStart, end: customEnd || cutoff })}
                                disabled={!activeTabId || !customStart || rangeLoading || !cutoff}
                                style={{ padding: '7px 14px', border: `2px solid ${SYS.border}`, background: SYS.primary, color: '#fff', cursor: (!activeTabId || !customStart || rangeLoading || !cutoff) ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: (!activeTabId || !customStart || rangeLoading || !cutoff) ? 0.5 : 1 }}>
                                Apply
                            </button>
                        </div>

                        {rangeLoading && (
                            <div style={{ padding: 12, color: SYS.light, fontWeight: 700 }}>
                                Loading…
                            </div>
                        )}

                        {rangeResult && !rangeLoading && (
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {rangeResult.error ? (
                                    <div style={{ color: '#CC0000', fontWeight: 800 }}>{rangeResult.error}</div>
                                ) : (
                                    <>
                                        <div style={{ flex: '1 1 200px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px' }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Income</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: SYS.success }}>
                                                +₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.income_total || 0))}
                                            </div>
                                        </div>
                                        <div style={{ flex: '1 1 200px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px' }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Expenses</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: SYS.accent }}>
                                                −₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.expense_total || 0))}
                                            </div>
                                        </div>
                                        <div style={{ flex: '1 1 240px', background: '#fff', border: `2px solid ${SYS.border}`, padding: '12px 14px' }}>
                                            <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Balance as of {rangeResult.end_date}
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: (rangeResult.balance_as_of ?? 0) >= 0 ? SYS.primary : SYS.accent }}>
                                                {(rangeResult.balance_as_of ?? 0) >= 0 ? '+' : '−'}₪{new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(rangeResult.balance_as_of || 0))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default BudgetRangePanel;
