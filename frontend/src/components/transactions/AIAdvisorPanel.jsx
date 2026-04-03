import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, RefreshCw, TrendingUp, AlertTriangle, PiggyBank } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const VERDICT = {
    healthy:    { bg: '#16a34a', label: 'Healthy' },
    moderate:   { bg: '#d97706', label: 'Moderate' },
    concerning: { bg: '#dc2626', label: 'Concerning' },
};

const SECTIONS = [
    { key: 'recommendations',      label: 'Recommendations', Icon: TrendingUp,    color: '#16a34a', bg: '#f0fdf4' },
    { key: 'risk_alerts',          label: 'Risk Alerts',     Icon: AlertTriangle,  color: '#dc2626', bg: '#fef2f2' },
    { key: 'savings_opportunities',label: 'Savings',         Icon: PiggyBank,      color: '#0000FF', bg: '#eff6ff' },
];

const Card = ({ label, Icon, color, bg, items }) => {
    if (!items?.length) return null;
    return (
        <div style={{
            flex: '1 1 0', minWidth: 0,
            border: `2px solid ${color}`, background: bg,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', background: color,
            }}>
                <Icon size={13} color="#fff" />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    {label}
                </span>
            </div>
            <ul style={{ margin: 0, padding: '8px 12px', listStyle: 'none' }}>
                {items.map((item, i) => (
                    <li key={i} style={{
                        fontSize: '0.8rem', fontWeight: 600, color: '#111',
                        padding: '4px 0',
                        borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                        lineHeight: 1.35,
                    }}>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AIAdvisorPanel = () => {
    const { aiAdvisor, aiAdvisorLoading, fetchAIAdvisor, activeTabId } = useBankTransactionContext();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !aiAdvisor) fetchAIAdvisor();
        setOpen(v => !v);
    };

    if (!activeTabId) return null;

    const data = aiAdvisor;
    const isFallback = data?.fallback === true;
    const verdict = VERDICT[data?.spending_verdict] || VERDICT.moderate;

    return (
        <div style={{ marginBottom: '1.5rem', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>
            {/* Header */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', background: '#000', color: '#fff',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '0.92rem' }}>
                    <Brain size={16} />
                    AI Financial Advisor
                    <span style={{
                        padding: '1px 7px', fontSize: '0.62rem', fontWeight: 700,
                        border: '1px solid rgba(255,255,255,0.35)', letterSpacing: '0.05em',
                    }}>Claude AI</span>
                    {data && !isFallback && (
                        <span style={{ background: verdict.bg, color: '#fff', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {verdict.label}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {open && (
                        <button
                            onClick={(e) => { e.stopPropagation(); fetchAIAdvisor(true); }}
                            disabled={aiAdvisorLoading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', border: '1px solid rgba(255,255,255,0.4)',
                                background: 'transparent', color: '#fff', cursor: 'pointer',
                                fontSize: '0.7rem', fontWeight: 700,
                            }}
                        >
                            <RefreshCw size={11} /> Refresh
                        </button>
                    )}
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {open && (
                <div style={{ background: '#fff' }}>
                    {/* Loading */}
                    {aiAdvisorLoading && (
                        <div style={{ padding: '18px', textAlign: 'center', fontWeight: 700, color: '#0000FF', fontSize: '0.85rem' }}>
                            ✦ Analyzing…
                        </div>
                    )}

                    {/* Fallback */}
                    {!aiAdvisorLoading && isFallback && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                            {data.reason || 'AI advisor temporarily unavailable.'}
                        </div>
                    )}

                    {/* Empty */}
                    {!aiAdvisorLoading && !data && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                            Open to get AI insights on your spending.
                        </div>
                    )}

                    {/* Analysis */}
                    {!aiAdvisorLoading && data && !isFallback && (
                        <>
                            {/* Summary bar */}
                            <div style={{
                                padding: '10px 16px',
                                borderBottom: '2px solid #000',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                background: '#fafafa',
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111', fontStyle: 'italic' }}>
                                    "{data.summary}"
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    {data.months_analyzed}mo · ₪{Math.round(data.avg_monthly_spend).toLocaleString()}/mo avg
                                </span>
                            </div>

                            {/* 3-column cards */}
                            <div style={{ display: 'flex', gap: 0, borderTop: 'none' }}>
                                {SECTIONS.map(({ key, label, Icon, color, bg }) => (
                                    <Card key={key} label={label} Icon={Icon} color={color} bg={bg} items={data[key]} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIAdvisorPanel;
