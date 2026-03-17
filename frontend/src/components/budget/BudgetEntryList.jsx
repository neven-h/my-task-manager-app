import React, { useMemo } from 'react';
import { EntryRow, EMPTY_HISTORY } from './BudgetEntryRow';

const SYS = {
    primary: '#0000FF',
    success: '#00AA00',
    accent:  '#FF0000',
    bg:      '#fff',
    text:    '#000',
    light:   '#666',
    border:  '#000',
};

export const BudgetEntryList = ({
    loading,
    entries,
    visibleEntries,
    typeFilter,
    setTypeFilter,
    cutoff,
    openEdit,
    openDuplicate,
    deleteEntry,
    expandedDescriptionId,
    setExpandedDescriptionId,
    getDescriptionHistory,
    selectMode,
    selectedIds,
    toggleSelect,
}) => {
    // Running balance keyed by entry id, computed from all entries in date order
    const balanceMap = useMemo(() => {
        const map = {};
        let running = 0;
        (entries || []).forEach(e => {
            running += e.type === 'income' ? Number(e.amount) : -Number(e.amount);
            map[e.id] = running;
        });
        return map;
    }, [entries]);

    const filterBtn = (active, color = SYS.primary) => ({
        padding: '5px 16px',
        border: `2px solid ${SYS.border}`,
        background: active ? color : '#fff',
        color: active ? '#fff' : SYS.text,
        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.4px',
    });

    return (
        <div style={{ background: SYS.bg, border: `3px solid ${SYS.border}`, overflow: 'hidden' }}>
            {/* List header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderBottom: `2px solid ${SYS.border}`,
                background: '#F5F5F5',
            }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[['all', 'All'], ['income', 'Income'], ['outcome', 'Expenses']].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setTypeFilter(val)}
                            style={filterBtn(typeFilter === val, val === 'income' ? SYS.success : val === 'outcome' ? SYS.accent : SYS.primary)}>
                            {label}
                        </button>
                    ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: SYS.light, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {visibleEntries.length} entr{visibleEntries.length === 1 ? 'y' : 'ies'}
                </span>
            </div>

            {/* Column headers */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '5px 16px',
                borderBottom: `2px solid ${SYS.border}`,
                background: '#ECECEC',
                fontSize: '0.68rem', fontWeight: 800, color: SYS.light,
                textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
                <div style={{ width: 8, flexShrink: 0 }} />
                <div style={{ width: 90, flexShrink: 0 }}>Date</div>
                <div style={{ flex: 1, minWidth: 0 }}>Description</div>
                <div style={{ flexShrink: 0 }}>Amount</div>
                <div style={{ width: 90, flexShrink: 0, textAlign: 'right', borderLeft: '2px solid #ddd', paddingLeft: 10 }}>Balance</div>
                <div style={{ width: 80, flexShrink: 0 }} />
            </div>

            {/* Rows */}
            {loading && entries.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: SYS.light, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Loading…
                </div>
            ) : visibleEntries.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: SYS.light }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💰</div>
                    <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>No entries yet</div>
                    <div style={{ fontSize: '0.85rem' }}>Add your first income or expense above.</div>
                </div>
            ) : (
                visibleEntries.map(e => (
                    <EntryRow
                        key={e.id}
                        entry={e}
                        balance={balanceMap[e.id]}
                        cutoff={cutoff}
                        onEdit={openEdit}
                        onDuplicate={openDuplicate}
                        onDelete={deleteEntry}
                        loading={loading}
                        isExpanded={expandedDescriptionId === e.id}
                        onToggleExpand={(id) => setExpandedDescriptionId(prev => prev === id ? null : id)}
                        history={expandedDescriptionId === e.id ? getDescriptionHistory(e) : EMPTY_HISTORY}
                        selectMode={selectMode}
                        isSelected={selectedIds?.has(e.id)}
                        onToggleSelect={toggleSelect}
                    />
                ))
            )}
        </div>
    );
};

export default BudgetEntryList;
