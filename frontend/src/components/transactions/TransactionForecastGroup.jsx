import React from 'react';
import { GROUP_META } from '../../utils/forecastHelpers';
import PredRow from './TransactionForecastRow';

const GroupSection = ({ groupKey, items, onDismiss, onRestore }) => {
    if (items.length === 0) return null;
    const meta = GROUP_META[groupKey];
    return (
        <div>
            <div style={{ padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: meta.color }}>
                <span>{meta.icon}</span> {meta.label}
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#9ca3af' }}>{items.length}</span>
            </div>
            {items.map(p => (
                <PredRow key={p._idx} p={p} onDismiss={() => onDismiss(p._idx)} onRestore={() => onRestore(p._idx)} />
            ))}
        </div>
    );
};

export default GroupSection;
