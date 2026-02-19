import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import BankTransactions from './BankTransactions';
import ClientsManagement from './ClientsManagement';
import StockPortfolio from './StockPortfolio';
import './TaskTracker.css';

import { TaskProvider, useTaskContext } from './context/TaskContext';
import TaskHeader from './components/tasks/TaskHeader';
import TaskMobileMenu from './components/tasks/TaskMobileMenu';
import TaskMobileTabBar from './components/tasks/TaskMobileTabBar';
import TaskMobileSidebar from './components/tasks/TaskMobileSidebar';
import TaskSidebar from './components/tasks/TaskSidebar';
import TaskList from './components/tasks/TaskList';
import TaskStatsView from './components/tasks/TaskStatsView';
import TaskFormModal from './components/tasks/TaskFormModal';
import BulkTaskModal from './components/tasks/BulkTaskModal';
import ShareTaskModal from './components/tasks/ShareTaskModal';

const TaskTrackerInner = () => {
    const { appView, setAppView, view, error, setError, authUser, authRole } = useTaskContext();

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Route to other app views
    if (appView === 'transactions') {
        return <BankTransactions onBackToTasks={() => setAppView('tasks')} authUser={authUser} authRole={authRole} />;
    }
    if (appView === 'clients') {
        return <ClientsManagement onBackToTasks={() => setAppView('tasks')} />;
    }
    if (appView === 'portfolio') {
        return <StockPortfolio onBackToTasks={() => setAppView('tasks')} />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#fff',
            fontFamily: '"Helvetica Neue", Calibri, sans-serif',
            color: '#000'
        }}>
            {/* Color Bar */}
            <div className="color-bar"></div>

            {/* Header */}
            <TaskHeader
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                setShowMobileMenu={setShowMobileMenu}
                setShowMobileSidebar={setShowMobileSidebar}
            />

            {/* Mobile Menu */}
            <TaskMobileMenu
                isOpen={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
                onOpenMobileSidebar={() => setShowMobileSidebar(true)}
            />

            {/* Mobile Bottom Tab Bar */}
            <TaskMobileTabBar />

            {/* Error Banner */}
            {error && (
                <div style={{
                    background: '#FF0000',
                    color: '#fff',
                    padding: '16px 48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: '3px solid #000'
                }}>
                    <AlertCircle size={20}/>
                    <span style={{fontWeight: 600}}>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{
                            marginLeft: 'auto',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#fff'
                        }}
                    >
                        <X size={20}/>
                    </button>
                </div>
            )}

            {/* Mobile Sidebar */}
            <TaskMobileSidebar
                isOpen={showMobileSidebar}
                onClose={() => setShowMobileSidebar(false)}
            />

            {/* Main Content */}
            <div style={{display: 'flex', minHeight: 'calc(100vh - 180px)'}}>
                <TaskSidebar isVisible={showSidebar} />
                <div style={{flex: 1, padding: 'var(--content-padding, 48px)', transition: 'all 0.3s ease', minWidth: 0}}>
                    {view === 'list' ? <TaskList /> : <TaskStatsView />}
                </div>
            </div>

            {/* Modals */}
            <TaskFormModal />
            <BulkTaskModal />
            <ShareTaskModal />
        </div>
    );
};

const TaskTracker = ({ onLogout, authToken, authRole, authUser }) => {
    return (
        <TaskProvider authToken={authToken} authRole={authRole} authUser={authUser} onLogout={onLogout}>
            <TaskTrackerInner />
        </TaskProvider>
    );
};

export default TaskTracker;
