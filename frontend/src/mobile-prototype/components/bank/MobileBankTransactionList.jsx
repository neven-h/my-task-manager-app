import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { THEME, BAUHAUS } from '../../theme';

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
        <div style={{padding: '0 16px 16px 16px', minHeight: '200px', overflow: 'visible'}}>
            {tabsLoading ? (
                <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>Loading...</div>
            ) : !activeTabId ? (
                <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                    {tabs.length === 0
                        ? 'Create a tab to start tracking transactions'
                        : 'Select a tab to view transactions'}
                </div>
            ) : loading ? (
                <div style={{textAlign: 'center', padding: '40px'}}>Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: THEME.muted}}>
                    No transactions found
                </div>
            ) : (
                filteredTransactions.map(transaction => (
                    <div
                        key={transaction.id}
                        style={{
                            border: BAUHAUS.cardBorder,
                            padding: '12px 16px',
                            marginBottom: '8px',
                            background: BAUHAUS.cardBg
                        }}
                    >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px'}}>
                            <div style={{flex: 1, minWidth: 0}}>
                                <div style={{fontSize: '0.8rem', fontWeight: 700, marginBottom: '1px'}}>
                                    {transaction.description ?? '—'}
                                </div>
                                <div style={{fontSize: '0.7rem', color: THEME.muted, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap'}}>
                                    <span>
                                        {transaction.transaction_date
                                            ? new Date(transaction.transaction_date).toLocaleDateString('en-GB')
                                            : '—'}
                                    </span>
                                    <span style={{
                                        padding: '1px 4px',
                                        border: '1px solid #000',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: (transaction.transaction_type || 'credit') === 'cash' ? THEME.secondary : THEME.primary,
                                        color: '#000'
                                    }}>
                                        {transaction.transaction_type || 'credit'}
                                    </span>
                                </div>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0}}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                    color: (Number(transaction.amount) || 0) < 0 ? THEME.accent : THEME.text
                                }}>
                                    {formatCurrency(transaction.amount)}
                                </div>
                                <button
                                    onClick={() => onEdit(transaction)}
                                    style={{
                                        padding: '8px',
                                        border: BAUHAUS.subCardBorder,
                                        background: THEME.primary,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        minWidth: '36px',
                                        minHeight: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Edit"
                                >
                                    <Edit2 size={14}/>
                                </button>
                                <button
                                    onClick={() => onDelete(transaction.id)}
                                    style={{
                                        padding: '8px',
                                        border: BAUHAUS.subCardBorder,
                                        background: THEME.accent,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        minWidth: '36px',
                                        minHeight: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default React.memo(MobileBankTransactionList);
