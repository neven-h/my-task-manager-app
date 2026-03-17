import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SCORE_TIERS = [
    { range: '80 – 100', label: 'Healthy',   color: '#059669', desc: 'Good runway (6+ months), spending stable.' },
    { range: '60 – 79',  label: 'Moderate',  color: '#d97706', desc: 'Runway 3–6 months. Monitor spending trends.' },
    { range: '40 – 59',  label: 'Watch Out', color: '#ea580c', desc: 'Runway under 3 months. Review fixed costs.' },
    { range: '0 – 39',   label: 'Critical',  color: '#dc2626', desc: 'Runway under 1 month. Immediate action needed.' },
];

export const ScoreInfoTooltip = () => {
    const [open, setOpen] = useState(false);
    return (
        <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <Info size={14} color="#6b7280" style={{ cursor: 'pointer', opacity: 0.75 }} />
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 100,
                    marginTop: 6, width: 290,
                    background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    padding: '12px 14px', fontSize: '0.78rem', lineHeight: 1.5,
                }}>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6b7280', marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                        How the score is calculated
                    </div>
                    {SCORE_TIERS.map(t => (
                        <div key={t.range} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, color: t.color, width: 54, flexShrink: 0, fontSize: '0.72rem' }}>{t.range}</span>
                            <span style={{ fontWeight: 700, color: t.color, width: 70, flexShrink: 0 }}>{t.label}</span>
                            <span style={{ color: '#6b7280' }}>{t.desc}</span>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8, color: '#9ca3af', fontSize: '0.72rem' }}>
                        <strong style={{ color: '#374151' }}>Factors:</strong>{' '}
                        runway length · spending momentum · anomaly count
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Health ring (simple SVG arc gauge) ───────────────────────────────────────
export const HealthRing = ({ score, label }) => {
    const R = 18, C = 2 * Math.PI * R;
    const pct = Math.max(0, Math.min(1, score / 100));
    const dash = C * pct;
    const color = label.color;
    return (
        <svg width="52" height="52" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={R} fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle cx="22" cy="22" r={R} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${C}`} strokeDashoffset={C / 4}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
            <text x="22" y="24" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>
                {score}
            </text>
        </svg>
    );
};

// ── Anomaly card ──────────────────────────────────────────────────────────────
export const AnomalyCard = ({ anomaly }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', borderBottom: '1px dashed #fecaca',
        fontSize: '0.83rem',
    }}>
        <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>{anomaly.description}</span>
            <span style={{ color: '#6b7280' }}> — ₪{fmt(anomaly.current, true)} this month</span>
        </div>
        <div style={{
            background: '#fef2f2', color: '#dc2626',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.73rem', fontWeight: 800, flexShrink: 0,
        }}>
            +{anomaly.pct_above}% vs avg
        </div>
    </div>
);

// ── Health card ───────────────────────────────────────────────────────────────
export const HealthCard = ({ score, hlLabel, rwInfo, insights, avgMonthlySpend }) => (
    <div style={{
        padding: '14px 20px',
        background: hlLabel.bg,
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
        <HealthRing score={score} label={hlLabel} />
        <div style={{ flex: 1 }}>
            <div style={{
                fontWeight: 800, fontSize: '0.9rem',
                color: hlLabel.color, marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                {hlLabel.text} — {rwInfo.emoji} {rwInfo.label} runway
                <ScoreInfoTooltip />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {insights.map((line, i) => (
                    <div key={i} style={{
                        fontSize: '0.8rem', color: '#374151',
                        fontWeight: 500, lineHeight: 1.4,
                    }}>
                        {line}
                    </div>
                ))}
            </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Avg/month
            </div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#111827' }}>
                ₪{fmt(avgMonthlySpend, true)}
            </div>
        </div>
    </div>
);
