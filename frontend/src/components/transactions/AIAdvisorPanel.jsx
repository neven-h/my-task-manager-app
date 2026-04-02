import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

// ── Verdict badge ─────────────────────────────────────────────────────────────
const VERDICT_STYLES = {
    healthy:    { bg: '#16a34a', label: 'Healthy' },
    moderate:   { bg: '#d97706', label: 'Moderate' },
    concerning: { bg: '#dc2626', label: 'Concerning' },
};

const VerdictBadge = ({ verdict }) => {
    const style = VERDICT_STYLES[verdict] || VERDICT_STYLES.moderate;
    return (
        <span style={{
            background: style.bg, color: '#fff',
            padding: '2px 10px', fontSize: '0.75rem',
            fontWeight: 800, borderRadius: 20,
        }}>
            {style.label}
        </span>
    );
};

// ── Section block ─────────────────────────────────────────────────────────────
const Section = ({ title, items, accentColor }) => {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.06em',
                textTransform: 'uppercase', color: accentColor,
                borderLeft: `3px solid ${accentColor}`, paddingLeft: 8,
                marginBottom: 6,
            }}>
                {title}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
                {items.map((item, i) => (
                    <li key={i} style={{
                        fontSize: '0.875rem', fontWeight: 500,
                        color: '#111', marginBottom: 4, lineHeight: 1.5,
                    }}>
                        {item}
                    </li>
                ))}
            </ol>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────
const AIAdvisorPanel = () => {
    const { aiAdvisor, aiAdvisorLoading, fetchAIAdvisor, activeTabId } = useBankTransactionContext();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !aiAdvisor) fetchAIAdvisor();
        setOpen(v => !v);
    };

    const handleRefresh = async (e) => {
        e.stopPropagation();
        await fetchAIAdvisor(true);
    };

    if (!activeTabId) return null;

    const data = aiAdvisor;
    const isFallback = data?.fallback === true;

    return (
        <div style={{
            marginBottom: '1.5rem',
            border: '2px solid #e0e0e0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: '#1e293b', color: '#fff',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px',
                }}>
                    <Brain size={18} />
                    AI Financial Advisor
                    <span style={{
                        background: 'rgba(255,255,255,0.15)',
                        padding: '2px 8px', fontSize: '0.65rem',
                        fontWeight: 700, borderRadius: 4, letterSpacing: '0.05em',
                    }}>
                        Claude AI
                    </span>
                    {data && !isFallback && (
                        <VerdictBadge verdict={data.spending_verdict} />
                    )}
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {/* Body */}
            {open && (
                <div style={{ background: '#fff' }}>
                    {/* Loading */}
                    {aiAdvisorLoading && (
                        <div style={{
                            padding: '24px 20px', textAlign: 'center',
                            fontWeight: 700, color: '#0000FF',
                        }}>
                            <span style={{ marginRight: 8 }}>✦</span>
                            Claude is analyzing your finances…
                        </div>
                    )}

                    {/* Fallback / error */}
                    {!aiAdvisorLoading && isFallback && (
                        <div style={{
                            padding: '20px', textAlign: 'center',
                            color: '#666', fontWeight: 600, fontSize: '0.875rem',
                        }}>
                            {data.reason || 'AI advisor temporarily unavailable.'}
                        </div>
                    )}

                    {/* No data yet */}
                    {!aiAdvisorLoading && !data && (
                        <div style={{
                            padding: '20px', textAlign: 'center',
                            color: '#666', fontWeight: 600, fontSize: '0.875rem',
                        }}>
                            Open this panel to get Claude AI financial insights.
                        </div>
                    )}

                    {/* AI analysis */}
                    {!aiAdvisorLoading && data && !isFallback && (
                        <>
                            {/* Sub-header: meta + refresh */}
                            <div style={{
                                padding: '10px 20px',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                            }}>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                    Based on {data.months_analyzed} month{data.months_analyzed !== 1 ? 's' : ''} of data
                                    {data.avg_monthly_spend > 0 && (
                                        <> · Avg ₪{data.avg_monthly_spend.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo</>
                                    )}
                                </span>
                                <button
                                    onClick={handleRefresh}
                                    disabled={aiAdvisorLoading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        fontSize: '0.78rem', fontWeight: 700,
                                        padding: '4px 10px',
                                        border: '1px solid #d1d5db', borderRadius: 6,
                                        background: '#fff', cursor: 'pointer', color: '#0000FF',
                                    }}
                                >
                                    <RefreshCw size={12} />
                                    Refresh
                                </button>
                            </div>

                            {/* Content */}
                            <div style={{ padding: '16px 20px' }}>
                                {/* Summary */}
                                {data.summary && (
                                    <p style={{
                                        fontSize: '0.9rem', fontWeight: 500,
                                        color: '#111', lineHeight: 1.6,
                                        marginBottom: '1.25rem',
                                        paddingBottom: '1rem',
                                        borderBottom: '1px solid #f0f0f0',
                                    }}>
                                        {data.summary}
                                    </p>
                                )}

                                <Section
                                    title="Recommendations"
                                    items={data.recommendations}
                                    accentColor="#16a34a"
                                />
                                <Section
                                    title="Risk Alerts"
                                    items={data.risk_alerts}
                                    accentColor="#dc2626"
                                />
                                <Section
                                    title="Savings Opportunities"
                                    items={data.savings_opportunities}
                                    accentColor="#0000FF"
                                />

                                <div style={{
                                    marginTop: '0.75rem',
                                    fontSize: '0.7rem', color: '#9ca3af',
                                    fontWeight: 500,
                                }}>
                                    Powered by Claude AI · Results cached for 5 minutes
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIAdvisorPanel;
