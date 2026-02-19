import React from 'react';
import { CheckSquare, DollarSign, Users, TrendingUp } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const TaskMobileTabBar = () => {
    const {
        isAdmin, isSharedUser, isLimitedUser,
        appView, setAppView,
        formModal, showBulkInput, shareModal
    } = useTaskContext();

    const anyModalOpen = formModal.isOpen || showBulkInput || shareModal.isOpen;

    return (
        <div className="mobile-bottom-tabs" style={anyModalOpen ? {display: 'none'} : {}}>
            <button
                className={appView === 'tasks' ? 'active-tab' : ''}
                onClick={() => setAppView('tasks')}
            >
                <CheckSquare size={20}/>
                <span>Tasks</span>
            </button>
            {(isAdmin || isSharedUser || isLimitedUser) && (
                <button
                    className={appView === 'transactions' ? 'active-tab' : ''}
                    onClick={() => setAppView('transactions')}
                >
                    <DollarSign size={20}/>
                    <span>Bank</span>
                </button>
            )}
            {!isSharedUser && (
                <button
                    className={appView === 'clients' ? 'active-tab' : ''}
                    onClick={() => setAppView('clients')}
                >
                    <Users size={20}/>
                    <span>Clients</span>
                </button>
            )}
            {(isAdmin || isSharedUser || isLimitedUser) && (
                <button
                    className={appView === 'portfolio' ? 'active-tab' : ''}
                    onClick={() => setAppView('portfolio')}
                >
                    <TrendingUp size={20}/>
                    <span>Portfolio</span>
                </button>
            )}
        </div>
    );
};

export default TaskMobileTabBar;
