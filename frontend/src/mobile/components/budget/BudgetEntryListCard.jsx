import React, { useMemo } from 'react';
import { FONT_STACK } from '../../../ios/theme';
import { EntryRow, EMPTY_HISTORY } from './BudgetEntryRow';

const IOS = {
    bg:        '#F2F2F7',
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    label:     '#3C3C43',
    radius:    16,
    spring:    'cubic-bezier(0.22,1,0.36,1)',
};

const FILTER_TABS = [['all', 'All'], ['income', 'Income'], ['outcome', 'Expenses']];

/**
 * Entry list card: filter tabs + entry rows.
 * Props: {
 *   visibleEntries, loading, entries, typeFilter, setTypeFilter, cutoff,
 *   openEdit, deleteEntry, expandedDescriptionId, setExpandedDescriptionId,
 *   getDescriptionHistory
 * }
 */
const BudgetEntryListCard = ({
    visibleEntries, loading, entries, typeFilter, setTypeFilter, cutoff,
    openEdit, deleteEntry, expandedDescriptionId, setExpandedDescriptionId,
    getDescriptionHistory, selectMode, selectedIds, toggleSelect,
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

    return (
    <div style={{
        margin: '0 16px', background: IOS.card, borderRadius: IOS.radius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden',
    }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', borderBottom: `0.5px solid ${IOS.separator}`, padding: '10px 12px', gap: 6 }}>
            {FILTER_TABS.map(([val, label]) => {
                const active = typeFilter === val;
                return (
                    <button key={val} type="button" onClick={() => setTypeFilter(val)}
                        style={{
                            padding: '5px 14px',
                            borderRadius: 20,
                            border: 'none',
                            background: active ? IOS.blue : IOS.bg,
                            color: active ? '#fff' : IOS.muted,
                            fontWeight: active ? 600 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontFamily: FONT_STACK,
                            transition: `all 200ms ${IOS.spring}`,
                        }}>
                        {label}
                    </button>
                );
            })}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '0.72rem', color: IOS.muted, alignSelf: 'center' }}>
                {visibleEntries.length}
            </span>
        </div>

        {/* Rows */}
        {loading && entries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: IOS.muted, fontSize: '0.9rem' }}>
                Loading…
            </div>
        ) : visibleEntries.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>💰</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: IOS.label }}>No entries yet</div>
                <div style={{ fontSize: '0.82rem', color: IOS.muted }}>
                    Tap "+ Income" or "+ Expense" to get started
                </div>
            </div>
        ) : (
            visibleEntries.map((e, idx) => (
                <EntryRow
                    key={e.id}
                    entry={e}
                    balance={balanceMap[e.id]}
                    cutoff={cutoff}
                    onEdit={openEdit}
                    onDelete={deleteEntry}
                    isLast={idx === visibleEntries.length - 1}
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

export { BudgetEntryListCard };
export default BudgetEntryListCard;
