import React from 'react';
import { Activity, Timer } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = { card: '#fff', muted: '#8E8E93', radius: 16 };

const ScoreRing = ({ score, label }) => {
    const r = 32, c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return (
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
                <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="40" cy="40" r={r} fill="none" stroke={label.color} strokeWidth="5"
                    strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                    transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 600ms ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: label.color }}>{score}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: IOS.muted, textTransform: 'uppercase' }}>{label.text}</span>
            </div>
        </div>
    );
};

const MobileBudgetHealthCard = ({ health }) => {
    if (!health) return null;
    const { score, label, rwInfo, avgMonthly, insights } = health;
    const fmt = n => Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });

    return (
        <div style={{ margin: '0 16px 12px', background: IOS.card, borderRadius: IOS.radius, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontFamily: FONT_STACK }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Activity size={18} color="#007AFF" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Financial Health</span>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <ScoreRing score={score} label={label} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ padding: '5px 10px', background: '#F2F2F7', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Timer size={12} />
                            <span style={{ color: rwInfo.color }}>{rwInfo.label}</span>
                        </div>
                        <div style={{ padding: '5px 10px', background: '#F2F2F7', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600 }}>
                            Avg ₪{fmt(avgMonthly)}/mo
                        </div>
                    </div>
                    {insights.slice(0, 2).map((text, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: '#3C3C43', lineHeight: 1.4 }}>{text}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MobileBudgetHealthCard);
