import React, { useState } from 'react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = {
    bg:        '#F2F2F7',
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    blue:      '#007AFF',
    red:       '#FF3B30',
    muted:     '#8E8E93',
    spring:    'cubic-bezier(0.22,1,0.36,1)',
};

const BudgetTabStrip = ({ tabs, activeTabId, setActiveTabId, confirmDeleteTab, setConfirmDeleteTab, handleDeleteTab, onAddTab }) => {
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');

    if (!tabs || tabs.length === 0) return null;

    const handleAdd = async () => {
        if (!newName.trim() || !onAddTab) return;
        await onAddTab(newName.trim());
        setNewName('');
        setAdding(false);
    };

    return (
        <div style={{
            display: 'flex', overflowX: 'auto', gap: 8,
            padding: '10px 16px',
            background: IOS.card,
            borderBottom: `0.5px solid ${IOS.separator}`,
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            alignItems: 'center',
        }}>
            {tabs.map(tab => {
                const isActive = activeTabId === tab.id;
                const confirming = confirmDeleteTab === tab.id;
                return (
                    <div key={tab.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 2 }}>
                        {confirming ? (
                            <>
                                <button type="button" onClick={() => handleDeleteTab?.(tab.id)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 20, border: 'none',
                                        background: IOS.red, color: '#fff',
                                        fontWeight: 600, fontSize: '0.78rem',
                                        cursor: 'pointer', fontFamily: FONT_STACK, whiteSpace: 'nowrap',
                                    }}>
                                    Delete?
                                </button>
                                <button type="button" onClick={() => setConfirmDeleteTab?.(null)}
                                    style={{
                                        padding: '4px 8px', borderRadius: 20, border: 'none',
                                        background: IOS.bg, color: IOS.muted,
                                        fontWeight: 600, fontSize: '0.78rem',
                                        cursor: 'pointer', fontFamily: FONT_STACK,
                                    }}>
                                    ✕
                                </button>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center',
                                background: isActive ? IOS.blue : IOS.bg,
                                borderRadius: 20,
                                transition: `all 200ms ${IOS.spring}`,
                            }}>
                                <button type="button" onClick={() => setActiveTabId(tab.id)}
                                    style={{
                                        padding: '6px 6px 6px 14px', borderRadius: '20px 0 0 20px',
                                        border: 'none', background: 'transparent',
                                        color: isActive ? '#fff' : IOS.muted,
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.82rem', whiteSpace: 'nowrap',
                                        cursor: 'pointer', fontFamily: FONT_STACK,
                                    }}>
                                    {tab.name?.trim() || `Tab ${tab.id}`}
                                </button>
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteTab?.(tab.id); }}
                                    style={{
                                        padding: '6px 10px 6px 2px', border: 'none',
                                        background: 'transparent', borderRadius: '0 20px 20px 0',
                                        color: isActive ? 'rgba(255,255,255,0.65)' : 'rgba(142,142,147,0.6)',
                                        fontSize: '0.7rem', cursor: 'pointer',
                                        lineHeight: 1, fontWeight: 700,
                                    }}
                                    title="Delete tab">
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {adding ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                        placeholder="Tab name..."
                        style={{ padding: '4px 10px', border: `1px solid ${IOS.muted}`, borderRadius: 8, fontSize: '0.82rem', width: 110, fontFamily: FONT_STACK }} />
                    <button type="button" onClick={handleAdd} style={{
                        padding: '4px 10px', borderRadius: 8, border: 'none',
                        background: IOS.blue, color: '#fff', fontWeight: 600,
                        fontSize: '0.78rem', cursor: 'pointer', fontFamily: FONT_STACK,
                    }}>Add</button>
                    <button type="button" onClick={() => { setAdding(false); setNewName(''); }} style={{
                        padding: '4px 6px', border: 'none', background: 'none',
                        color: IOS.muted, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
                    }}>✕</button>
                </div>
            ) : (
                <button type="button" onClick={() => setAdding(true)} style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none',
                    background: IOS.bg, color: IOS.blue, fontWeight: 700,
                    fontSize: '1rem', cursor: 'pointer', fontFamily: FONT_STACK, flexShrink: 0,
                }}>+</button>
            )}
        </div>
    );
};

export { BudgetTabStrip };
export default BudgetTabStrip;
