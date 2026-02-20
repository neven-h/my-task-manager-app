import React from 'react';
import { Upload, Calendar, Trash2, FileText, CreditCard, Banknote } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const TransactionSidebar = () => {
    const {
        savedMonths, selectedMonth,
        transactionType, setTransactionType,
        loading, colors,
        handleFileUpload,
        handleDeleteMonth,
        fetchAllTransactions,
        fetchMonthTransactions,
        formatMonthYear,
    } = useBankTransactionContext();

    return (
        <div>
            {/* Upload Section - Compact */}
            <div style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1rem',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                }}>
                    <Upload size={18} color={colors.primary} />
                    Upload
                </h3>

                {/* Transaction Type Selector - Compact */}
                <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setTransactionType('credit')}
                            style={{
                                flex: 1,
                                padding: '0.5rem 0.25rem',
                                border: `2px solid ${colors.border}`,
                                background: transactionType === 'credit' ? colors.primary : colors.card,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontWeight: transactionType === 'credit' ? '700' : '600',
                                fontSize: '0.75rem',
                                color: transactionType === 'credit' ? '#fff' : colors.text,
                                fontFamily: '"Inter", sans-serif',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}
                        >
                            <CreditCard size={14} color={transactionType === 'credit' ? '#fff' : colors.textLight} />
                            Card
                        </button>
                        <button
                            onClick={() => setTransactionType('cash')}
                            style={{
                                flex: 1,
                                padding: '0.5rem 0.25rem',
                                border: `2px solid ${transactionType === 'cash' ? colors.success : colors.border}`,
                                background: transactionType === 'cash' ? '#ecfdf5' : colors.card,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontWeight: transactionType === 'cash' ? '700' : '600',
                                fontSize: '0.75rem',
                                color: transactionType === 'cash' ? colors.success : colors.text,
                                fontFamily: '"Inter", sans-serif',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}
                        >
                            <Banknote size={14} color={transactionType === 'cash' ? colors.success : colors.textLight} />
                            Cash
                        </button>
                    </div>
                </div>

                <div style={{
                    border: `2px dashed ${colors.border}`,
                    padding: '1rem',
                    textAlign: 'center',
                    background: '#f8f8f8'
                }}>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" style={{
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <FileText size={32} color={colors.text} />
                        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: colors.text, textAlign: 'center', lineHeight: '1.3' }}>
                            Click to upload
                        </span>
                        <span style={{ color: colors.textLight, fontSize: '0.7rem' }}>
                            CSV or Excel · select multiple files
                        </span>
                    </label>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '0.75rem', color: colors.text, fontSize: '0.85rem', fontWeight: '600' }}>
                        ⏳ Processing...
                    </div>
                )}
            </div>

            {/* Saved Months */}
            <div style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', fontWeight: '700', fontSize: '1.1rem', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Saved Months
                </h3>

                <button
                    onClick={fetchAllTransactions}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        marginBottom: '0.5rem',
                        border: `2px solid ${colors.border}`,
                        background: selectedMonth === 'all' ? colors.accent : colors.card,
                        color: selectedMonth === 'all' ? '#fff' : colors.text,
                        cursor: 'pointer',
                        fontWeight: selectedMonth === 'all' ? '700' : '600',
                        fontSize: '0.95rem',
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                    }}
                >
                    All Transactions
                </button>

                {savedMonths.map(month => (
                    <div key={month.month_year} style={{
                        border: `2px solid ${colors.border}`,
                        background: selectedMonth === month.month_year ? colors.accent : colors.card,
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => fetchMonthTransactions(month.month_year)}
                            style={{
                                flex: 1,
                                padding: '0.65rem 0.85rem',
                                border: 'none',
                                background: 'transparent',
                                color: selectedMonth === month.month_year ? '#fff' : colors.text,
                                cursor: 'pointer',
                                textAlign: 'left',
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
                                padding: '0.65rem 0.75rem',
                                background: 'transparent',
                                border: 'none',
                                borderLeft: `1px solid ${selectedMonth === month.month_year ? 'rgba(255,255,255,0.2)' : colors.border}`,
                                cursor: 'pointer',
                                color: selectedMonth === month.month_year ? '#fff' : colors.textLight,
                                fontFamily: '"Inter", sans-serif',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
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
        </div>
    );
};

export default TransactionSidebar;
