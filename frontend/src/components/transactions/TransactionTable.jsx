import React from 'react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';
import TransactionRow from './TransactionRow';

const TransactionTable = () => {
    const {
        selectedMonth, monthTransactions,
        filteredTransactions,
        totalFiltered, creditTotal, cashTotal,
        searchTerm, setSearchTerm,
        descriptionFilter, setDescriptionFilter,
        typeFilter, setTypeFilter,
        allDescriptions,
        visibleTransactions, setVisibleTransactions,
        colors,
        formatMonthYear,
    } = useBankTransactionContext();

    if (!selectedMonth) return null;

    return (
        <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
            padding: '1.25rem'
        }}>
            {/* Header with totals */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.2rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth)}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: colors.accent, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                        Credit {formatCurrency(creditTotal)}
                    </span>
                    <span style={{ background: colors.success, padding: '0.4rem 0.8rem', color: '#fff', fontWeight: '700', fontSize: '0.9rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                        Cash {formatCurrency(cashTotal)}
                    </span>
                    <span style={{ background: colors.secondary, padding: '0.4rem 0.8rem', color: colors.text, fontWeight: '700', fontSize: '0.95rem', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif' }}>
                        Total: {formatCurrency(totalFiltered)}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                padding: '1rem',
                background: '#f8f8f8',
                border: `2px solid ${colors.border}`
            }}>
                <div style={{ flex: 1, minWidth: '160px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Type
                    </label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    >
                        <option value="all">All Types</option>
                        <option value="credit">Credit Only</option>
                        <option value="cash">Cash Only</option>
                    </select>
                </div>
                <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Search
                    </label>
                    <input
                        type="text"
                        placeholder="Search descriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    />
                </div>
                <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Category
                    </label>
                    <select
                        value={descriptionFilter}
                        onChange={(e) => setDescriptionFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', border: `2px solid ${colors.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}
                    >
                        <option value="">All Categories</option>
                        {allDescriptions.map(desc => (
                            <option key={desc} value={desc}>{desc}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${colors.border}` }}>
                    <thead>
                        <tr style={{ background: colors.primary }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Description</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Type</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Amount</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem', width: '110px', fontWeight: '600' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.slice(0, visibleTransactions).map(t => (
                            <TransactionRow key={t.id} transaction={t} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Show More Button */}
            {filteredTransactions.length > visibleTransactions && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        onClick={() => setVisibleTransactions(prev => prev + 50)}
                        style={{
                            padding: '0.75rem 2rem',
                            background: colors.primary,
                            color: '#fff',
                            border: `2px solid ${colors.border}`,
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            fontFamily: '"Inter", sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}
                    >
                        Show More ({filteredTransactions.length - visibleTransactions} remaining)
                    </button>
                </div>
            )}

            {/* Empty state */}
            {filteredTransactions.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    border: '3px solid #000',
                    background: '#f8f8f8',
                    margin: '2rem 0'
                }}>
                    {monthTransactions.length === 0 ? (
                        <>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#0066cc' }}>
                                💰 Add Your First Transaction
                            </p>
                            <p style={{ color: '#666', fontSize: '1rem' }}>
                                Click the "Add Transaction" button above to get started
                            </p>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>
                                No transactions found
                            </p>
                            <p style={{ color: '#666', fontSize: '1rem' }}>
                                Try adjusting your filters or search term
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionTable;
