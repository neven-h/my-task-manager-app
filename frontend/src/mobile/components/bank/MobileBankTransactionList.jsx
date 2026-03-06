import React from 'react';
import { Edit2, Trash2, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME } from '../../theme';
import useSwipeGesture from '../../../ios/hooks/useSwipeGesture';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const TransactionRow = ({ transaction, onEdit, onDelete, isLast }) => {
    const handleDelete = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        onDelete(transaction.id);
    };

    const { swipeOffset, handlers } = useSwipeGesture({
        threshold: 80,
        onSwipe: handleDelete
    });

    const type = transaction.transaction_type || 'credit';
    const isNegative = (Number(transaction.amount) || 0) < 0;
    const isCash = type === 'cash';

    return (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Swipe delete reveal */}
            <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
                background: '#FF3B30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: swipeOffset < -10 ? 1 : 0,
                transition: `opacity 150ms ${SPRING}`
            }}>
                <Trash2 size={20} color="#fff" />
            </div>

            {/* Row */}
            <div
                style={{
                    padding: '14px 16px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transform: `translateX(${swipeOffset}px)`,
                    transition: swipeOffset === 0 ? `transform 300ms ${SPRING}` : 'none',
                    borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
                    position: 'relative',
                    zIndex: 1
                }}
                onTouchStart={handlers.onTouchStart}
                onTouchMove={handlers.onTouchMove}
                onTouchEnd={handlers.onTouchEnd}
            >
                {/* Type icon */}
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isCash ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {isCash
                        ? <DollarSign size={17} color="#B8860B" />
                        : <CreditCard size={17} color="#0000CC" />}
                </div>

                {/* Description + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {transaction.description ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>
                            {transaction.transaction_date
                                ? new Date(transaction.transaction_date).toLocaleDateString('en-GB')
                                : '—'}
                        </span>
                        <span style={{
                            borderRadius: 100,
                            padding: '1px 7px',
                            background: isCash ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,255,0.08)',
                            color: isCash ? '#8B6914' : '#0000CC',
                            fontSize: '0.68rem', fontWeight: 500
                        }}>
                            {isCash ? 'Cash' : 'Credit'}
                        </span>
                    </div>
                </div>

                {/* Amount */}
                <div style={{
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    color: isNegative ? '#FF3B30' : THEME.text,
                    flexShrink: 0
                }}>
                    {formatCurrency(transaction.amount)}
                </div>

                {/* Action icons */}
                <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                    <button
                        onClick={() => onEdit(transaction)}
                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit"
                    >
                        <Edit2 size={15} color="#C7C7CC" />
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Delete"
                    >
                        <Trash2 size={15} color="#FF3B30" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const MobileBankTransactionList = ({
    transactions,
    filteredTransactions,
    loading,
    tabsLoading,
    activeTabId,
    tabs,
    onEdit,
    onDelete
}) => {
    return (
        <div style={{ padding: '0 16px 16px 16px', minHeight: '200px' }}>
            {tabsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>Loading...</div>
            ) : !activeTabId ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    {tabs.length === 0
                        ? 'Create a tab to start tracking transactions'
                        : 'Select a tab to view transactions'}
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    No transactions found
                </div>
            ) : (
                <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {filteredTransactions.map((transaction, idx) => (
                        <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isLast={idx === filteredTransactions.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(MobileBankTransactionList);
