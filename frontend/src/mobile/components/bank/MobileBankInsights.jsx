import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import InsightsBody from './MobileBankInsightsBody';

const IOS = {
    card: '#fff', muted: '#8E8E93', radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const MobileBankInsights = ({ insights, onFetch, loading }) => {
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !insights) onFetch();
        setOpen(v => !v);
    };

    const data = insights;
    const maxMonthly = data?.monthly_totals?.length
        ? Math.max(...data.monthly_totals.map(m => m.total))
        : 0;

    return (
        <div style={{ margin: '16px 16px 0' }}>
            <button type="button" onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 16px',
                border: 'none', borderRadius: open ? `${IOS.radius}px ${IOS.radius}px 0 0` : IOS.radius,
                background: open ? '#0000FF' : IOS.card,
                boxShadow: open ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                fontWeight: 600, fontSize: '0.88rem',
                fontFamily: FONT_STACK, color: open ? '#fff' : '#000',
                transition: `all 0.35s ${IOS.spring}`,
            }}>
                <BarChart3 size={16} />
                {open ? 'Hide Spending Insights' : 'Spending Insights'}
            </button>

            {open && (
                <div style={{
                    background: IOS.card,
                    borderRadius: `0 0 ${IOS.radius}px ${IOS.radius}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    {loading && !data && (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Analyzing your spending…
                        </div>
                    )}
                    {!loading && !data && (
                        <div style={{ padding: 24, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Upload at least 2 months of transactions to see insights.
                        </div>
                    )}
                    {data && data.month_count > 0 && (
                        <InsightsBody data={data} maxMonthly={maxMonthly} />
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileBankInsights;
