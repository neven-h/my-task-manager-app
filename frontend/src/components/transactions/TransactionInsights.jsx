import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import InsightsDataPanel from './InsightsDataPanel';

// ── Main component ───────────────────────────────────────────────────────────
const TransactionInsights = () => {
    const { spendingInsights, insightsLoading, fetchSpendingInsights, activeTabId } = useBankTransactionContext();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !spendingInsights) fetchSpendingInsights();
        setOpen(v => !v);
    };

    const data = spendingInsights;
    const maxMonthly = data?.monthly_totals?.length
        ? Math.max(...data.monthly_totals.map(m => m.total))
        : 0;

    if (!activeTabId) return null;

    return (
        <div style={{
            marginBottom: '1.5rem', border: '2px solid #e0e0e0',
            borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: '#64748b', color: '#fff',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px',
                }}>
                    <BarChart3 size={18} />
                    Spending Insights
                    {data?.top_categories?.length > 0 && (
                        <span style={{
                            background: 'rgba(255,255,255,0.25)',
                            padding: '2px 10px', fontSize: '0.75rem',
                            fontWeight: 800, borderRadius: 20,
                        }}>
                            {data.top_categories.length} categories
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {insightsLoading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>
                            Analyzing your spending…
                        </div>
                    )}
                    {!insightsLoading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontWeight: 600 }}>
                            Upload at least 2 months of transactions to see spending insights.
                        </div>
                    )}
                    {data && data.month_count > 0 && (
                        <InsightsDataPanel
                            data={data}
                            maxMonthly={maxMonthly}
                            fetchSpendingInsights={fetchSpendingInsights}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionInsights;
