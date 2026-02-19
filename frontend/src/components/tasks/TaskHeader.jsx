import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Menu, DollarSign, Tag, BarChart3, Settings, LogOut } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const TaskHeader = ({ showSidebar, setShowSidebar, setShowMobileMenu, setShowMobileSidebar }) => {
    const navigate = useNavigate();
    const {
        isAdmin, isSharedUser, isLimitedUser, authUser,
        view, setView, appView, setAppView, onLogout
    } = useTaskContext();

    return (
        <header style={{
            background: '#fff',
            borderBottom: '4px solid #000',
            padding: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            overflow: 'visible'
        }}>
            <div style={{
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                padding: '0 var(--header-padding, 16px)',
                gap: 'var(--header-gap, 32px)',
                flexWrap: 'nowrap',
                minWidth: 0,
                overflow: 'visible'
            }}>
                <div style={{ flexShrink: 0, minWidth: '200px' }}>
                    <h1 style={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: 'clamp(1.5rem, 5vw, 3rem)',
                        fontWeight: 900,
                        margin: '0 0 4px 0',
                        letterSpacing: '-1px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap'
                    }}>
                        Task Tracker
                    </h1>
                    <p style={{
                        fontSize: 'clamp(0.7rem, 2vw, 1rem)',
                        margin: 0,
                        fontWeight: 400,
                        color: '#666',
                        display: 'none'
                    }} className="desktop-subtitle">
                        Personal Assistant Management System
                    </p>
                </div>

                {/* Filter/Search Button - Mobile only */}
                <button
                    className="btn btn-white mobile-filter-btn"
                    onClick={() => setShowMobileSidebar(true)}
                    style={{padding: '10px', minWidth: 'auto', marginRight: '12px', flexShrink: 0}}
                    title="Search & Filter"
                >
                    <Filter size={24}/>
                </button>

                {/* Hamburger Menu Button - Mobile only */}
                <button
                    className="mobile-menu-btn btn btn-white"
                    onClick={() => setShowMobileMenu(prev => !prev)}
                    style={{padding: '10px', minWidth: 'auto', flexShrink: 0}}
                    title="Menu"
                >
                    <Menu size={24}/>
                </button>

                {/* Desktop Header Buttons */}
                <div className="desktop-header-buttons"
                     style={{
                         display: 'flex',
                         gap: '12px',
                         flexWrap: 'nowrap',
                         alignItems: 'center',
                         minWidth: 0,
                         overflowX: 'auto',
                         overflowY: 'visible',
                         paddingBottom: '2px'
                     }}>
                    {/* Toggle Sidebar Button */}
                    <button
                        className="btn btn-white"
                        onClick={() => setShowSidebar(!showSidebar)}
                        title={showSidebar ? "Hide Filters" : "Show Filters"}
                        style={{padding: '10px', minWidth: 'auto'}}
                    >
                        <Filter size={18}/>
                    </button>

                    {/* Show user info - only for admin */}
                    {isAdmin && (
                        <span style={{fontSize: '0.85rem', fontWeight: '600', color: '#666', marginRight: '8px'}}>
                            👤 {authUser} (admin)
                        </span>
                    )}
                    {/* Bank Transactions - for admin, shared, AND limited users */}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <button className="btn btn-blue" onClick={() => setAppView('transactions')} style={{whiteSpace: 'nowrap', flexShrink: 0}}>
                            <DollarSign size={16}
                                        style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                            Bank Transactions
                        </button>
                    )}
                    {/* Clients - for admin and limited users (not shared) */}
                    {!isSharedUser && (
                        <button className="btn btn-green" onClick={() => setAppView('clients')} style={{whiteSpace: 'nowrap', flexShrink: 0}}>
                            <Tag size={16}
                                 style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                            Clients
                        </button>
                    )}
                    {/* Stock Portfolio - for all users */}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <button className="btn btn-yellow" onClick={() => setAppView('portfolio')} style={{background: '#FFD500', color: '#000', border: '2px solid #000', whiteSpace: 'nowrap', flexShrink: 0}}>
                            <BarChart3 size={16}
                                       style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                            Portfolio
                        </button>
                    )}
                    {/* Stats button */}
                    <button className="btn btn-yellow" onClick={() => setView(view === 'list' ? 'stats' : 'list')} style={{whiteSpace: 'nowrap', flexShrink: 0}}>
                        {view === 'list' ? (
                            <><BarChart3 size={16} style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                                marginRight: '4px'
                            }}/>Stats</>
                        ) : (
                            <>Tasks</>
                        )}
                    </button>
                    <button className="btn btn-white" onClick={() => navigate('/settings')} style={{whiteSpace: 'nowrap', flexShrink: 0}}>
                        <Settings size={16}
                                style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                        Settings
                    </button>
                    {onLogout && (
                        <button className="btn btn-white" onClick={onLogout} style={{whiteSpace: 'nowrap', flexShrink: 0}}>
                            <LogOut size={16}
                                    style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TaskHeader;
