import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from '../context/TaskContext';

// Existing mobile views (unchanged)
import MobileStatsView from '../mobile-prototype/views/MobileStatsView';
import MobileBankTransactionsView from '../mobile-prototype/views/MobileBankTransactionsView';
import MobileStockPortfolioView from '../mobile-prototype/views/MobileStockPortfolioView';
import MobileClientsView from '../mobile-prototype/views/MobileClientsView';
import MobileNotebookView from '../mobile-prototype/views/MobileNotebookView';

// iOS components
import IOSStyles from './IOSStyles';
import IOSHeader from './IOSHeader';
import IOSTaskActions from './IOSTaskActions';
import IOSFilterBar from './IOSFilterBar';
import IOSActiveFilterBanner from './IOSActiveFilterBanner';
import IOSTaskList from './IOSTaskList';
import IOSSidebar from './IOSSidebar';
import IOSSearchDrawer from './IOSSearchDrawer';
import IOSTaskFormModal from './IOSTaskFormModal';
import IOSBulkTaskModal from './IOSBulkTaskModal';
import IOSShareTaskModal from './IOSShareTaskModal';

import { THEME, FONT_STACK } from './theme';

const IOSTaskTrackerInner = () => {
    const { appView, setAppView, authUser, authRole, error, setError } = useTaskContext();
    const [showSidebar, setShowSidebar] = useState(false);
    const [filterMode, setFilterMode] = useState('all');
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);

    // Alternate views
    if (appView === 'stats') return <MobileStatsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'transactions') return <MobileBankTransactionsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'portfolio') return <MobileStockPortfolioView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'clients') return <MobileClientsView authUser={authUser} authRole={authRole} onBack={() => setAppView('tasks')} />;
    if (appView === 'notebook') return <MobileNotebookView onBack={() => setAppView('tasks')} />;

    return (
        <div style={{ minHeight: '100vh', background: THEME.bg, paddingBottom: '20px', fontFamily: FONT_STACK }}>
            <IOSStyles />
            <IOSHeader onMenuOpen={() => setShowSidebar(true)} />

            <IOSTaskActions />
            <IOSFilterBar filterMode={filterMode} setFilterMode={setFilterMode} />
            <IOSActiveFilterBanner />
            <IOSTaskList filterMode={filterMode} />

            <IOSSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} onOpenSearch={() => setShowSearchDrawer(true)} />
            <IOSSearchDrawer isOpen={showSearchDrawer} onClose={() => setShowSearchDrawer(false)} />

            <IOSTaskFormModal />
            <IOSBulkTaskModal />
            <IOSShareTaskModal />
        </div>
    );
};

const IOSTaskTracker = ({ onLogout, authToken, authRole, authUser }) => (
    <TaskProvider authToken={authToken} authRole={authRole} authUser={authUser} onLogout={onLogout}>
        <IOSTaskTrackerInner />
    </TaskProvider>
);

export default IOSTaskTracker;
