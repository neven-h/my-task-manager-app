import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { TaskProvider, useTaskContext } from '../context/TaskContext';

// Mobile views — lazy-loaded so they don't inflate the initial chunk
const MobileStatsView = lazy(() => import('../mobile/views/MobileStatsView'));
const MobileBankTransactionsView = lazy(() => import('../mobile/views/MobileBankTransactionsView'));
const MobileStockPortfolioBauhaus = lazy(() => import('../mobile/views/MobileStockPortfolioBauhaus'));
const MobileClientsView = lazy(() => import('../mobile/views/MobileClientsView'));
const MobileNotebookView = lazy(() => import('../mobile/views/MobileNotebookView'));
const MobileBudgetView = lazy(() => import('../mobile/views/MobileBudgetView'));

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
import MobileUploadFlow from '../mobile/components/bank/MobileUploadFlow';
import useSwipeBack from './hooks/useSwipeBack';

import { THEME, FONT_STACK } from './theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';
const IOS_APP_VIEW_STORAGE_KEY = 'ios_app_view';

/**
 * Wraps any full-page view with an iOS-style edge-swipe-back gesture.
 * Swipe right from the left edge → slides the view off to the right → calls onBack.
 * Releasing before the threshold snaps the view back with a spring animation.
 */
const SwipeBackView = ({ onBack, children }) => {
    const { dragX, handlers } = useSwipeBack({ onBack });
    const releasing = dragX === 0; // transition only during snap-back (not while dragging)

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh' }} {...handlers}>
            {/* Depth gradient that appears on the left as the view slides away */}
            <div style={{
                position: 'fixed',
                top: 0, bottom: 0, left: 0,
                width: `${dragX}px`,
                background: 'linear-gradient(to right, rgba(0,0,0,0.10), transparent)',
                pointerEvents: 'none',
                zIndex: 9999,
                transition: releasing ? `width 300ms ${SPRING}` : 'none',
            }} />

            {/* The view itself — translates right as the user drags */}
            <div style={{
                transform: `translateX(${dragX}px)`,
                transition: releasing ? `transform 300ms ${SPRING}` : 'none',
                willChange: 'transform',
            }}>
                {children}
            </div>
        </div>
    );
};

const IOSTaskTrackerInner = () => {
    const { appView, setAppView, authUser, authRole, error, setError } = useTaskContext();
    const [showSidebar, setShowSidebar] = useState(false);
    const [filterMode, setFilterMode] = useState('all');
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);
    const [showUploadFlow, setShowUploadFlow] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedAppView = window.sessionStorage.getItem(IOS_APP_VIEW_STORAGE_KEY);
        if (savedAppView && savedAppView !== appView) {
            setAppView(savedAppView);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(IOS_APP_VIEW_STORAGE_KEY, appView);
    }, [appView]);

    const goBack = useCallback(() => setAppView('tasks'), [setAppView]);

    // Alternate full-page views — lazy-loaded, only created when in a non-tasks view
    const altViews = useMemo(() => ({
        stats:        <MobileStatsView authUser={authUser} authRole={authRole} onBack={goBack} />,
        transactions: <MobileBankTransactionsView authUser={authUser} authRole={authRole} onBack={goBack} />,
        portfolio:    <MobileStockPortfolioBauhaus authUser={authUser} authRole={authRole} onBack={goBack} />,
        clients:      <MobileClientsView authUser={authUser} authRole={authRole} onBack={goBack} />,
        notebook:     <MobileNotebookView onBack={goBack} />,
        budget:       <MobileBudgetView onBack={goBack} />,
    }), [authUser, authRole, goBack]);

    if (altViews[appView]) {
        return (
            <SwipeBackView onBack={goBack}>
                <Suspense fallback={
                    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FONT_STACK }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#888' }}>Loading…</div>
                    </div>
                }>
                    {altViews[appView]}
                </Suspense>
            </SwipeBackView>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', background: THEME.bg, paddingBottom: '20px', fontFamily: FONT_STACK }}>
            <IOSStyles />
            <IOSHeader onMenuOpen={() => setShowSidebar(true)} />

            <IOSTaskActions />
            <IOSFilterBar filterMode={filterMode} setFilterMode={setFilterMode} />
            <IOSActiveFilterBanner />
            <IOSTaskList filterMode={filterMode} />

            <IOSSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} onOpenSearch={() => setShowSearchDrawer(true)} onOpenUpload={() => setShowUploadFlow(true)} />
            <IOSSearchDrawer isOpen={showSearchDrawer} onClose={() => setShowSearchDrawer(false)} />

            <MobileUploadFlow
                isOpen={showUploadFlow}
                onClose={() => setShowUploadFlow(false)}
            />

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
