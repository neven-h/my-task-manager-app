import React from 'react';
import { ArrowLeft, Plus, FileDown } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const TransactionHeader = () => {
    const {
        onBackToTasks,
        colors,
        filteredTransactions,
        setShowAddForm,
        exportToPDF,
    } = useBankTransactionContext();

    return (
        <header className="bank-header" style={{
            background: '#fff',
            color: '#000',
            padding: '1.5rem 2rem',
            borderBottom: `4px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={onBackToTasks}
                    style={{
                        background: '#fff',
                        border: `3px solid ${colors.border}`,
                        color: colors.text,
                        padding: '0.6rem 1.2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                >
                    <ArrowLeft size={20} /> Back
                </button>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    💰 BANK TRANSACTIONS
                </h1>
            </div>
            <div className="bank-header-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        background: colors.secondary,
                        border: `3px solid ${colors.border}`,
                        color: colors.text,
                        padding: '0.75rem 1.5rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                >
                    <Plus size={20} /> Add Transaction
                </button>
                <button
                    onClick={exportToPDF}
                    disabled={filteredTransactions.length === 0}
                    style={{
                        background: colors.accent,
                        border: `3px solid ${colors.border}`,
                        color: '#fff',
                        padding: '0.75rem 1.5rem',
                        cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: filteredTransactions.length === 0 ? 0.5 : 1,
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                >
                    <FileDown size={20} /> Export PDF
                </button>
            </div>
        </header>
    );
};

export default TransactionHeader;
