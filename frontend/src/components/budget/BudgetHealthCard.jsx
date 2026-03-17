import React, { useState } from 'react';
import { Activity, Timer, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

const SYS = { border: '#000', light: '#666', text: '#000' };

const MomentumIcon = ({ m }) => {
    if (m === 'increasing') return <TrendingUp size={14} color="#dc2626" />;
    if (m === 'decreasing') return <TrendingDown size={14} color="#059669" />;
    return <Minus size={14} color={SYS.light} />;
};

const ScoreRing = ({ score, label }) => {
    const r = 38, c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return (
        <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            <svg viewBox="0 0 96 96" style={{ width: '100%', height: '100%' }}>
                <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle cx="48" cy="48" r={r} fill="none" stroke={label.color} strokeWidth="6"
                    strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                    transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 600ms ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: label.color }}>{score}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: SYS.light, textTransform: 'uppercase' }}>{label.text}</span>
            </div>
        </div>
    );
};

const SCORE_TIERS = [
    {
        range: '80 – 100',
        label: 'Healthy',
        color: '#059669',
        desc: 'Your balance can cover 6+ months of usual spending.',
    },
    {
        range: '60 – 79',
        label: 'Moderate',
        color: '#d97706',
        desc: 'Your balance can cover about 3–6 months.',
    },
    {
        range: '40 – 59',
        label: 'Watch Out',
        color: '#ea580c',
        desc: 'Your balance can cover less than 3 months.',
    },
    {
        range: '0 – 39',
        label: 'Critical',
        color: '#dc2626',
        desc: 'Your balance can cover less than 1 month.',
    },
];

const ScoreInfoTooltip = () => {
    const [open, setOpen] = useState(false);
    return (
        <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <Info size={15} color="#0000FF" style={{ cursor: 'pointer', opacity: 0.7 }} />
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 100,
                    marginTop: 8, width: 300,
                    background: '#fff', border: `2px solid ${SYS.border}`,
                    boxShadow: '4px 4px 0 #000', padding: '12px 14px',
                    fontSize: '0.78rem', lineHeight: 1.5,
                }}>
                    <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8, borderBottom: `1px solid #eee`, paddingBottom: 6 }}>
                        How the Financial Health Score works
                    </div>
                    {SCORE_TIERS.map(t => (
                        <div key={t.range} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, color: t.color, width: 54, flexShrink: 0, fontSize: '0.72rem' }}>{t.range}</span>
                            <span style={{ fontWeight: 700, color: t.color, width: 70, flexShrink: 0 }}>{t.label}</span>
                            <span style={{ color: SYS.light }}>{t.desc}</span>
                        </div>
                    ))}
                    <div style={{ borderTop: `1px solid #eee`, marginTop: 8, paddingTop: 8, color: SYS.light, fontSize: '0.72rem' }}>
                        <strong style={{ color: SYS.text }}>Factors:</strong>{' '}
                        cash coverage · spending trend · unusual spikes
                    </div>
                </div>
            )}
        </div>
    );
};

const BudgetHealthCard = ({ health }) => {
    if (!health) return null;
    const { score, label, momentum, avgMonthly, avgMonthlyIncome = 0, monthlyNet = 0, insights } = health;
    const fmt = n => Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
    const netColor = monthlyNet >= 0 ? '#059669' : '#dc2626';
    const netSign  = monthlyNet >= 0 ? '+' : '−';

    // Skip runway/months insights — they require an external starting balance we don't have
    const cleanInsights = insights.filter(t => !t.includes('runway') && !t.includes('months of') && !t.includes('month of'));

    return (
        <div style={{ background: '#fff', border: `2px solid ${SYS.border}`, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={18} color="#0000FF" /> Financial Health <ScoreInfoTooltip />
            </h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <ScoreRing score={score} label={label} />
                <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Three clear monthly metrics */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ padding: '7px 10px', border: `2px solid ${SYS.border}`, background: '#f0fff4', flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: '0.62rem', color: SYS.light, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>Avg monthly income</div>
                            <span style={{ color: '#059669', fontWeight: 800, fontSize: '0.9rem' }}>+₪{fmt(avgMonthlyIncome)}</span>
                        </div>
                        <div style={{ padding: '7px 10px', border: `2px solid ${SYS.border}`, background: '#fff5f5', flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: '0.62rem', color: SYS.light, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>Avg monthly expenses</div>
                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.9rem' }}>−₪{fmt(avgMonthly)}</span>
                        </div>
                        <div style={{ padding: '7px 10px', border: `2px solid ${SYS.border}`, background: monthlyNet >= 0 ? '#f0fff4' : '#fff5f5', flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: '0.62rem', color: SYS.light, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>Monthly net</div>
                            <span style={{ color: netColor, fontWeight: 800, fontSize: '0.9rem' }}>{netSign}₪{fmt(monthlyNet)}</span>
                            <span style={{ fontSize: '0.68rem', color: SYS.light, marginLeft: 5 }}>{monthlyNet >= 0 ? 'surplus' : 'deficit'}</span>
                        </div>
                    </div>
                    {/* Spending trend */}
                    <div style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, background: '#f8f8f8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MomentumIcon m={momentum} />
                        <span>
                            <strong>Spending trend: </strong>
                            {momentum === 'increasing' && <span style={{ color: '#dc2626' }}>↑ Increasing — expenses are rising month over month</span>}
                            {momentum === 'decreasing' && <span style={{ color: '#059669' }}>↓ Decreasing — expenses are falling month over month</span>}
                            {momentum === 'stable'     && <span style={{ color: SYS.light }}>→ Stable — expenses are consistent month over month</span>}
                        </span>
                    </div>
                    {cleanInsights.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {cleanInsights.map((text, i) => (
                                <div key={i} style={{ fontSize: '0.82rem', color: SYS.text, lineHeight: 1.45 }}>{text}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(BudgetHealthCard);
