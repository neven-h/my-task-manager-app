import React, { useState, useEffect } from 'react';
import { THEME } from '../../theme';
import MobileBankTransactionRow from './MobileBankTransactionRow';

const PAGE_SIZE = 15;

const SHIMMER = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.4s ease infinite',
    borderRadius: 8,
};

const SkeletonRow = ({ isLast }) => (
    <div style={{ padding: '14px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: 12, borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ ...SHIMMER, width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...SHIMMER, height: 13, width: '55%', marginBottom: 7 }} />
            <div style={{ ...SHIMMER, height: 10, width: '35%' }} />
        </div>
        <div style={{ ...SHIMMER, height: 13, width: 56, borderRadius: 6 }} />
    </div>
);

const TransactionSkeleton = ({ count = 8 }) => (
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {Array.from({ length: count }, (_, i) => (
            <SkeletonRow key={i} isLast={i === count - 1} />
        ))}
    </div>
);

const MobileBankTransactionList = ({
    transactions, filteredTransactions, loading, tabsLoading,
    activeTabId, tabs, onEdit, onDelete,
    selectMode, selectedIds, onToggle, onBatchRename,
}) => {
    const [visible, setVisible] = useState(PAGE_SIZE);
    useEffect(() => { setVisible(PAGE_SIZE); }, [filteredTransactions]);

    const visibleRows = filteredTransactions.slice(0, visible);
    const hasMore = visible < filteredTransactions.length;

    return (
        <div style={{ padding: '0 16px 16px 16px', minHeight: '200px', paddingBottom: selectMode ? '100px' : '16px' }}>
            {tabsLoading ? (
                <TransactionSkeleton count={5} />
            ) : !activeTabId ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    {tabs.length === 0 ? 'Create a tab to start tracking transactions' : 'Select a tab to view transactions'}
                </div>
            ) : loading ? (
                <TransactionSkeleton count={8} />
            ) : filteredTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>No transactions found</div>
            ) : (
                <>
                    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {visibleRows.map((t, idx) => (
                            <MobileBankTransactionRow key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete}
                                isLast={idx === visibleRows.length - 1}
                                selectMode={selectMode} isSelected={selectedIds?.has(t.id)} onToggle={onToggle} onBatchRename={onBatchRename} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {hasMore && (
                            <button onClick={() => setVisible(v => v + PAGE_SIZE)} style={{ flex: 1, padding: '12px', background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, color: THEME.primary, cursor: 'pointer' }}>
                                Load {Math.min(PAGE_SIZE, filteredTransactions.length - visible)} more
                                <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>({visible} of {filteredTransactions.length})</span>
                            </button>
                        )}
                        {visible > PAGE_SIZE && (
                            <button onClick={() => setVisible(PAGE_SIZE)} style={{ flex: hasMore ? 0 : 1, padding: '12px 20px', background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, color: '#888', cursor: 'pointer' }}>
                                Show Less
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default React.memo(MobileBankTransactionList);
