/**
 * MobileTaskTracker — thin shell component.
 *
 * Uses the shared TaskProvider from context/TaskContext.jsx — the same data layer
 * as the desktop (TaskTracker.jsx) and iOS (IOSTaskTracker.jsx) versions.
 * UI-only state (sidebar, filter mode, search drawer) lives here as local state.
 * Each visual region is handled by a focused component in components/.
 *
 * Navigation uses ViewTransitionContainer for iOS-style push/pop animations
 * and swipe-from-left-edge to go back.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TaskProvider, useTaskContext } from '../context/TaskContext';
import { FONT_STACK } from './theme';

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
import ViewTransitionContainer from './components/ViewTransitionContainer';

import storage from '../core/storage';

const MobileTaskTrackerInner = () => {
    const { appView, setAppView, authUser, authRole } = useTaskContext();

    useEffect(() => {
        storage.init();
    }, []);

    const [showSidebar, setShowSidebar] = useState(false);
    const [filterMode, setFilterMode] = useState('all');
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);

    const goHome = () => setAppView('tasks');

    const subViewContent = useMemo(() => {
        switch (appView) {
            case 'stats':
                return <MobileStatsView authUser={authUser} authRole={authRole} onBack={goHome} />;
            case 'transactions':
                return <MobileBankTransactionsView authUser={authUser} authRole={authRole} onBack={goHome} />;
            case 'portfolio':
                return <MobileStockPortfolioBauhaus authUser={authUser} authRole={authRole} onBack={goHome} />;
            case 'clients':
                return <MobileClientsView authUser={authUser} authRole={authRole} onBack={goHome} />;
            case 'notebook':
                return <MobileNotebookView onBack={goHome} />;
            default:
                return null;
        }
    }, [appView, authUser, authRole]);

    const openSidebar = useCallback(() => setShowSidebar(true), []);

    const homeContent = useMemo(() => (
        <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '20px', fontFamily: FONT_STACK }}>
            <MobileStyles />
            <MobileHeader onMenuOpen={openSidebar} />
            <MobileTaskActions />
            <MobileFilterBar filterMode={filterMode} setFilterMode={setFilterMode} />
            <MobileActiveFilterBanner />
            <MobileTaskList filterMode={filterMode} />

            <MobileTaskFormModal />
            <MobileBulkTaskModal />
            <MobileShareTaskModal />
        </div>
    ), [filterMode, openSidebar]);

    return (
        <>
            <ViewTransitionContainer
                currentView={appView}
                homeView="tasks"
                onBack={goHome}
                homeContent={homeContent}
            >
                {subViewContent}
            </ViewTransitionContainer>

            <MobileSidebar
                isOpen={showSidebar}
                onClose={() => setShowSidebar(false)}
                onOpenSearch={() => { setShowSearchDrawer(true); setShowSidebar(false); }}
            />
            <MobileSearchDrawer
                isOpen={showSearchDrawer}
                onClose={() => setShowSearchDrawer(false)}
            />
        </>
    );
};

const MobileTaskTracker = ({ authToken, authRole, authUser, onLogout }) => (
    <TaskProvider authToken={authToken} authRole={authRole} authUser={authUser} onLogout={onLogout}>
        <MobileTaskTrackerInner />
    </TaskProvider>
);

export default MobileTaskTracker;
