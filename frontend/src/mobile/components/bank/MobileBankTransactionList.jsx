import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, DollarSign, CreditCard, Circle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME } from '../../theme';
import useSwipeGesture from '../../../ios/hooks/useSwipeGesture';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const TransactionRow = ({ transaction, onEdit, onDelete, isLast, selectMode, isSelected, onToggle, onBatchRename }) => {
    const handleDelete = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        onDelete(transaction.id);
    };

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 80,
        onSwipe: handleDelete,
        disabled: selectMode,
    });

    const type = transaction.transaction_type || 'credit';
    const isNegative = (Number(transaction.amount) || 0) < 0;
    const isCash = type === 'cash';

    const handleRowTap = () => {
        if (selectMode) onToggle(transaction.id);
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
            {!selectMode && (
                <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
                    background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: swipeOffset < -10 ? 1 : 0, transition: `opacity 150ms ${SPRING}`
                }}>
                    <Trash2 size={20} color="#fff" />
                </div>
            )}

            <div
                onClick={handleRowTap}
                style={{
                    padding: '14px 16px', background: isSelected ? 'rgba(0,122,255,0.08)' : '#fff',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    transform: selectMode ? 'none' : `translateX(${swipeOffset}px)`,
                    transition: swipeOffset === 0 ? `transform 300ms ${SPRING}` : 'none',
                    borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
                    position: 'relative', zIndex: 1,
                }}
                {...(selectMode ? {} : { onTouchStart: handlers.onTouchStart, onTouchMove: handlers.onTouchMove, onTouchEnd: handlers.onTouchEnd })}
            >
                {/* Selection checkbox (iOS circle style) */}
                {selectMode && (
                    <div style={{ flexShrink: 0 }}>
                        {isSelected
                            ? <CheckCircle2 size={24} color="#007AFF" fill="rgba(0,122,255,0.15)" />
                            : <Circle size={24} color="#C7C7CC" />}
                    </div>
                )}

                {/* Type icon */}
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isCash ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {isCash ? <DollarSign size={17} color="#B8860B" /> : <CreditCard size={17} color="#0000CC" />}
                </div>

                {/* Description + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={(e) => {
                        if (!selectMode && onBatchRename && transaction.description) {
                            e.stopPropagation();
                            const newName = window.prompt(`Rename all "${transaction.description}" to:`, transaction.description);
                            if (newName && newName.trim() && newName.trim() !== transaction.description) onBatchRename(transaction.description, newName.trim());
                        }
                    }} style={{
                        fontWeight: 600, fontSize: '0.88rem', color: '#000', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textDecoration: !selectMode ? 'underline dashed rgba(0,0,0,0.15)' : 'none',
                        textUnderlineOffset: '3px',
                    }}>
                        {transaction.description ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('en-GB') : '—'}</span>
                        <span style={{
                            borderRadius: 100, padding: '1px 7px',
                            background: isCash ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,255,0.08)',
                            color: isCash ? '#8B6914' : '#0000CC', fontSize: '0.68rem', fontWeight: 500
                        }}>{isCash ? 'Cash' : 'Credit'}</span>
                    </div>
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: isNegative ? '#FF3B30' : THEME.text, flexShrink: 0 }}>
                    {formatCurrency(transaction.amount)}
                </div>

                {/* Action icons (hidden in select mode) */}
                {!selectMode && (
                    <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                        <button onClick={() => onEdit(transaction)}
                            style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={15} color="#C7C7CC" />
                        </button>
                        <button onClick={handleDelete}
                            style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={15} color="#FF3B30" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PAGE_SIZE = 15;

const MobileBankTransactionList = ({
    transactions, filteredTransactions, loading, tabsLoading,
    activeTabId, tabs, onEdit, onDelete,
    selectMode, selectedIds, onToggle, onBatchRename,
}) => {
    const [visible, setVisible] = useState(PAGE_SIZE);

    // Reset pagination when filters change
    useEffect(() => { setVisible(PAGE_SIZE); }, [filteredTransactions]);

    const visibleRows = filteredTransactions.slice(0, visible);
    const hasMore = visible < filteredTransactions.length;

    return (
        <div style={{ padding: '0 16px 16px 16px', minHeight: '200px', paddingBottom: selectMode ? '100px' : '16px' }}>
            {tabsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>Loading...</div>
            ) : !activeTabId ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    {tabs.length === 0 ? 'Create a tab to start tracking transactions' : 'Select a tab to view transactions'}
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>No transactions found</div>
            ) : (
                <>
                    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {visibleRows.map((t, idx) => (
                            <TransactionRow key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete}
                                isLast={idx === visibleRows.length - 1}
                                selectMode={selectMode} isSelected={selectedIds?.has(t.id)} onToggle={onToggle}
                                onBatchRename={onBatchRename} />
                        ))}
                    </div>
                    {hasMore && (
                        <button
                            onClick={() => setVisible(v => v + PAGE_SIZE)}
                            style={{
                                width: '100%', marginTop: 12, padding: '12px',
                                background: 'none', border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                                color: THEME.primary, cursor: 'pointer',
                            }}
                        >
                            Load {Math.min(PAGE_SIZE, filteredTransactions.length - visible)} more
                            <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>
                                ({visible} of {filteredTransactions.length})
                            </span>
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default React.memo(MobileBankTransactionList);
