import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, RefreshCw, Search, BookOpen, DollarSign, Upload, TrendingUp, Users, BarChart3, Download, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { FONT_STACK, IOS_BLEND } from '../theme';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SectionTitle = ({ children }) => (
    <h3 style={{
        fontSize: '0.7rem',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
        color: '#999',
        fontFamily: FONT_STACK,
        paddingLeft: '4px'
    }}>
        {children}
    </h3>
);

const GroupedItem = ({ icon: Icon, label, onClick, badge, color, destructive }) => (
    <button
        className="ios-grouped-item"
        onClick={onClick}
        style={{
            width: '100%',
            border: 'none',
            fontFamily: FONT_STACK,
            fontSize: '1rem',
            fontWeight: 500,
            color: destructive ? '#FF3B30' : '#000',
            position: 'relative',
            textAlign: 'left'
        }}
    >
        <Icon size={20} color={color || (destructive ? '#FF3B30' : '#666')} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
            <span style={{
                background: '#FF0000',
                borderRadius: '50%',
                width: '8px',
                height: '8px',
                display: 'inline-block',
                flexShrink: 0
            }} />
        )}
        <ChevronRight size={16} color="#C7C7CC" style={{ flexShrink: 0 }} />
    </button>
);

const MobileSidebar = ({ isOpen, onClose, onOpenSearch }) => {
    const navigate = useNavigate();
    const {
        authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,
        setAppView, openNewTaskForm, fetchTasks, tasks,
        hasActiveFilters, exportToCSV
    } = useTaskContext();
    const uploadRef = useRef(null);
    const [closing, setClosing] = useState(false);

    // Reset closing state when sidebar opens
    useEffect(() => {
        if (isOpen) setClosing(false);
    }, [isOpen]);

    if (!isOpen && !closing) return null;

    const nav = (view) => { setAppView(view); handleClose(); };

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 300);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('transaction_type', 'credit');
        try {
            const res = await fetch(`${API_BASE}/transactions/upload`, { method: 'POST', headers: getAuthHeaders(false), body: fd });
            const data = await res.json().catch(() => null);
            if (res.ok) alert(`Successfully uploaded ${data?.transaction_count || '0'} transactions!`);
            else alert(`Error: ${data?.error || 'Upload failed'}`);
        } catch (err) { alert(`Error uploading file: ${err?.message || err}`); }
        handleClose();
        e.target.value = '';
    };

    const showFinance = isAdmin || isSharedUser || isLimitedUser;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', zIndex: 300,
                    opacity: closing ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                className={closing ? 'sidebar-slide-out' : 'sidebar-slide-in'}
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: IOS_BLEND.sidebarWidth, maxWidth: IOS_BLEND.sidebarMaxWidth,
                    background: '#f2f2f7', /* iOS system background */
                    borderLeft: '3px solid #000', /* Brutalist accent */
                    zIndex: 301,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    fontFamily: FONT_STACK,
                    paddingBottom: 'max(24px, env(safe-area-inset-bottom))'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 20px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                            Menu
                        </h2>
                        {isAdmin && (
                            <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                                {authUser} (admin)
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(0,0,0,0.06)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginTop: '4px'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Quick Actions */}
                    <div>
                        <SectionTitle>Quick Actions</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={Plus} label="New Task" color="#0000FF"
                                onClick={() => { openNewTaskForm(); handleClose(); }} />
                            <GroupedItem icon={RefreshCw} label="Refresh"
                                onClick={async () => { await fetchTasks(); handleClose(); }} />
                            <GroupedItem icon={Search} label="Search" badge={hasActiveFilters}
                                onClick={() => { onOpenSearch(); setClosing(true); setTimeout(() => { setClosing(false); }, 300); }} />
                            <GroupedItem icon={BookOpen} label="Notebook" onClick={() => nav('notebook')} />
                        </div>
                    </div>

                    {/* Bank Transactions */}
                    {showFinance && (
                        <div>
                            <SectionTitle>Bank Transactions</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={DollarSign} label="View Transactions" onClick={() => nav('transactions')} />
                                <GroupedItem icon={Upload} label="Upload File"
                                    onClick={() => uploadRef.current?.click()} />
                                <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload} />
                            </div>
                        </div>
                    )}

                    {/* Stock Portfolio */}
                    {showFinance && (
                        <div>
                            <SectionTitle>Stock Portfolio</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={TrendingUp} label="View Portfolio" onClick={() => nav('portfolio')} />
                            </div>
                        </div>
                    )}

                    {/* Clients */}
                    {showFinance && (
                        <div>
                            <SectionTitle>Clients</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={Users} label="Manage Clients" onClick={() => nav('clients')} />
                            </div>
                        </div>
                    )}

                    {/* Analytics */}
                    <div>
                        <SectionTitle>Analytics</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={BarChart3} label="View Stats" onClick={() => nav('stats')} />
                            <GroupedItem icon={Download} label="Export CSV"
                                onClick={() => { exportToCSV(); handleClose(); }} />
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <SectionTitle>Account</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={Settings} label="Settings"
                                onClick={() => { navigate('/settings'); handleClose(); }} />
                            <GroupedItem icon={LogOut} label="Logout" destructive
                                onClick={() => { handleClose(); if (onLogout) onLogout(); }} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileSidebar;
