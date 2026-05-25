import React, { useEffect, useState } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

/**
 * Drill-down panel: when a budget tab is linked to a bank tab AND the user
 * has selected a specific month from the Monthly Summary table, this shows
 * the raw bank transactions that fed that month's bank-side totals.
 *
 * Closes the loop on filter-sync-rules — totals up top are derived from
 * exactly this list (minus excluded rows, which are visually faded but
 * still listed so the user can verify their exclusion choices).
 */
const SYS = {
    border: '#000',
    light: '#666',
    success: '#00AA00',
    accent: '#FF0000',
};

const fmtAmount = (n) =>
    new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(Number(n) || 0));

const BudgetMonthDrilldown = ({ linkedTab, selectedMonth }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const txTabId = linkedTab?.transaction_tab_id;

    useEffect(() => {
        if (!selectedMonth || !txTabId) {
            setRows([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ tab_id: String(txTabId) });
        fetch(`${API_BASE}/transactions/${selectedMonth}?${params}`, { headers: getAuthHeaders() })
            .then(async (r) => {
                const body = await r.json().catch(() => null);
                if (!r.ok) throw new Error(body?.error || 'Failed to load bank transactions');
                return Array.isArray(body) ? body : [];
            })
            .then((data) => { if (!cancelled) setRows(data); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [selectedMonth, txTabId]);

    if (!selectedMonth || !txTabId) return null;

    const tabLabel = linkedTab?.transaction_tab_name || 'linked bank tab';
    const includedRows = rows.filter((r) => !r.is_excluded);
    const includedTotal = includedRows.reduce((s, r) => {
        const amt = r.amount_plain != null ? Number(r.amount_plain) : Number(r.amount) || 0;
        return s + amt;
    }, 0);

    return (
        <div style={{
            marginTop: 16,
            border: `2px solid ${SYS.border}`,
            background: '#fff',
            borderRadius: 8,
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '8px 14px',
                background: '#eff6ff',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#1d4ed8',
                borderBottom: `1px solid ${SYS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span>Bank transactions · {tabLabel} · {selectedMonth}</span>
                <span style={{ color: SYS.light, fontWeight: 600 }}>
                    {loading ? 'Loading…' : `${includedRows.length} of ${rows.length} count toward totals`}
                </span>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', color: SYS.accent, fontSize: '0.85rem' }}>{error}</div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div style={{ padding: '14px', color: SYS.light, fontSize: '0.88rem', textAlign: 'center' }}>
                    No bank transactions for this month.
                </div>
            )}

            {rows.map((r) => {
                const amt = r.amount_plain != null ? Number(r.amount_plain) : Number(r.amount) || 0;
                const isExpense = amt < 0;
                return (
                    <div key={r.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '7px 14px',
                        borderBottom: `1px solid #f3f4f6`,
                        fontSize: '0.85rem',
                        opacity: r.is_excluded ? 0.4 : 1,
                    }}>
                        <div style={{ width: 84, color: SYS.light, fontSize: '0.76rem', fontWeight: 600 }}>
                            {new Date(r.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description}
                            {r.is_fixed && (
                                <span style={{ marginLeft: 6, color: '#d97706', fontSize: '0.7rem', fontWeight: 700 }}>
                                    FIXED
                                </span>
                            )}
                            {r.is_excluded && (
                                <span style={{ marginLeft: 6, color: SYS.light, fontSize: '0.7rem', fontWeight: 700 }}>
                                    EXCLUDED
                                </span>
                            )}
                        </div>
                        <div style={{
                            fontWeight: 700,
                            color: isExpense ? SYS.accent : SYS.success,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {isExpense ? '−' : '+'}₪{fmtAmount(amt)}
                        </div>
                    </div>
                );
            })}

            {rows.length > 0 && !loading && (
                <div style={{
                    padding: '8px 14px',
                    background: '#f9fafb',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: SYS.light,
                    borderTop: `1px solid ${SYS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    <span>Net (included only)</span>
                    <span style={{
                        color: includedTotal >= 0 ? SYS.success : SYS.accent,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {includedTotal >= 0 ? '+' : '−'}₪{fmtAmount(includedTotal)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default BudgetMonthDrilldown;
