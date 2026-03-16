import React, { useState } from 'react';
import { Edit2, Trash2, Copy } from 'lucide-react';

const SYS = {
    success: '#00AA00',
    accent:  '#FF0000',
    light:   '#666',
    border:  '#000',
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

export const EMPTY_HISTORY = [];

export const EntryRow = ({ entry, cutoff, onEdit, onDuplicate, onDelete, loading, isExpanded, onToggleExpand, history, selectMode, isSelected, onToggleSelect }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isPast = entry.entry_date <= cutoff;
    const isIncome = entry.type === 'income';
    const amountColor = isIncome ? SYS.success : SYS.accent;
    const sign = isIncome ? '+' : '−';

    return (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                borderBottom: `1px solid ${SYS.border}`,
                opacity: isPast ? 1 : 0.4,
            }}>
                {/* Select checkbox */}
                {selectMode && (
                    <div onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.id); }}
                        style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? SYS.success : SYS.border}`,
                            background: isSelected ? SYS.success : '#fff', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>
                        {isSelected && '✓'}
                    </div>
                )}
                {/* Type indicator */}
                <div style={{ width: 8, height: 8, background: amountColor, flexShrink: 0 }} />

                {/* Date */}
                <div style={{ fontSize: '0.78rem', color: SYS.light, width: 68, flexShrink: 0, fontWeight: 600 }}>
                    {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>

                {/* Description + category (clickable to expand) */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onToggleExpand(entry.id)}>
                    <div style={{
                        fontWeight: 600, fontSize: '0.9rem',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        borderBottom: '1px dashed #999', display: 'inline',
                        paddingBottom: 1,
                    }}>
                        {entry.description}
                    </div>
                    {(entry.category || entry.notes) && (
                        <div style={{ fontSize: '0.74rem', color: SYS.light, marginTop: 2 }}>
                            {[entry.category, entry.notes].filter(Boolean).join(' · ')}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: amountColor, flexShrink: 0 }}>
                    {sign}{fmt(entry.amount)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {confirmDelete ? (
                        <>
                            <button type="button" onClick={() => { setConfirmDelete(false); onDelete(entry.id); }}
                                style={{ padding: '3px 10px', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                                Delete?
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(false)}
                                style={{ padding: '3px 8px', border: `2px solid ${SYS.border}`, background: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>
                                ✕
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => onEdit(entry)}
                                style={{ background: 'none', border: 'none', padding: '3px 6px', cursor: 'pointer', color: SYS.light }}
                                title="Edit">
                                <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => onDuplicate(entry)}
                                style={{ background: 'none', border: 'none', padding: '3px 6px', cursor: 'pointer', color: SYS.light }}
                                title="Duplicate">
                                <Copy size={14} />
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                style={{ background: 'none', border: 'none', padding: '3px 6px', cursor: 'pointer', color: SYS.light }}
                                title="Delete">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Expanded description history */}
            {isExpanded && history.length > 0 && (
                <div style={{ background: '#f9f9f9', borderBottom: `1px solid ${SYS.border}` }}>
                    <div style={{ padding: '6px 16px 4px 32px', fontSize: '0.7rem', fontWeight: 700, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Recent with same description
                    </div>
                    {history.map(h => (
                        <div key={h.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '5px 16px 5px 32px',
                            fontSize: '0.82rem', color: SYS.light,
                        }}>
                            <div style={{ width: 8, height: 8, background: h.type === 'income' ? SYS.success : SYS.accent, flexShrink: 0 }} />
                            <div style={{ width: 68, flexShrink: 0, fontWeight: 600 }}>
                                {new Date(h.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {h.description}
                            </div>
                            <div style={{ fontWeight: 700, color: h.type === 'income' ? SYS.success : SYS.accent, flexShrink: 0 }}>
                                {h.type === 'income' ? '+' : '−'}{fmt(h.amount)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default EntryRow;
