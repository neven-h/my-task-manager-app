import React from 'react';
import { AlertTriangle } from 'lucide-react';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AnomalyCard = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) return null;
    return (
        <div style={{ borderBottom: `0.5px solid ${IOS.sep}` }}>
            <div style={{
                padding: '7px 16px', background: '#fff1f2',
                fontSize: '0.68rem', fontWeight: 700, color: '#be123c',
                textTransform: 'uppercase', letterSpacing: '0.3px',
                display: 'flex', alignItems: 'center', gap: 5,
            }}>
                <AlertTriangle size={10} /> Spending spikes this month
            </div>
            {anomalies.map((a, i) => (
                <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px',
                    borderBottom: i < anomalies.length - 1 ? `0.5px solid #fecaca` : 'none',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.description}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: IOS.label, marginTop: 1 }}>
                            ₪{fmt(a.current, true)} this month vs ₪{fmt(a.avg, true)} avg
                        </div>
                    </div>
                    <div style={{
                        background: '#fef2f2', color: IOS.red,
                        padding: '2px 8px', borderRadius: 12,
                        fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, marginLeft: 8,
                    }}>
                        +{a.pct_above}%
                    </div>
                </div>
            ))}
        </div>
    );
};

export { AnomalyCard };
export default AnomalyCard;
