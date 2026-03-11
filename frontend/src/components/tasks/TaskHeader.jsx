import React from 'react';
import { Filter, Menu, DollarSign, Tag, BarChart3, PiggyBank, BookOpen } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import UserMenuButton from './UserMenuButton';

const ICN = { display: 'inline', verticalAlign: 'middle', marginRight: '4px' };
const NAV_BTN = { whiteSpace: 'nowrap', flexShrink: 0 };

const TaskHeader = ({ showSidebar, setShowSidebar, setShowMobileMenu, setShowMobileSidebar }) => {
    const {
        isAdmin, isSharedUser, isLimitedUser, authUser,
        view, setView, appView, setAppView, onLogout
    } = useTaskContext();

    return (
        <header style={{
            background: '#fff', borderBottom: '4px solid #000',
            padding: '16px', position: 'sticky', top: 0, zIndex: 100, overflow: 'visible'
        }}>
            <div style={{
                width: '100%', margin: '0 auto', display: 'flex',
                justifyContent: 'flex-start', alignItems: 'center',
                padding: '0 var(--header-padding, 16px)', gap: 'var(--header-gap, 16px)',
                flexWrap: 'nowrap', minWidth: 0, overflow: 'visible'
            }}>
                {/* Title */}
                <div style={{ flexShrink: 0 }}>
                    <h1 onClick={() => { setAppView('tasks'); setView('list'); }} style={{
                        fontFamily: '"Inter", sans-serif', fontSize: 'clamp(1.3rem, 3vw, 2rem)',
                        fontWeight: 900, margin: 0, letterSpacing: '-0.5px',
                        textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer',
                    }}>
                        Task Tracker
                    </h1>
                </div>

                {/* Mobile-only buttons */}
                <button className="btn btn-white mobile-filter-btn" onClick={() => setShowMobileSidebar(true)}
                    style={{ padding: '10px', minWidth: 'auto', marginRight: '12px', flexShrink: 0 }} title="Search & Filter">
                    <Filter size={24} />
                </button>
                <button className="mobile-menu-btn btn btn-white" onClick={() => setShowMobileMenu(prev => !prev)}
                    style={{ padding: '10px', minWidth: 'auto', flexShrink: 0 }} title="Menu">
                    <Menu size={24} />
                </button>

                {/* Toggle Sidebar */}
                <button className="btn btn-white" onClick={() => setShowSidebar(!showSidebar)}
                    title={showSidebar ? 'Hide Filters' : 'Show Filters'}
                    style={{ padding: '10px', minWidth: 'auto', flexShrink: 0 }}>
                    <Filter size={18} />
                </button>

                {/* Desktop nav buttons (scrollable, centered) */}
                <div className="desktop-header-buttons" style={{
                    display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center',
                    flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'visible',
                    paddingBottom: '2px', justifyContent: 'center',
                }}>
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <button className="btn btn-blue" onClick={() => setAppView('transactions')} style={NAV_BTN}>
                            <DollarSign size={16} style={ICN} />Transactions
                        </button>
                    )}
                    {!isSharedUser && (
                        <button className="btn btn-yellow" onClick={() => setAppView('clients')} style={NAV_BTN}>
                            <Tag size={16} style={ICN} />Clients
                        </button>
                    )}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <button className="btn btn-green" onClick={() => setAppView('portfolio')} style={NAV_BTN}>
                            <BarChart3 size={16} style={ICN} />Portfolio
                        </button>
                    )}
                    {!isSharedUser && (
                        <button className="btn btn-red" onClick={() => setAppView('budget')} style={NAV_BTN}>
                            <PiggyBank size={16} style={ICN} />Budget
                        </button>
                    )}
                    {!isSharedUser && (
                        <button className="btn btn-white" onClick={() => setAppView('notebook')} style={NAV_BTN}>
                            <BookOpen size={16} style={ICN} />Notebook
                        </button>
                    )}
                    <button className="btn btn-yellow"
                        onClick={() => { setAppView('tasks'); setView(view === 'list' ? 'stats' : 'list'); }}
                        style={NAV_BTN}>
                        <BarChart3 size={16} style={ICN} />Stats
                    </button>
                </div>

                {/* User menu (avatar → Settings + Logout dropdown) */}
                <UserMenuButton authUser={authUser} isAdmin={isAdmin} onLogout={onLogout} />
            </div>
        </header>
    );
};

export default TaskHeader;
