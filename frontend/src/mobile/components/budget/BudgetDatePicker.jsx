import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = {
    bg:        '#F2F2F7',
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    label:     '#3C3C43',
    radius:    16,
};

/**
 * "Balance as of" date picker card.
 * Props: { cutoff, setCutoff, showDatePicker, setShowDatePicker }
 */
const BudgetDatePicker = ({ cutoff, setCutoff, showDatePicker, setShowDatePicker }) => (
    <div style={{
        background: IOS.card, borderRadius: IOS.radius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 12, overflow: 'hidden',
    }}>
        <button type="button"
            onClick={() => setShowDatePicker(p => !p)}
            style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', fontFamily: FONT_STACK,
            }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: IOS.label }}>Balance as of</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: IOS.blue, fontWeight: 600, fontSize: '0.9rem' }}>
                {new Date(cutoff + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
        </button>
        {showDatePicker && (
            <div style={{ padding: '0 16px 14px', borderTop: `0.5px solid ${IOS.separator}` }}>
                <input type="date" value={cutoff}
                    onChange={e => { setCutoff(e.target.value); setShowDatePicker(false); }}
                    style={{
                        width: '100%', padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${IOS.separator}`, fontSize: '1rem',
                        fontFamily: FONT_STACK, boxSizing: 'border-box',
                        background: IOS.bg, marginTop: 12,
                    }} />
                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: IOS.muted, textAlign: 'center' }}>
                    Entries after this date are shown dimmed
                </p>
            </div>
        )}
    </div>
);

export { BudgetDatePicker };
export default BudgetDatePicker;
