import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const TransactionMessages = () => {
    const {
        error, setError,
        success, setSuccess,
        orphanedCount, activeTabId,
        tabs, colors,
        adoptOrphanedTransactions,
    } = useBankTransactionContext();

    return (
        <>
            {error && (
                <div style={{
                    background: colors.accent,
                    color: '#fff',
                    padding: '1rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '1.05rem',
                    borderBottom: `3px solid ${colors.border}`
                }}>
                    <AlertCircle size={22} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            {success && (
                <div style={{
                    background: colors.secondary,
                    color: colors.text,
                    padding: '1rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '1.05rem',
                    borderBottom: `3px solid ${colors.border}`
                }}>
                    <CheckCircle size={22} />
                    {success}
                    <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            {orphanedCount > 0 && activeTabId && (
                <div style={{
                    padding: '1rem 1.5rem',
                    background: '#FFF3CD',
                    border: `3px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.95rem' }}>
                        <strong>{orphanedCount}</strong> transaction{orphanedCount !== 1 ? 's' : ''} from before tabs were added {orphanedCount !== 1 ? 'are' : 'is'} not assigned to any tab.
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => adoptOrphanedTransactions(tab.id)}
                                style={{
                                    padding: '0.4rem 1rem',
                                    background: colors.primary,
                                    color: '#fff',
                                    border: `2px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    fontFamily: '"Inter", sans-serif'
                                }}
                            >
                                Assign to "{tab.name}"
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default TransactionMessages;
