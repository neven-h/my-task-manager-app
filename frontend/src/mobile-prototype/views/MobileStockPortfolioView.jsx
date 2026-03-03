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
    bg: '#fff', primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    text: '#000', muted: '#666', success: '#00AA00', border: '#000'
};
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileStockPortfolioView = ({ authUser, authRole, onBack }) => {
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
        background: '#fff', borderBottom: '3px solid #000', padding: '16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        position: 'sticky', top: 0, zIndex: 100
    };
    const backButtonStyle = {
        background: 'none', border: 'none', padding: '12px', cursor: 'pointer',
        minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
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
                style={{ position: 'fixed', bottom: '20px', right: '20px', width: '64px', height: '64px', borderRadius: '50%', background: THEME.primary, border: '3px solid #000', boxShadow: '4px 4px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 90 }}
            >
                <Plus size={32} color="#fff" strokeWidth={3} />
            </button>

            <MobileStockPortfolioForm showForm={form.showForm} editingEntry={form.editingEntry} formData={form.formData} setFormData={form.setFormData} stockNames={stockNames} loading={loading} onClose={form.handleCloseForm} onSave={handleSaveEntry} theme={THEME} />
            <MobilePortfolioDraftDialog showDraftDialog={form.showDraftDialog} onClose={() => form.setShowDraftDialog(false)} onDismiss={form.handleDismissDraft} onSaveDraft={form.handleSaveDraft} theme={THEME} />
        </div>
    );
};

export default MobileStockPortfolioView;
