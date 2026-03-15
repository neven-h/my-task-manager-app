import React from 'react';
import { Zap } from 'lucide-react';
import { WHAT_IF_OPTIONS } from '../../utils/cashflowHelpers';

export const WhatIfControls = ({ adjust, setAdjust }) => (
    <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
    }}>
        <div style={{
            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
        }}>
            <Zap size={11} /> What if I adjust spending?
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WHAT_IF_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setAdjust(opt.value)} style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: `1.5px solid ${adjust === opt.value ? '#0d9488' : '#d1d5db'}`,
                    background: adjust === opt.value ? '#0d9488' : '#fff',
                    color: adjust === opt.value ? '#fff' : opt.value < 0 ? '#16a34a' : opt.value > 0 ? '#dc2626' : '#374151',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}>
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

export default WhatIfControls;
