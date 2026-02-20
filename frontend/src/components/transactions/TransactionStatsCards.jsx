import React from 'react';
import { Banknote, CreditCard, PieChart } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const TransactionStatsCards = () => {
    const { transactionStats, colors } = useBankTransactionContext();

    if (!transactionStats || !transactionStats.by_type || transactionStats.by_type.length === 0) {
        if (transactionStats) {
            return (
                <div style={{
                    background: '#fff3cd',
                    border: `2px solid ${colors.border}`,
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: colors.text }}>
                        ℹ️ No transaction statistics available for this tab. Add transactions to see stats.
                    </p>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
        }}>
            {transactionStats.by_type.map(stat => (
                <div key={stat.transaction_type} style={{
                    background: colors.card,
                    border: `2px solid ${colors.border}`,
                    padding: '1.25rem',
                    textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                        {stat.transaction_type === 'cash' ?
                            <Banknote size={40} color={colors.success} /> :
                            <CreditCard size={40} color={colors.primary} />
                        }
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: stat.transaction_type === 'cash' ? colors.success : colors.primary
                    }}>
                        {formatCurrency(stat.total_amount || 0)}
                    </div>
                    <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                        {stat.transaction_type === 'cash' ? '💵 Cash Total' : '💳 Credit Total'}
                    </div>
                    <div style={{ color: colors.textLight, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        {stat.transaction_count} Transactions
                    </div>
                </div>
            ))}
            <div style={{
                background: colors.card,
                border: `2px solid ${colors.border}`,
                padding: '1.25rem',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <PieChart size={40} color={colors.text} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.text }}>
                    {formatCurrency(transactionStats.by_type.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
                </div>
                <div style={{ color: colors.textLight, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '700', marginTop: '0.25rem' }}>
                    📊 Grand Total
                </div>
                <div style={{ color: colors.textLight, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {transactionStats.by_type.reduce((sum, s) => sum + (s.transaction_count || 0), 0)} Transactions
                </div>
            </div>
        </div>
    );
};

export default React.memo(TransactionStatsCards);
