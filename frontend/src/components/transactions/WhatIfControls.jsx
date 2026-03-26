import React from 'react';
import { Zap } from 'lucide-react';
import { WHAT_IF_OPTIONS } from '../../utils/cashflowHelpers';

const btnColor = (value) => {
    if (value < 0) return '#00AA00';
    if (value > 0) return '#FF0000';
    return '#000';
};

export const WhatIfControls = ({ adjust, setAdjust }) => (
    <div style={{
        padding: '12px 20px',
        borderTop: '2px solid #000',
        background: '#fff',
    }}>
        <div style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
        }}>
            <Zap size={11} /> What if I adjust spending?
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WHAT_IF_OPTIONS.map(opt => {
                const selected = adjust === opt.value;
                const color = btnColor(opt.value);
                return (
                    <button
                        key={opt.value}
                        onClick={() => setAdjust(opt.value)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 0,
                            border: `2px solid ${selected ? '#000' : color}`,
                            background: selected ? '#000' : '#fff',
                            color: selected ? '#fff' : color,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            fontFamily: 'inherit',
                            transition: 'none',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    </div>
);

export default WhatIfControls;
