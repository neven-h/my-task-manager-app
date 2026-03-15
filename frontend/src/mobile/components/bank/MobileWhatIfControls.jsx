import React from 'react';
import { Zap } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import { WHAT_IF_OPTIONS } from '../../../utils/cashflowHelpers';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MobileWhatIfControls = ({ adjust, setAdjust, baseEndBal, adjEndBal, adjMonthly }) => (
    <div style={{
        padding: '10px 16px',
        background: '#f9f9f9',
        borderTop: `0.5px solid ${IOS.sep}`,
    }}>
        <div style={{
            fontSize: '0.67rem', color: IOS.label, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
        }}>
            <Zap size={10} /> What if I adjust spending?
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WHAT_IF_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setAdjust(opt.value)} style={{
                    padding: '5px 10px', borderRadius: 20,
                    border: `1.5px solid ${adjust === opt.value ? IOS.teal : IOS.sep}`,
                    background: adjust === opt.value ? IOS.teal : '#fff',
                    color: adjust === opt.value ? '#fff' : opt.value < 0 ? IOS.green : opt.value > 0 ? IOS.red : '#374151',
                    fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: FONT_STACK, transition: 'all 0.15s ease',
                }}>
                    {opt.label}
                </button>
            ))}
        </div>
        {adjust !== 0 && baseEndBal != null && adjEndBal != null && (
            <div style={{
                marginTop: 8, fontSize: '0.77rem', fontWeight: 600,
                color: (adjEndBal - baseEndBal) > 0 ? IOS.green : IOS.red,
            }}>
                {(adjEndBal - baseEndBal) > 0 ? '+' : ''}
                ₪{fmt(adjEndBal - baseEndBal)} vs baseline in {adjMonthly.length} months
            </div>
        )}
    </div>
);

export { MobileWhatIfControls };
export default MobileWhatIfControls;
