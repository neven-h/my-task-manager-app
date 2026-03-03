import React from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const TransactionMonthsList = () => {
    const {
        savedMonths, selectedMonth, colors,
        handleDeleteMonth, fetchAllTransactions, fetchMonthTransactions, formatMonthYear,
    } = useBankTransactionContext();

    return (
        <div style={{ background: colors.card, border: `2px solid ${colors.border}`, padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: '700', fontSize: '1.1rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Saved Months
            </h3>

            <button
                onClick={fetchAllTransactions}
                style={{
                    width: '100%', padding: '0.75rem 1rem', marginBottom: '0.5rem',
                    border: `2px solid ${colors.border}`,
                    background: selectedMonth === 'all' ? colors.accent : colors.card,
                    color: selectedMonth === 'all' ? '#fff' : colors.text,
                    cursor: 'pointer',
                    fontWeight: selectedMonth === 'all' ? '700' : '600',
                    fontSize: '0.95rem', fontFamily: '"Inter", sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.3px'
                }}
            >
                All Transactions
            </button>

            {savedMonths.map(month => (
                <div key={month.month_year} style={{
                    border: `2px solid ${colors.border}`,
                    background: selectedMonth === month.month_year ? colors.accent : colors.card,
                    marginBottom: '0.5rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', overflow: 'hidden'
                }}>
                    <button
                        onClick={() => fetchMonthTransactions(month.month_year)}
                        style={{
                            flex: 1, padding: '0.65rem 0.85rem', border: 'none',
                            background: 'transparent',
                            color: selectedMonth === month.month_year ? '#fff' : colors.text,
                            cursor: 'pointer', textAlign: 'left',
                            fontWeight: selectedMonth === month.month_year ? '700' : '600',
                            fontFamily: '"Inter", sans-serif'
                        }}
                    >
                        <div style={{ fontSize: '0.95rem', marginBottom: '0.15rem' }}>{formatMonthYear(month.month_year)}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                            {month.transaction_count} transactions • {formatCurrency(month.total_amount)}
                        </div>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMonth(month.month_year); }}
                        style={{
                            padding: '0.65rem 0.75rem', background: 'transparent', border: 'none',
                            borderLeft: `1px solid ${selectedMonth === month.month_year ? 'rgba(255,255,255,0.2)' : colors.border}`,
                            cursor: 'pointer',
                            color: selectedMonth === month.month_year ? '#fff' : colors.textLight,
                            fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Delete month"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}

            {savedMonths.length === 0 && (
                <p style={{ color: colors.textLight, textAlign: 'center', padding: '1rem', fontSize: '0.9rem' }}>
                    No months saved yet
                </p>
            )}
        </div>
    );
};

export default TransactionMonthsList;
