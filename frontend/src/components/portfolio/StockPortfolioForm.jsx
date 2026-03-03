import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import StockPortfolioFormFields from './StockPortfolioFormFields';

const colors = {
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    card: '#ffffff',
    text: '#000',
    textLight: '#666',
    border: '#000'
};

const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
};

const modalStyle = {
    background: colors.card,
    padding: '2.5rem',
    width: '100%',
    maxWidth: '550px',
    margin: '1rem',
    border: `4px solid ${colors.border}`,
    maxHeight: '90vh',
    overflow: 'auto',
    boxSizing: 'border-box',
    boxShadow: '8px 8px 0px #000',
    outline: 'none'
};

const StockPortfolioForm = ({
    showForm, showDraftDialog,
    formData, editingEntry, isNewStock, stockNames,
    fetchingHistoricalPrice, historicalPriceInfo,
    error, loading,
    onInputChange, onStockNameChange, onFetchHistoricalPrice,
    onCloseForm, onForceCloseForm, onClearError,
    onSubmit,
    onSaveDraft, onDismissDraft
}) => {
    if (!showForm && !showDraftDialog) return null;

    return (
        <>
            {showForm && (
                <div style={overlayStyle} onClick={() => { onClearError(); onCloseForm(); }}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.6rem', color: colors.text }}>
                                {editingEntry ? '✏️ Edit Entry' : '➕ Add Portfolio Entry'}
                            </h2>
                            <button
                                onClick={() => { onForceCloseForm(); onClearError(); }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.text, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={onSubmit}>
                            <StockPortfolioFormFields
                                formData={formData}
                                stockNames={stockNames}
                                isNewStock={isNewStock}
                                editingEntry={editingEntry}
                                fetchingHistoricalPrice={fetchingHistoricalPrice}
                                historicalPriceInfo={historicalPriceInfo}
                                error={error}
                                loading={loading}
                                onInputChange={onInputChange}
                                onStockNameChange={onStockNameChange}
                                onFetchHistoricalPrice={onFetchHistoricalPrice}
                                onCloseForm={onCloseForm}
                                onClearError={onClearError}
                            />
                        </form>
                    </div>
                </div>
            )}

            {showDraftDialog && (
                <div style={{ ...overlayStyle, zIndex: 2000 }} onClick={() => onForceCloseForm()}>
                    <div style={{ background: colors.card, padding: '2.5rem', width: '100%', maxWidth: '450px', margin: '1rem', border: `4px solid ${colors.border}`, boxShadow: '8px 8px 0px #000', outline: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <AlertCircle size={32} color={colors.accent} style={{ marginRight: '1rem' }} />
                            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem', color: colors.text }}>Unsaved Changes</h2>
                        </div>
                        <p style={{ margin: '0 0 2rem 0', fontSize: '1.05rem', lineHeight: '1.6', color: colors.textLight }}>
                            You have unsaved changes. Would you like to save this entry as a draft or dismiss it?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={onDismissDraft} style={{ padding: '1rem 2rem', background: colors.card, border: `3px solid ${colors.border}`, cursor: 'pointer', fontWeight: '600', fontSize: '1rem', color: colors.text, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Dismiss
                            </button>
                            <button onClick={onSaveDraft} style={{ padding: '1rem 2rem', background: colors.secondary, border: `3px solid ${colors.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '1rem', color: colors.text, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Save as Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StockPortfolioForm;
