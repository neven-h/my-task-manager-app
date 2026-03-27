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

const PRESETS = [
    { key: '30d',   label: 'Last 30 Days' },
    { key: '90d',   label: 'Last 90 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'all',   label: 'All Time' },
];

const PRESET_LABELS = {
    '30d': 'Last 30 Days', '90d': 'Last 90 Days',
    'month': 'This Month', 'all': 'All Time', 'custom': 'Custom Range',
};

/**
 * "Balance as of" date range picker card (mobile/iOS).
 * Props: { cutoff, setCutoff, showDatePicker, setShowDatePicker,
 *          dateFrom, setDateFrom, datePreset, setDatePreset, applyPreset }
 */
const BudgetDatePicker = ({ cutoff, setCutoff, showDatePicker, setShowDatePicker, dateFrom, setDateFrom, datePreset, setDatePreset, applyPreset }) => (
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
                {PRESET_LABELS[datePreset] ?? 'Custom Range'}
                {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
        </button>

        {showDatePicker && (
            <div style={{ padding: '12px 16px 14px', borderTop: `0.5px solid ${IOS.separator}` }}>
                {/* Preset buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {PRESETS.map(p => (
                        <button key={p.key} type="button"
                            onClick={() => { applyPreset(p.key); setShowDatePicker(false); }}
                            style={{
                                padding: '7px 12px', borderRadius: 8,
                                border: datePreset === p.key ? 'none' : `1px solid ${IOS.separator}`,
                                background: datePreset === p.key ? IOS.blue : IOS.bg,
                                color: datePreset === p.key ? '#fff' : IOS.label,
                                fontWeight: 600, fontSize: '0.78rem',
                                cursor: 'pointer', fontFamily: FONT_STACK,
                            }}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Custom date inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</span>
                    <input type="date" value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${IOS.separator}`, fontSize: '0.88rem', fontFamily: FONT_STACK, background: IOS.bg, minWidth: 120 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</span>
                    <input type="date" value={cutoff}
                        onChange={e => { setCutoff(e.target.value); setDatePreset('custom'); }}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${IOS.separator}`, fontSize: '0.88rem', fontFamily: FONT_STACK, background: IOS.bg, minWidth: 120 }} />
                </div>
            </div>
        )}
    </div>
);

export { BudgetDatePicker };
export default BudgetDatePicker;
