/**
 * MobileTaskTracker — thin shell component.
 *
 * Uses the shared TaskProvider from context/TaskContext.jsx — the same data layer
 * as the desktop (TaskTracker.jsx) and iOS (IOSTaskTracker.jsx) versions.
 * UI-only state (sidebar, filter mode, search drawer) lives here as local state.
 * Each visual region is handled by a focused component in components/.
 */
import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from '../context/TaskContext';

// Existing extracted views
import MobileStatsView from './views/MobileStatsView';
import MobileBankTransactionsView from './views/MobileBankTransactionsView';
import MobileStockPortfolioBauhaus from './views/MobileStockPortfolioBauhaus';
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
    const { appView, setAppView, authUser, authRole } = useTaskContext();

    // UI-only state lives in the shell, not in context
    const [showSidebar, setShowSidebar] = useState(false);
    const [filterMode, setFilterMode] = useState('all');
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);

    // Alternate views
    if (appView === 'stats') return <MobileStatsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'transactions') return <MobileBankTransactionsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'portfolio') return <MobileStockPortfolioBauhaus authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'clients') return <MobileClientsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'notebook') return <MobileNotebookView onBack={() => setAppView('tasks')} />;

    return (
        <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '20px', fontFamily: FONT_STACK }}>
            <MobileStyles />
            <MobileHeader onMenuOpen={() => setShowSidebar(true)} />
            <MobileTaskActions />
            <MobileFilterBar filterMode={filterMode} setFilterMode={setFilterMode} />
            <MobileActiveFilterBanner />
            <MobileTaskList filterMode={filterMode} />

            <MobileSidebar
                isOpen={showSidebar}
                onClose={() => setShowSidebar(false)}
                onOpenSearch={() => { setShowSearchDrawer(true); setShowSidebar(false); }}
            />
            <MobileSearchDrawer
                isOpen={showSearchDrawer}
                onClose={() => setShowSearchDrawer(false)}
            />

            <MobileTaskFormModal />
            <MobileBulkTaskModal />
            <MobileShareTaskModal />
        </div>
    );
};

const MobileTaskTracker = ({ authToken, authRole, authUser, onLogout }) => (
    <TaskProvider authToken={authToken} authRole={authRole} authUser={authUser} onLogout={onLogout}>
        <MobileTaskTrackerInner />
    </TaskProvider>
);

export default MobileTaskTracker;
