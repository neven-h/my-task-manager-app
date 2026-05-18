import React from 'react';

const SYS = {
    primary: '#0000FF',
    success: '#00AA00',
    accent: '#FF0000',
    muted: '#666',
    border: '#e5e7eb',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(Number(n) || 0));

const fmtMonth = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Per-saved-month summary table — primary view on the Budget page.
 *
 * Each row shows: Month | In | Fixed Out | Variable Out | Net | End Balance.
 * Numbers come from `/api/budget/monthly-summary`, which already merges
 * budget entries with linked bank transactions using the SAME date window
 * the rest of the page is filtering by (so totals match the linked
 * Bank Transactions tab — no all-time leakage).
 *
 * Click a row to drill into that month (parent uses `onMonthClick` to set
 * the selected month and scope summary cards / entry list).
 */
const BudgetMonthlySummaryTable = ({
    months = [],
    loading = false,
    error = null,
    selectedMonth = null,
    onMonthClick = null,
}) => {
    return (
        <div
            style={{
                border: '2px solid #000',
                background: '#fff',
                borderRadius: 8,
                marginBottom: 16,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '8px 16px',
                    background: '#eff6ff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#1d4ed8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `1px solid ${SYS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <span>Monthly Summary</span>
                {loading && <span style={{ color: SYS.muted, fontWeight: 600 }}>Loading…</span>}
                {error && (
                    <span style={{ color: SYS.accent, fontWeight: 600 }}>{error}</span>
                )}
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 16px',
                    borderBottom: `1px solid ${SYS.border}`,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    background: '#f9fafb',
                }}
            >
                <div style={{ width: 90 }}>Month</div>
                <div style={{ width: 100, textAlign: 'right' }}>In</div>
                <div style={{ width: 110, textAlign: 'right' }}>Fixed Out</div>
                <div style={{ width: 110, textAlign: 'right' }}>Variable Out</div>
                <div style={{ width: 100, textAlign: 'right' }}>Net</div>
                <div style={{ flex: 1, textAlign: 'right' }}>End Balance</div>
            </div>

            {months.length === 0 && !loading && (
                <div
                    style={{
                        padding: '14px 16px',
                        color: SYS.muted,
                        fontSize: '0.85rem',
                        textAlign: 'center',
                    }}
                >
                    No data for the selected range.
                </div>
            )}

            {months.map((m, i) => {
                const isSelected = selectedMonth === m.month;
                const netPos = (m.net ?? 0) >= 0;
                const endBal = m.end_balance;
                const clickable = typeof onMonthClick === 'function';
                return (
                    <div
                        key={m.month}
                        onClick={clickable ? () => onMonthClick(m.month) : undefined}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onKeyDown={
                            clickable
                                ? (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          onMonthClick(m.month);
                                      }
                                  }
                                : undefined
                        }
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 16px',
                            borderBottom:
                                i === months.length - 1 ? 'none' : `1px solid #f3f4f6`,
                            fontSize: '0.85rem',
                            background: isSelected
                                ? '#dbeafe'
                                : i % 2 === 0
                                ? '#fff'
                                : '#fafafa',
                            cursor: clickable ? 'pointer' : 'default',
                        }}
                    >
                        <div
                            style={{
                                width: 90,
                                fontWeight: 700,
                                color: '#111',
                                fontSize: '0.78rem',
                            }}
                        >
                            {fmtMonth(m.month)}
                        </div>
                        <div
                            style={{
                                width: 100,
                                textAlign: 'right',
                                color: SYS.success,
                                fontWeight: 700,
                            }}
                        >
                            {(m.income ?? 0) > 0 ? `+₪${fmt(m.income)}` : '—'}
                        </div>
                        <div
                            style={{
                                width: 110,
                                textAlign: 'right',
                                color: '#d97706',
                                fontWeight: 700,
                            }}
                            title="הוראות קבע + recurring transfers marked as fixed"
                        >
                            {(m.fixed_expense ?? 0) > 0 ? `−₪${fmt(m.fixed_expense)}` : '—'}
                        </div>
                        <div
                            style={{
                                width: 110,
                                textAlign: 'right',
                                color: SYS.accent,
                                fontWeight: 700,
                            }}
                        >
                            {(m.variable_expense ?? 0) > 0
                                ? `−₪${fmt(m.variable_expense)}`
                                : '—'}
                        </div>
                        <div
                            style={{
                                width: 100,
                                textAlign: 'right',
                                fontWeight: 800,
                                color: netPos ? SYS.success : SYS.accent,
                            }}
                        >
                            {netPos ? '+' : '−'}₪{fmt(Math.abs(m.net ?? 0))}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                textAlign: 'right',
                                fontWeight: 700,
                                color:
                                    endBal == null
                                        ? SYS.muted
                                        : endBal >= 0
                                        ? SYS.primary
                                        : SYS.accent,
                            }}
                        >
                            {endBal == null
                                ? '—'
                                : `${endBal >= 0 ? '' : '−'}₪${fmt(endBal)}`}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BudgetMonthlySummaryTable;
