import React from 'react';
import { Activity, Timer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

const BudgetHealthCard = ({ health }) => {
    if (!health) return null;
    const { score, label, rwInfo, momentum, avgMonthly, insights } = health;
    const fmt = n => Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });

    return (
        <div style={{ background: '#fff', border: `2px solid ${SYS.border}`, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={18} color="#0000FF" /> Financial Health
            </h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <ScoreRing score={score} label={label} />
                <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, background: '#f8f8f8', fontSize: '0.82rem' }}>
                            <Timer size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                            <strong>Runway:</strong>{' '}
                            <span style={{ color: rwInfo.color, fontWeight: 700 }}>{rwInfo.label}</span>
                        </div>
                        <div style={{ padding: '6px 10px', border: `2px solid ${SYS.border}`, background: '#f8f8f8', fontSize: '0.82rem' }}>
                            <MomentumIcon m={momentum} />{' '}
                            <strong>Avg/mo:</strong> ₪{fmt(avgMonthly)}
                        </div>
                    </div>
                    {insights.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {insights.map((text, i) => (
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
