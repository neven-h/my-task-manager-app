import React from 'react';
import { Upload, FileText, CreditCard, Banknote } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const TransactionUploadSection = () => {
    const {
        transactionType, setTransactionType,
        loading, colors,
        handleFileUpload,
        tabs, activeTabId,
        uploadTargetTabId, setUploadTargetTabId,
    } = useBankTransactionContext();

    const effectiveTargetTabId = uploadTargetTabId || activeTabId;

    return (
        <div style={{
            background: colors.card,
            border: `2px solid ${colors.border}`,
            padding: '1rem',
            marginBottom: '1.5rem'
        }}>
            <h3 style={{
                margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700',
                color: colors.text, display: 'flex', alignItems: 'center', gap: '0.5rem',
                textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
                <Upload size={18} color={colors.primary} />
                Upload
            </h3>

            {tabs.length > 1 && (
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
                        Upload to tab
                    </label>
                    <select
                        value={effectiveTargetTabId || ''}
                        onChange={(e) => setUploadTargetTabId(Number(e.target.value))}
                        style={{
                            width: '100%', padding: '0.5rem', border: `2px solid ${colors.border}`,
                            background: colors.card, color: colors.text, fontSize: '0.85rem',
                            fontFamily: '"Inter", sans-serif', fontWeight: '600', cursor: 'pointer',
                        }}
                    >
                        {tabs.map(tab => (
                            <option key={tab.id} value={tab.id}>{tab.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setTransactionType('credit')}
                        style={{
                            flex: 1, padding: '0.5rem 0.25rem',
                            border: `2px solid ${colors.border}`,
                            background: transactionType === 'credit' ? colors.primary : colors.card,
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '0.25rem',
                            fontWeight: transactionType === 'credit' ? '700' : '600',
                            fontSize: '0.75rem',
                            color: transactionType === 'credit' ? '#fff' : colors.text,
                            fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px'
                        }}
                    >
                        <CreditCard size={14} color={transactionType === 'credit' ? '#fff' : colors.textLight} />
                        Card
                    </button>
                    <button
                        onClick={() => setTransactionType('cash')}
                        style={{
                            flex: 1, padding: '0.5rem 0.25rem',
                            border: `2px solid ${transactionType === 'cash' ? colors.success : colors.border}`,
                            background: transactionType === 'cash' ? '#ecfdf5' : colors.card,
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '0.25rem',
                            fontWeight: transactionType === 'cash' ? '700' : '600',
                            fontSize: '0.75rem',
                            color: transactionType === 'cash' ? colors.success : colors.text,
                            fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px'
                        }}
                    >
                        <Banknote size={14} color={transactionType === 'cash' ? colors.success : colors.textLight} />
                        Cash
                    </button>
                </div>
            </div>

            <div style={{ border: `2px dashed ${colors.border}`, padding: '1rem', textAlign: 'center', background: '#f8f8f8' }}>
                <input
                    type="file" accept=".csv,.xlsx,.xls" multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }} id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
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
    );
};

export default TransactionUploadSection;
