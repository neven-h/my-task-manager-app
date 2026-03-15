import React from 'react';
import { Edit2, Trash2, DollarSign, CreditCard, Circle, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME } from '../../theme';
import useSwipeGesture from '../../../ios/hooks/useSwipeGesture';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileBankTransactionRow = ({ transaction, onEdit, onDelete, isLast, selectMode, isSelected, onToggle, onBatchRename }) => {
    const handleDelete = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        onDelete(transaction.id);
    };
    const { swipeOffset, handlers } = useSwipeGesture({ threshold: 80, onSwipe: handleDelete, disabled: selectMode });

    const type = transaction.transaction_type || 'credit';
    const isNegative = (Number(transaction.amount) || 0) < 0;
    const isCash = type === 'cash';
    const isTransferIn = type === 'transfer_in';
    const isTransferOut = type === 'transfer_out';
    const isIncome = isTransferIn;

    return (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
            {!selectMode && (
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 72, background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: swipeOffset < -10 ? 1 : 0, transition: `opacity 150ms ${SPRING}` }}>
                    <Trash2 size={20} color="#fff" />
                </div>
            )}
            <div onClick={selectMode ? () => onToggle(transaction.id) : undefined}
                style={{ padding: '14px 16px', background: isSelected ? 'rgba(0,122,255,0.08)' : '#fff', display: 'flex', alignItems: 'center', gap: '12px', transform: selectMode ? 'none' : `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? `transform 300ms ${SPRING}` : 'none', borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.08)', position: 'relative', zIndex: 1 }}
                {...(selectMode ? {} : { onTouchStart: handlers.onTouchStart, onTouchMove: handlers.onTouchMove, onTouchEnd: handlers.onTouchEnd })}
            >
                {selectMode && (
                    <div style={{ flexShrink: 0 }}>
                        {isSelected ? <CheckCircle2 size={24} color="#007AFF" fill="rgba(0,122,255,0.15)" /> : <Circle size={24} color="#C7C7CC" />}
                    </div>
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isTransferIn ? 'rgba(52,199,89,0.15)' : isCash ? 'rgba(255,215,0,0.15)' : isTransferOut ? 'rgba(255,59,48,0.1)' : 'rgba(0,0,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isTransferIn ? <ArrowDownLeft size={17} color="#34C759" /> : isTransferOut ? <ArrowUpRight size={17} color="#FF3B30" /> : isCash ? <DollarSign size={17} color="#B8860B" /> : <CreditCard size={17} color="#0000CC" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={(e) => { if (!selectMode && onBatchRename && transaction.description) { e.stopPropagation(); const newName = window.prompt(`Rename all "${transaction.description}" to:`, transaction.description); if (newName && newName.trim() && newName.trim() !== transaction.description) onBatchRename(transaction.description, newName.trim()); } }}
                        style={{ fontWeight: 600, fontSize: '0.88rem', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: !selectMode ? 'underline dashed rgba(0,0,0,0.15)' : 'none', textUnderlineOffset: '3px' }}>
                        {transaction.description ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('en-GB') : '—'}</span>
                        <span style={{ borderRadius: 100, padding: '1px 7px', background: isTransferIn ? 'rgba(52,199,89,0.15)' : isCash ? 'rgba(255,215,0,0.2)' : isTransferOut ? 'rgba(255,59,48,0.1)' : 'rgba(0,0,255,0.08)', color: isTransferIn ? '#16a34a' : isCash ? '#8B6914' : isTransferOut ? '#FF3B30' : '#0000CC', fontSize: '0.68rem', fontWeight: 500 }}>
                            {isTransferIn ? 'Transfer In' : isTransferOut ? 'Transfer Out' : isCash ? 'Cash' : 'Credit'}
                        </span>
                    </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: isIncome ? '#34C759' : isNegative ? '#FF3B30' : THEME.text, flexShrink: 0 }}>
                    {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
                </div>
                {!selectMode && (
                    <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                        <button onClick={() => onEdit(transaction)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={15} color="#C7C7CC" />
                        </button>
                        <button onClick={handleDelete} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={15} color="#FF3B30" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileBankTransactionRow;
