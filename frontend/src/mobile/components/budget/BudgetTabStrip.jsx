import React from 'react';
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

/**
 * Scrollable pill-button tab strip for budget tabs.
 * Props: { tabs, activeTabId, setActiveTabId, confirmDeleteTab, setConfirmDeleteTab, handleDeleteTab }
 */
const BudgetTabStrip = ({ tabs, activeTabId, setActiveTabId, confirmDeleteTab, setConfirmDeleteTab, handleDeleteTab }) => {
    if (!tabs || tabs.length === 0) return null;

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
            {/* "All" tab — no delete */}
            {(() => {
                const isActive = activeTabId === null;
                return (
                    <button key="all" type="button" onClick={() => setActiveTabId(null)}
                        style={{
                            padding: '6px 16px', borderRadius: 20, border: 'none',
                            background: isActive ? IOS.blue : IOS.bg,
                            color: isActive ? '#fff' : IOS.muted,
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.82rem', whiteSpace: 'nowrap',
                            cursor: 'pointer', fontFamily: FONT_STACK, flexShrink: 0,
                            transition: `all 200ms ${IOS.spring}`,
                        }}>
                        All
                    </button>
                );
            })()}

            {tabs.map(tab => {
                const isActive = activeTabId === tab.id;
                const confirming = confirmDeleteTab === tab.id;
                return (
                    <div key={tab.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 2 }}>
                        {confirming ? (
                            /* Confirm-delete state */
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
                            /* Normal tab pill with × */
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
                                    {tab.name}
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
        </div>
    );
};

export { BudgetTabStrip };
export default BudgetTabStrip;
