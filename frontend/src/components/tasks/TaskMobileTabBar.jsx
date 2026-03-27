import React from 'react';
import { CheckSquare, DollarSign, Users, TrendingUp, PiggyBank, Wrench } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const TaskMobileTabBar = () => {
    const {
        isAdmin, isSharedUser, isLimitedUser,
        appView, setAppView,
        formModal, showBulkInput, shareModal,
        navVisibility,
    } = useTaskContext();

    const anyModalOpen = formModal.isOpen || showBulkInput || shareModal.isOpen;
    const vis = navVisibility || {};

    return (
        <div className="mobile-bottom-tabs" style={anyModalOpen ? {display: 'none'} : {}}>
            <button
                className={appView === 'tasks' ? 'active-tab' : ''}
                onClick={() => setAppView('tasks')}
            >
                <CheckSquare size={20}/>
                <span>Tasks</span>
            </button>
            {(isAdmin || isSharedUser || isLimitedUser) && vis.transactions !== false && (
                <button
                    className={appView === 'transactions' ? 'active-tab' : ''}
                    onClick={() => setAppView('transactions')}
                >
                    <DollarSign size={20}/>
                    <span>Bank</span>
                </button>
            )}
            {!isSharedUser && vis.clients !== false && (
                <button
                    className={appView === 'clients' ? 'active-tab' : ''}
                    onClick={() => setAppView('clients')}
                >
                    <Users size={20}/>
                    <span>Clients</span>
                </button>
            )}
            {(isAdmin || isSharedUser || isLimitedUser) && vis.portfolio !== false && (
                <button
                    className={appView === 'portfolio' ? 'active-tab' : ''}
                    onClick={() => setAppView('portfolio')}
                >
                    <TrendingUp size={20}/>
                    <span>Portfolio</span>
                </button>
            )}
            {!isSharedUser && vis.budget !== false && (
                <button
                    className={appView === 'budget' ? 'active-tab' : ''}
                    onClick={() => setAppView('budget')}
                >
                    <PiggyBank size={20}/>
                    <span>Budget</span>
                </button>
            )}
            {!isSharedUser && vis.renovation !== false && (
                <button
                    className={appView === 'renovation' ? 'active-tab' : ''}
                    onClick={() => setAppView('renovation')}
                >
                    <Wrench size={20}/>
                    <span>Reno</span>
                </button>
            )}
        </div>
    );
};

export default TaskMobileTabBar;
