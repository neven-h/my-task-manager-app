/**
 * MobileTaskTracker — thin shell component.
 *
 * All state and data-fetching live in MobileTaskProvider (MobileTaskContext.jsx).
 * Each visual region is handled by a focused component in components/.
 *
 * This is separate from the iOS version (frontend/src/ios/) which uses the shared
 * TaskProvider from context/TaskContext.jsx.
 */
import React from 'react';
import { MobileTaskProvider, useMobileTask } from './MobileTaskContext';

// Existing extracted views
import MobileStatsView from './views/MobileStatsView';
import MobileBankTransactionsView from './views/MobileBankTransactionsView';
import MobileStockPortfolioView from './views/MobileStockPortfolioView';
import MobileClientsView from './views/MobileClientsView';
import MobileNotebookView from './views/MobileNotebookView';

// Focused components
import MobileStyles from './components/MobileStyles';
import MobileHeader from './components/MobileHeader';
import MobileTaskActions from './components/MobileTaskActions';
import MobileFilterBar from './components/MobileFilterBar';
import MobileActiveFilterBanner from './components/MobileActiveFilterBanner';
import MobileTaskList from './components/MobileTaskList';
import MobileSidebar from './components/MobileSidebar';
import MobileSearchDrawer from './components/MobileSearchDrawer';
import MobileTaskFormModal from './components/MobileTaskFormModal';
import MobileBulkTaskModal from './components/MobileBulkTaskModal';
import MobileShareTaskModal from './components/MobileShareTaskModal';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileTaskTrackerInner = () => {
    const { appView, setAppView, authUser, authRole } = useMobileTask();

    // Alternate views
    if (appView === 'stats') return <MobileStatsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'transactions') return <MobileBankTransactionsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'portfolio') return <MobileStockPortfolioView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'clients') return <MobileClientsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'notebook') return <MobileNotebookView onBack={() => setAppView('tasks')} />;

    return (
        <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '20px', fontFamily: FONT_STACK }}>
            <MobileStyles />
            <MobileHeader />
            <MobileTaskActions />
            <MobileFilterBar />
            <MobileActiveFilterBanner />
            <MobileTaskList />

            <MobileSidebar />
            <MobileSearchDrawer />

            <MobileTaskFormModal />
            <MobileBulkTaskModal />
            <MobileShareTaskModal />
        </div>
    );
};

const MobileTaskTracker = ({ authRole, authUser, onLogout }) => (
    <MobileTaskProvider authRole={authRole} authUser={authUser} onLogout={onLogout}>
        <MobileTaskTrackerInner />
    </MobileTaskProvider>
);

export default MobileTaskTracker;
