import React from 'react';
import { ArrowLeft, Plus, AlertCircle, CheckCircle, X } from 'lucide-react';

const colors = {
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    success: '#00AA00',
    background: '#fff',
    card: '#ffffff',
    text: '#000',
    textLight: '#666',
    border: '#000'
};

const StockPortfolioHeader = ({ onBackToTasks, onAddEntry, error, success, onClearError, onClearSuccess }) => {
    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .portfolio-header {
                        flex-direction: column !important;
                        padding: 1rem !important;
                        text-align: center;
                    }
                    .portfolio-header h1 {
                        font-size: 1.3rem !important;
                    }
                    .portfolio-header-buttons {
                        width: 100%;
                        justify-content: center !important;
                    }
                    .portfolio-header-buttons button {
                        flex: 1;
                        padding: 0.6rem 0.8rem !important;
                        font-size: 0.85rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .portfolio-header h1 {
                        font-size: 1.1rem !important;
                    }
                }
            `}</style>

            <header className="portfolio-header" style={{
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
                        📈 STOCK PORTFOLIO
                    </h1>
                </div>
                <div className="portfolio-header-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={onAddEntry}
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
                        <Plus size={20} /> Add Entry
                    </button>
                </div>
            </header>

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
                    <button onClick={onClearError} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
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
                    <button onClick={onClearSuccess} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}>
                        <X size={20} />
                    </button>
                </div>
            )}
        </>
    );
};

export default StockPortfolioHeader;
