import React, { useState } from 'react';
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

const fmtDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const PRESETS = [
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: 'This month', days: null },
];

/**
 * Date range picker card.
 * Props: { dateFrom, setDateFrom, dateTo, setDateTo, showDatePicker, setShowDatePicker }
 */
const BudgetDatePicker = ({ dateFrom, setDateFrom, dateTo, setDateTo, showDatePicker, setShowDatePicker }) => {
    const [customMode, setCustomMode] = useState(false);

    const applyPreset = (preset) => {
        const to = new Date().toISOString().split('T')[0];
        let from;
        if (preset.days !== null) {
            const d = new Date();
            d.setDate(d.getDate() - preset.days);
            from = d.toISOString().split('T')[0];
        } else {
            // This month
            const now = new Date();
            from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        setDateFrom(from);
        setDateTo(to);
        setCustomMode(false);
        setShowDatePicker(false);
    };

    return (
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
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: IOS.label }}>Date range</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: IOS.blue, fontWeight: 600, fontSize: '0.9rem' }}>
                    {fmtDate(dateFrom)} – {fmtDate(dateTo)}
                    {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
            </button>

            {showDatePicker && (
                <div style={{ padding: '0 16px 14px', borderTop: `0.5px solid ${IOS.separator}` }}>
                    {/* Quick presets */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {PRESETS.map(p => (
                            <button key={p.label} type="button" onClick={() => applyPreset(p)}
                                style={{
                                    flex: 1, padding: '8px 0', border: `1px solid ${IOS.separator}`,
                                    borderRadius: 10, background: IOS.bg, cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.8rem', color: IOS.blue,
                                    fontFamily: FONT_STACK,
                                }}>
                                {p.label}
                            </button>
                        ))}
                        <button type="button" onClick={() => setCustomMode(m => !m)}
                            style={{
                                flex: 1, padding: '8px 0', border: `1px solid ${customMode ? IOS.blue : IOS.separator}`,
                                borderRadius: 10, background: customMode ? '#EAF2FF' : IOS.bg, cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.8rem', color: IOS.blue,
                                fontFamily: FONT_STACK,
                            }}>
                            Custom
                        </button>
                    </div>

                    {/* Custom date inputs */}
                    {customMode && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, marginBottom: 4 }}>From</div>
                                <input type="date" value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    style={{
                                        width: '100%', padding: '9px 10px', borderRadius: 10,
                                        border: `1px solid ${IOS.separator}`, fontSize: '0.88rem',
                                        fontFamily: FONT_STACK, boxSizing: 'border-box', background: IOS.bg,
                                    }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: IOS.muted, marginBottom: 4 }}>To</div>
                                <input type="date" value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    style={{
                                        width: '100%', padding: '9px 10px', borderRadius: 10,
                                        border: `1px solid ${IOS.separator}`, fontSize: '0.88rem',
                                        fontFamily: FONT_STACK, boxSizing: 'border-box', background: IOS.bg,
                                    }} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export { BudgetDatePicker };
export default BudgetDatePicker;
