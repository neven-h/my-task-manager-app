import React from 'react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';
import TransactionFilterBar from './TransactionFilterBar';
import SelectionToolbar from './SelectionToolbar';
import TransactionRow from './TransactionRow';

const TH = { padding: '0.75rem', color: '#fff', fontSize: '0.9rem', fontWeight: '600' };

const TransactionTable = () => {
    const {
        selectedMonth, monthTransactions,
        filteredTransactions,
        totalFiltered, creditTotal, cashTotal,
        selectedIds, toggleSelectAll,
        visibleTransactions, setVisibleTransactions,
        colors, formatMonthYear,
    } = useBankTransactionContext();

    if (!selectedMonth) return null;

    const visibleRows = filteredTransactions.slice(0, visibleTransactions);
    const allVisibleSelected = visibleRows.length > 0 && selectedIds.size === visibleRows.length;

    return (
        <div style={{ background: colors.card, border: `2px solid ${colors.border}`, padding: '1.25rem' }}>
            {/* Header with totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.2rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth)}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: colors.accent, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}` }}>
                        Credit {formatCurrency(creditTotal)}
                    </span>
                    <span style={{ background: colors.success, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}` }}>
                        Cash {formatCurrency(cashTotal)}
                    </span>
                    <span style={{ background: colors.secondary, padding: '0.4rem 0.8rem', color: colors.text, fontWeight: '700', fontSize: '0.95rem', border: `2px solid ${colors.border}` }}>
                        Total: {formatCurrency(totalFiltered)}
                    </span>
                </div>
            </div>

            <TransactionFilterBar />
            <SelectionToolbar />

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                    <thead>
                        <tr style={{ background: colors.primary }}>
                            <th style={{ ...TH, width: '40px', textAlign: 'center' }}>
                                <input type="checkbox" checked={allVisibleSelected}
                                    onChange={() => toggleSelectAll(visibleRows.map(t => t.id))}
                                    style={{ cursor: 'pointer', width: 16, height: 16 }} />
                            </th>
                            <th style={{ ...TH, textAlign: 'left' }}>Date</th>
                            <th style={{ ...TH, textAlign: 'left' }}>Description</th>
                            <th style={{ ...TH, textAlign: 'left', width: '110px' }}>Category</th>
                            <th style={{ ...TH, textAlign: 'center' }}>Type</th>
                            <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                            <th style={{ ...TH, textAlign: 'center', width: '110px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.map(t => <TransactionRow key={t.id} transaction={t} />)}
                    </tbody>
                </table>
            </div>

            {/* Show More */}
            {monthTransactions.length > visibleTransactions && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button onClick={() => setVisibleTransactions(prev => prev + 15)} style={{
                        padding: '0.75rem 2rem', background: colors.primary, color: '#fff',
                        border: `2px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700',
                        fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.3px',
                    }}>
                        Show More ({monthTransactions.length - visibleTransactions} remaining)
                    </button>
                </div>
            )}

            {/* Empty state */}
            {filteredTransactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '3px solid #000', background: '#f8f8f8', margin: '2rem 0' }}>
                    {monthTransactions.length === 0 ? (
                        <>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#0066cc' }}>Add Your First Transaction</p>
                            <p style={{ color: '#666', fontSize: '1rem' }}>Click the "Add Transaction" button above to get started</p>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>No transactions found</p>
                            <p style={{ color: '#666', fontSize: '1rem' }}>Try adjusting your filters or search term</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionTable;
