import React from 'react';

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
    addingTab,
    setAddingTab,
    newTabName,
    setNewTabName,
    handleAddTab,
}) => (
    <div style={{
        background: SYS.bg,
        borderBottom: `3px solid ${SYS.border}`,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 0,
        overflowX: 'auto',
    }}>
        {/* "All" tab */}
        <button type="button" onClick={() => setActiveTabId(null)}
            style={{
                padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 700,
                color: activeTabId === null ? SYS.primary : SYS.text,
                borderBottom: activeTabId === null ? `3px solid ${SYS.primary}` : '3px solid transparent',
                textTransform: 'uppercase', letterSpacing: '0.4px',
                whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            All
        </button>

        {tabs.map(tab => (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <button type="button" onClick={() => setActiveTabId(tab.id)}
                    style={{
                        padding: '10px 14px 10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '0.82rem', fontWeight: 700,
                        color: activeTabId === tab.id ? SYS.primary : SYS.text,
                        borderBottom: activeTabId === tab.id ? `3px solid ${SYS.primary}` : '3px solid transparent',
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                    }}>
                    {tab.name}
                </button>
                {confirmDeleteTab === tab.id ? (
                    <>
                        <button type="button" onClick={() => handleDeleteTab(tab.id)}
                            style={{ background: SYS.accent, color: '#fff', border: `2px solid ${SYS.border}`, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginRight: 2, textTransform: 'uppercase' }}>
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
        ))}

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

export default BudgetTabBar;
