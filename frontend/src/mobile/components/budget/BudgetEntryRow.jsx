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

export const EntryRow = memo(({ entry, balance, onEdit, onDelete, isLast, isExpanded, onToggleExpand, history, selectMode, isSelected, onToggleSelect }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pressed, setPressed] = useState(false);
    const isIncome = entry.type === 'income';
    const dotColor = isIncome ? IOS.green : IOS.red;
    const sign = isIncome ? '+' : '−';

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 12px',
                    borderBottom: (isLast && !isExpanded) ? 'none' : `0.5px solid ${IOS.separator}`,
                    opacity: 1,
                    background: pressed ? '#F2F2F7' : IOS.card,
                    transition: 'opacity 200ms, background 120ms',
                }}
                onTouchStart={() => setPressed(true)}
                onTouchEnd={() => setPressed(false)}
            >
                {/* Row 1: Date + Description + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {/* Select checkbox */}
                    {selectMode && (
                        <div onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.id); }}
                            style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: `2px solid ${isSelected ? '#007AFF' : 'rgba(0,0,0,0.2)'}`,
                                background: isSelected ? '#007AFF' : '#fff',
                                cursor: 'pointer', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '0.65rem', fontWeight: 700
                            }}>
                            {isSelected && '✓'}
                        </div>
                    )}

                    {/* Type dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

                    {/* Date - compact format */}
                    <div style={{ fontSize: '0.72rem', color: IOS.muted, flexShrink: 0, minWidth: 65 }}>
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>

                    {/* Description (clickable to expand) */}
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            unicodeBidi: 'plaintext',
                        }}
                        dir="auto"
                        onClick={() => onToggleExpand(entry.id)}
                    >
                        {entry.description}
                    </div>

                    {/* Actions - only show when not in confirm mode */}
                    <div style={{ display: 'flex', gap: 0, flexShrink: 0, marginLeft: 4 }}>
                        {confirmDelete ? (
                            <>
                                <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                                    style={{ padding: '3px 8px', border: 'none', borderRadius: 6, background: IOS.red, color: '#fff', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Delete
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    style={{ padding: '3px 6px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: '#fff', fontSize: '0.68rem', cursor: 'pointer', marginLeft: 4 }}>
                                    ✕
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => onEdit(entry)}
                                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                    <Edit2 size={13} />
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(true)}
                                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: IOS.muted, borderRadius: 6 }}>
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Row 2: Category/Notes (left) + Amount + Balance (right) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: selectMode ? 28 : 16 }}>
                    {/* Category/Notes - left side */}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '0.7rem',
                        color: IOS.muted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingRight: 8,
                    }}>
                        {[entry.category, entry.notes].filter(Boolean).join(' · ') || '\u00A0'}
                    </div>

                    {/* Amount + Balance - right side, fixed widths */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {/* Amount */}
                        <div style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: dotColor,
                            textAlign: 'right',
                            minWidth: 70,
                        }}>
                            {sign}{fmt(entry.amount)}
                        </div>

                        {/* Balance (יתרה) */}
                        {balance !== undefined && (
                            <div style={{
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                textAlign: 'right',
                                minWidth: 70,
                                color: balance >= 0 ? IOS.green : IOS.red,
                                borderLeft: `0.5px solid ${IOS.separator}`,
                                paddingLeft: 8,
                            }}>
                                {fmt(balance)}
                            </div>
                        )}
                    </div>
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
