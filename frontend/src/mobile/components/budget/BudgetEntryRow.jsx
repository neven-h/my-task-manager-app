import React, { memo, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const IOS = {
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    green:     '#34C759',
    red:       '#FF3B30',
    muted:     '#8E8E93',
    bg:        '#F2F2F7',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

// Stable empty array to avoid creating new [] reference on every render
export const EMPTY_HISTORY = [];

export const EntryRow = memo(({ entry, cutoff, onEdit, onDelete, isLast, isExpanded, onToggleExpand, history, selectMode, isSelected, onToggleSelect }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pressed, setPressed] = useState(false);
    const isPast = entry.entry_date <= cutoff;
    const isIncome = entry.type === 'income';
    const dotColor = isIncome ? IOS.green : IOS.red;
    const sign = isIncome ? '+' : '−';

    return (
        <>
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    borderBottom: (isLast && !isExpanded) ? 'none' : `0.5px solid ${IOS.separator}`,
                    opacity: isPast ? 1 : 0.42,
                    background: pressed ? '#F2F2F7' : IOS.card,
                    transition: `opacity 200ms, background 120ms`,
                }}
                onTouchStart={() => setPressed(true)}
                onTouchEnd={() => setPressed(false)}
            >
                {/* Select checkbox */}
                {selectMode && (
                    <div onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.id); }}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? '#007AFF' : 'rgba(0,0,0,0.2)'}`,
                            background: isSelected ? '#007AFF' : '#fff', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                        {isSelected && '✓'}
                    </div>
                )}
                {/* Type dot */}
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

                {/* Date */}
                <div style={{ fontSize: '0.78rem', color: IOS.muted, width: 80, flexShrink: 0, lineHeight: 1.3 }}>
                    {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                {/* Description + meta (clickable to expand) */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onToggleExpand(entry.id)}>
                    <div style={{
                        fontWeight: 500, fontSize: '0.9rem',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        borderBottom: '1px dashed #bbb', display: 'inline',
                        paddingBottom: 1,
                    }}>
                        {entry.description}
                    </div>
                    {(entry.category || entry.notes) && (
                        <div style={{ fontSize: '0.72rem', color: IOS.muted, marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {[entry.category, entry.notes].filter(Boolean).join(' · ')}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: dotColor, flexShrink: 0, marginRight: 4 }}>
                    {sign}{fmt(entry.amount)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {confirmDelete ? (
                        <>
                            <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                                style={{ padding: '4px 10px', border: 'none', borderRadius: 7, background: IOS.red, color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                Delete?
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(false)}
                                style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 7, background: '#fff', fontSize: '0.72rem', cursor: 'pointer' }}>
                                ✕
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => onEdit(entry)}
                                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Expanded history */}
            {isExpanded && history.length > 0 && (
                <div style={{
                    background: IOS.bg,
                    borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                    padding: '4px 16px 8px 36px',
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: IOS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        Recent with same description
                    </div>
                    {history.map(h => (
                        <div key={h.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '5px 0',
                            fontSize: '0.78rem', color: IOS.muted,
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.type === 'income' ? IOS.green : IOS.red, flexShrink: 0 }} />
                            <div style={{ width: 75, flexShrink: 0, fontWeight: 600 }}>
                                {new Date(h.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {h.description}
                            </div>
                            <div style={{ fontWeight: 600, color: h.type === 'income' ? IOS.green : IOS.red, flexShrink: 0 }}>
                                {h.type === 'income' ? '+' : '−'}{fmt(h.amount)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
});

export default EntryRow;
