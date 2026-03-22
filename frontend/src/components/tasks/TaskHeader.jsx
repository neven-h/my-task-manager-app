import React, { useState, useRef, useEffect } from 'react';
import { Filter, Menu, DollarSign, Tag, BarChart3, PiggyBank, BookOpen, Wrench, Settings } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import UserMenuButton from './UserMenuButton';

const ICN = { display: 'inline', verticalAlign: 'middle', marginRight: '4px' };
const NAV_BTN = { whiteSpace: 'nowrap', flexShrink: 0 };

const NAV_ITEMS = [
    { key: 'transactions', label: 'Transactions', icon: DollarSign, btnClass: 'btn-blue' },
    { key: 'clients',      label: 'Clients',      icon: Tag,         btnClass: 'btn-yellow', hideForShared: true },
    { key: 'portfolio',    label: 'Portfolio',    icon: BarChart3,   btnClass: 'btn-green' },
    { key: 'budget',       label: 'Budget',       icon: PiggyBank,   btnClass: 'btn-red',  hideForShared: true },
    { key: 'notebook',     label: 'Notebook',     icon: BookOpen,    btnClass: 'btn-white', hideForShared: true },
    { key: 'renovation',   label: 'Renovation',   icon: Wrench,      btnClass: 'btn-red',  hideForShared: true },
];

const NavCustomizePanel = ({ navVisibility, setNavVisibility, onClose }) => {
    const panelRef = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div ref={panelRef} style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
            background: '#fff', border: '3px solid #000', padding: '16px 20px',
            minWidth: 220, boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
        }}>
            <div style={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Visible Tabs
            </div>
            {NAV_ITEMS.map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input
                        type="checkbox"
                        checked={navVisibility[key] !== false}
                        onChange={e => setNavVisibility(key, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    {label}
                </label>
            ))}
        </div>
    );
};

const TaskHeader = ({ showSidebar, setShowSidebar, setShowMobileMenu, setShowMobileSidebar }) => {
    const {
        isAdmin, isSharedUser, isLimitedUser, authUser,
        view, setView, appView, setAppView, onLogout,
        navVisibility, setNavVisibility,
    } = useTaskContext();

    const [showCustomizer, setShowCustomizer] = useState(false);

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
                    {NAV_ITEMS.map(({ key, label, icon: Icon, btnClass, hideForShared }) => {
                        if (isSharedUser && hideForShared) return null;
                        if (!isAdmin && !isSharedUser && !isLimitedUser && key !== 'renovation') return null;
                        if (navVisibility[key] === false) return null;
                        return (
                            <button key={key} className={`btn ${btnClass}`} onClick={() => setAppView(key)} style={NAV_BTN}>
                                <Icon size={16} style={ICN} />{label}
                            </button>
                        );
                    })}
                    <button className="btn btn-yellow"
                        onClick={() => { setAppView('tasks'); setView(view === 'list' ? 'stats' : 'list'); }}
                        style={NAV_BTN}>
                        <BarChart3 size={16} style={ICN} />Stats
                    </button>
                </div>

                {/* Nav customizer */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button className="btn btn-white" onClick={() => setShowCustomizer(s => !s)} title="Customize navigation"
                        style={{ padding: '8px 10px', minWidth: 'auto' }}>
                        <Settings size={16} />
                    </button>
                    {showCustomizer && (
                        <NavCustomizePanel navVisibility={navVisibility} setNavVisibility={setNavVisibility} onClose={() => setShowCustomizer(false)} />
                    )}
                </div>

                {/* User menu (avatar → Settings + Logout dropdown) */}
                <UserMenuButton authUser={authUser} isAdmin={isAdmin} onLogout={onLogout} />
            </div>
        </header>
    );
};

export default TaskHeader;
