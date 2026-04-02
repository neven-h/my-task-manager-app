import React, { useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { THEME, FONT_STACK } from '../../theme';

const VERDICT_STYLES = {
    healthy:    { bg: THEME.success, label: 'Healthy' },
    moderate:   { bg: '#d97706',     label: 'Moderate' },
    concerning: { bg: THEME.accent,  label: 'Concerning' },
};

const Section = ({ title, items, accentColor }) => {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em',
                textTransform: 'uppercase', color: accentColor,
                borderLeft: `3px solid ${accentColor}`, paddingLeft: 8,
                marginBottom: 6, fontFamily: FONT_STACK,
            }}>
                {title}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
                {items.map((item, i) => (
                    <li key={i} style={{
                        fontSize: '0.85rem', fontWeight: 500, color: '#111',
                        marginBottom: 6, lineHeight: 1.5, fontFamily: FONT_STACK,
                    }}>
                        {item}
                    </li>
                ))}
            </ol>
        </div>
    );
};

const MobileAIAdvisorPanel = ({ aiAdvisor, aiAdvisorLoading, fetchAIAdvisor, activeTabId }) => {
    const [open, setOpen] = useState(false);

    const toggle = () => {
        if (!open && !aiAdvisor) fetchAIAdvisor();
        setOpen(v => !v);
    };

    if (!activeTabId) return null;

    const data = aiAdvisor;
    const isFallback = data?.fallback === true;
    const verdict = data?.spending_verdict;
    const verdictStyle = VERDICT_STYLES[verdict] || VERDICT_STYLES.moderate;

    return (
        <div style={{ margin: '16px 16px 0', fontFamily: FONT_STACK }}>
            {/* Toggle button */}
            <button type="button" onClick={toggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '13px 16px',
                border: 'none',
                borderRadius: open ? '12px 12px 0 0' : 12,
                background: open ? THEME.primary : '#fff',
                boxShadow: open ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                fontWeight: 600, fontSize: '0.88rem',
                fontFamily: FONT_STACK, color: open ? '#fff' : THEME.text,
                cursor: 'pointer',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={16} />
                    {open ? 'Hide AI Advisor' : 'AI Financial Advisor'}
                    {!open && (
                        <span style={{
                            fontSize: '0.62rem', fontWeight: 700,
                            background: THEME.primary, color: '#fff',
                            padding: '1px 6px', borderRadius: 4,
                        }}>
                            Claude AI
                        </span>
                    )}
                </div>
                {data && !isFallback && !open && (
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        background: verdictStyle.bg, color: '#fff',
                        padding: '2px 8px', borderRadius: 10,
                    }}>
                        {verdictStyle.label}
                    </span>
                )}
            </button>

            {/* Expanded body */}
            {open && (
                <div style={{
                    background: '#fff',
                    borderRadius: '0 0 12px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    {/* Loading */}
                    {aiAdvisorLoading && (
                        <div style={{
                            padding: '24px 16px', textAlign: 'center',
                            color: THEME.primary, fontWeight: 600, fontSize: '0.85rem',
                        }}>
                            ✦ Claude is analyzing your finances…
                        </div>
                    )}

                    {/* Fallback */}
                    {!aiAdvisorLoading && isFallback && (
                        <div style={{
                            padding: '20px 16px', textAlign: 'center',
                            color: '#666', fontSize: '0.85rem', fontWeight: 500,
                        }}>
                            {data.reason || 'AI advisor temporarily unavailable.'}
                        </div>
                    )}

                    {/* No data yet */}
                    {!aiAdvisorLoading && !data && (
                        <div style={{
                            padding: '20px 16px', textAlign: 'center',
                            color: '#666', fontSize: '0.85rem',
                        }}>
                            Tap to get Claude AI insights on your spending.
                        </div>
                    )}

                    {/* AI analysis */}
                    {!aiAdvisorLoading && data && !isFallback && (
                        <div style={{ padding: '16px' }}>
                            {/* Meta + refresh */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: 12,
                            }}>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                    {data.months_analyzed} month{data.months_analyzed !== 1 ? 's' : ''} analyzed
                                    {data.avg_monthly_spend > 0 && (
                                        <> · avg ₪{Math.round(data.avg_monthly_spend).toLocaleString()}/mo</>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); fetchAIAdvisor(true); }}
                                    disabled={aiAdvisorLoading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '4px 10px', border: '1px solid #d1d5db',
                                        borderRadius: 6, background: '#fff',
                                        fontSize: '0.72rem', fontWeight: 700,
                                        color: THEME.primary, cursor: 'pointer',
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    <RefreshCw size={10} />
                                    Refresh
                                </button>
                            </div>

                            {/* Summary */}
                            {data.summary && (
                                <p style={{
                                    fontSize: '0.875rem', fontWeight: 500, color: '#111',
                                    lineHeight: 1.6, marginBottom: '1rem',
                                    paddingBottom: '0.875rem',
                                    borderBottom: '1px solid #f0f0f0',
                                }}>
                                    {data.summary}
                                </p>
                            )}

                            <Section title="Recommendations"       items={data.recommendations}       accentColor={THEME.success} />
                            <Section title="Risk Alerts"           items={data.risk_alerts}           accentColor={THEME.accent} />
                            <Section title="Savings Opportunities" items={data.savings_opportunities} accentColor={THEME.primary} />

                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 8 }}>
                                Powered by Claude AI · cached 5 min
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileAIAdvisorPanel;
