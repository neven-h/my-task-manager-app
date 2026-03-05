import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import YahooPortfolioSection from '../../components/portfolio/YahooPortfolioSection';
import useMobilePortfolioTabs from '../hooks/useMobilePortfolioTabs';
import useMobilePortfolioData from '../hooks/useMobilePortfolioData';
import useMobilePortfolioForm from '../hooks/useMobilePortfolioForm';
import useMobilePortfolioCRUD from '../hooks/useMobilePortfolioCRUD';
import useMobileStockPrices from '../hooks/useMobileStockPrices';
import useMobilePortfolioCalc from '../hooks/useMobilePortfolioCalc';
import MobileStockPortfolioHeader from '../components/portfolio/MobileStockPortfolioHeader';
import MobileStockSummaryCards from '../components/portfolio/MobileStockSummaryCards';
import MobileStockList from '../components/portfolio/MobileStockList';
import MobileStockPortfolioForm from '../components/portfolio/MobileStockPortfolioForm';
import MobilePortfolioDraftDialog from '../components/portfolio/MobilePortfolioDraftDialog';

const THEME = {
    bg: '#ffffff',
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    text: '#000000',
    muted: '#8E8E93',
    success: '#34C759',
    border: 'rgba(0,0,0,0.08)'
};
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileStockPortfolioBauhaus = ({ authUser, authRole, onBack }) => {
    const [summaryDisplayCurrency, setSummaryDisplayCurrency] = useState('ILS');

    const { tabs, activeTabId, setActiveTabId, handleCreateTab } = useMobilePortfolioTabs(authUser, authRole);
    const { entries, summary, stockNames, loading, setLoading, fetchEntries, fetchSummary } = useMobilePortfolioData(activeTabId);
    const { stockPrices, priceLoading } = useMobileStockPrices(activeTabId, entries);
    const { getEntryValues, groupedEntries } = useMobilePortfolioCalc(entries);

    const form = useMobilePortfolioForm(activeTabId);
    const { handleSaveEntry, handleDeleteEntry } = useMobilePortfolioCRUD({
        activeTabId, editingEntry: form.editingEntry, formData: form.formData,
        setLoading, fetchEntries, fetchSummary,
        handleCloseForm: form.handleCloseForm,
        clearDraft: form.clearDraft
    });

    useEffect(() => {
        if (form.showForm) {
            const origOverflow = document.body.style.overflow;
            const origPosition = document.body.style.position;
            const origWidth = document.body.style.width;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            return () => {
                document.body.style.overflow = origOverflow;
                document.body.style.position = origPosition;
                document.body.style.width = origWidth;
            };
        }
    }, [form.showForm]);

    const headerStyle = {
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '8px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        position: 'sticky',
        top: 0,
        zIndex: 100
    };
    const backButtonStyle = {
        background: 'none',
        border: 'none',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: FONT_STACK }}>
            <MobileStockPortfolioHeader onBack={onBack} tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} handleCreateTab={handleCreateTab} theme={THEME} headerStyle={headerStyle} backButtonStyle={backButtonStyle} />
            <MobileStockSummaryCards summary={summary} summaryDisplayCurrency={summaryDisplayCurrency} setSummaryDisplayCurrency={setSummaryDisplayCurrency} theme={THEME} fontStack={FONT_STACK} />
            <div style={{ padding: '0 16px 16px' }}>
                <YahooPortfolioSection colors={{ ...THEME, textLight: THEME.muted }} authUser={authUser} authRole={authRole} defaultExpanded={true} />
            </div>
            <div style={{ padding: '16px' }}>
                <MobileStockList loading={loading} groupedEntries={groupedEntries} stockPrices={stockPrices} priceLoading={priceLoading} getEntryValues={getEntryValues} onEdit={form.openEditEntryForm} onDelete={handleDeleteEntry} theme={THEME} />
            </div>

            <button
                onClick={form.openNewEntryForm}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '28px',
                    background: THEME.primary,
                    border: 'none',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={24} color="#fff" strokeWidth={2} />
            </button>

            <MobileStockPortfolioForm showForm={form.showForm} editingEntry={form.editingEntry} formData={form.formData} setFormData={form.setFormData} stockNames={stockNames} loading={loading} onClose={form.handleCloseForm} onSave={handleSaveEntry} theme={THEME} />
            <MobilePortfolioDraftDialog showDraftDialog={form.showDraftDialog} onClose={() => form.setShowDraftDialog(false)} onDismiss={form.handleDismissDraft} onSaveDraft={form.handleSaveDraft} theme={THEME} />
        </div>
    );
};

export default MobileStockPortfolioBauhaus;
