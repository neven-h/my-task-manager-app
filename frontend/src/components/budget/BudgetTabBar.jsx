import React, { useRef, useEffect } from 'react';
import { Copy } from 'lucide-react';

const SYS = {
    primary: '#0000FF',
    text:    '#000',
    light:   '#666',
    border:  '#000',
    bg:      '#fff',
};

export const BudgetTabBar = ({
    tabs,
    activeTabId,
    setActiveTabId,
    confirmDeleteTab,
    setConfirmDeleteTab,
    handleDeleteTab,
    handleDuplicateTab,
    addingTab,
    setAddingTab,
    newTabName,
    setNewTabName,
    handleAddTab,
}) => {
    const activeRef = useRef(null);

    // Scroll active tab into view whenever it changes
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        }
    }, [activeTabId]);

    return (
        <div style={{
            background: SYS.bg,
            borderBottom: `3px solid ${SYS.border}`,
            padding: '0 20px',
            display: 'flex', alignItems: 'center', gap: 0,
            overflowX: 'auto',
        }}>
            {tabs.map(tab => {
                const isActive = activeTabId === tab.id;
                return (
                    <div key={tab.id} ref={isActive ? activeRef : null}
                        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button type="button" onClick={() => setActiveTabId(tab.id)}
                            style={{
                                padding: '10px 12px 10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 700,
                                color: isActive ? SYS.primary : SYS.text,
                                borderBottom: isActive ? `3px solid ${SYS.primary}` : '3px solid transparent',
                                textTransform: 'uppercase', letterSpacing: '0.4px',
                                whiteSpace: 'nowrap',
                            }}>
                            {tab.name}
                        </button>

                        {/* Duplicate */}
                        <button type="button" onClick={() => handleDuplicateTab(tab.id)}
                            title="Duplicate tab"
                            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', padding: '2px 3px', lineHeight: 1 }}>
                            <Copy size={12} />
                        </button>

                        {/* Delete */}
                        {confirmDeleteTab === tab.id ? (
                            <>
                                <button type="button" onClick={() => handleDeleteTab(tab.id)}
                                    style={{ background: '#FF0000', color: '#fff', border: `2px solid ${SYS.border}`, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginRight: 2, textTransform: 'uppercase' }}>
                                    Delete?
                                </button>
                                <button type="button" onClick={() => setConfirmDeleteTab(null)}
                                    style={{ background: 'none', border: 'none', color: SYS.light, cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px', fontWeight: 700 }}>
                                    ✕
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setConfirmDeleteTab(tab.id)}
                                title="Delete tab"
                                style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px', lineHeight: 1, fontWeight: 700 }}>
                                ✕
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Add tab */}
            {addingTab ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0 6px 8px', flexShrink: 0 }}>
                    <input
                        autoFocus
                        value={newTabName}
                        onChange={e => setNewTabName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddTab(); if (e.key === 'Escape') { setAddingTab(false); setNewTabName(''); } }}
                        placeholder="Tab name…"
                        style={{ padding: '4px 8px', border: `2px solid ${SYS.border}`, fontSize: '0.8rem', width: 120, outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button type="button" onClick={handleAddTab}
                        style={{ padding: '4px 10px', border: `2px solid ${SYS.border}`, background: SYS.primary, color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                        Add
                    </button>
                    <button type="button" onClick={() => { setAddingTab(false); setNewTabName(''); }}
                        style={{ background: 'none', border: 'none', color: SYS.light, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                        ✕
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => setAddingTab(true)}
                    title="Add tab"
                    style={{ padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', color: SYS.primary, fontSize: '1.2rem', flexShrink: 0, fontWeight: 700 }}>
                    +
                </button>
            )}
        </div>
    );
};

export default BudgetTabBar;
