import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, RefreshCw, Search, BookOpen, DollarSign, Upload, TrendingUp, Users, BarChart3, Download, Settings, LogOut } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { FONT_STACK, IOS_BLEND } from '../theme';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import { SectionTitle, GroupedItem } from './SidebarHelpers';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileSidebar = ({ isOpen, onClose, onOpenSearch }) => {
    const navigate = useNavigate();
    const {
        authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,
        setAppView, openNewTaskForm, fetchTasks, tasks,
        hasActiveFilters, exportToCSV
    } = useTaskContext();
    const uploadRef = useRef(null);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) setClosing(false);
    }, [isOpen]);

    if (!isOpen && !closing) return null;

    const nav = (view) => { setAppView(view); handleClose(); };

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 300);
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
    const isVisible = isOpen && !closing;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', zIndex: 300,
                    opacity: isVisible ? 1 : 0,
                    transition: `opacity 300ms ${SPRING}`
                }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: IOS_BLEND.sidebarWidth, maxWidth: IOS_BLEND.sidebarMaxWidth,
                    background: '#f2f2f7',
                    boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
                    zIndex: 301, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                    fontFamily: FONT_STACK,
                    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                    transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                    transition: `transform 300ms ${SPRING}`
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0' }}>Menu</h2>
                        {isAdmin && <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{authUser} (admin)</p>}
                    </div>
                    <button onClick={handleClose} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '4px' }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <SectionTitle>Quick Actions</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={Plus} label="New Task" color="#0000FF" onClick={() => { openNewTaskForm(); handleClose(); }} />
                            <GroupedItem icon={RefreshCw} label="Refresh" onClick={async () => { await fetchTasks(); handleClose(); }} />
                            <GroupedItem icon={Search} label="Search" badge={hasActiveFilters}
                                onClick={() => { onOpenSearch(); setClosing(true); setTimeout(() => { setClosing(false); }, 300); }} />
                            <GroupedItem icon={BookOpen} label="Notebook" onClick={() => nav('notebook')} />
                        </div>
                    </div>

                    {showFinance && (
                        <div>
                            <SectionTitle>Bank Transactions</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={DollarSign} label="View Transactions" onClick={() => nav('transactions')} />
                                <GroupedItem icon={Upload} label="Upload File" onClick={() => uploadRef.current?.click()} />
                                <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload} />
                            </div>
                        </div>
                    )}

                    {showFinance && (
                        <div>
                            <SectionTitle>Stock Portfolio</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={TrendingUp} label="View Portfolio" onClick={() => nav('portfolio')} />
                            </div>
                        </div>
                    )}

                    {showFinance && (
                        <div>
                            <SectionTitle>Clients</SectionTitle>
                            <div className="ios-grouped-section">
                                <GroupedItem icon={Users} label="Manage Clients" onClick={() => nav('clients')} />
                            </div>
                        </div>
                    )}

                    <div>
                        <SectionTitle>Analytics</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={BarChart3} label="View Stats" onClick={() => nav('stats')} />
                            <GroupedItem icon={Download} label="Export CSV" onClick={() => { exportToCSV(); handleClose(); }} />
                        </div>
                    </div>

                    <div>
                        <SectionTitle>Account</SectionTitle>
                        <div className="ios-grouped-section">
                            <GroupedItem icon={Settings} label="Settings" onClick={() => { navigate('/settings'); handleClose(); }} />
                            <GroupedItem icon={LogOut} label="Logout" destructive onClick={() => { handleClose(); if (onLogout) onLogout(); }} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileSidebar;
