import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';
import { formatCurrency } from '../../utils/formatCurrency';

const UploadPreview = () => {
    const {
        uploadedData, setUploadedData,
        previewFilter, setPreviewFilter,
        loading, colors,
        handleSaveTransactions,
        getFilteredPreview,
    } = useBankTransactionContext();

    if (!uploadedData) return null;

    return (
        <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
            padding: '1.5rem',
            marginBottom: '2rem'
        }}>
            <h2 style={{ margin: '0 0 1rem 0', color: colors.text, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem' }}>
                <CheckCircle size={28} /> Preview: {uploadedData.transaction_count} transactions ready
                <span style={{
                    marginLeft: 'auto',
                    padding: '0.5rem 1rem',
                    background: uploadedData.transaction_type === 'cash' ? colors.success : colors.primary,
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    border: `2px solid ${colors.border}`
                }}>
                    {uploadedData.transaction_type === 'cash' ? '💵 CASH' : uploadedData.transaction_type === 'mixed' ? '🔀 MIXED' : '💳 CREDIT'}
                </span>
            </h2>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Filter:</span>
                {['all', 'positive', 'negative'].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setPreviewFilter(filter)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: `2px solid ${colors.border}`,
                            background: previewFilter === filter ? colors.primary : colors.card,
                            color: previewFilter === filter ? '#fff' : colors.text,
                            cursor: 'pointer',
                            fontWeight: previewFilter === filter ? '700' : '600',
                            fontSize: '0.9rem',
                            fontFamily: '"Inter", sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}
                    >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                ))}
            </div>

            <div style={{ maxHeight: '350px', overflow: 'auto', border: `2px solid ${colors.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: colors.primary }}>
                            <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Date</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: '#fff', fontSize: '1.05rem' }}>Description</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontSize: '1.05rem' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getFilteredPreview().slice(0, 50).map((t, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{t.transaction_date}</td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{t.description}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: t.amount < 0 ? colors.accent : colors.text, fontWeight: '700', fontSize: '1.05rem' }}>
                                    {formatCurrency(t.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={handleSaveTransactions}
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        background: colors.success,
                        color: '#fff',
                        border: `2px solid ${colors.border}`,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '700',
                        fontSize: '1rem',
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                    }}
                >
                    {loading ? 'Saving...' : `Save ${uploadedData.transaction_count} Transactions`}
                </button>
                <button
                    onClick={() => setUploadedData(null)}
                    style={{
                        padding: '1rem 1.5rem',
                        background: colors.card,
                        border: `2px solid ${colors.border}`,
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: colors.text,
                        fontFamily: '"Inter", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default React.memo(UploadPreview);
