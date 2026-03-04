import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, RefreshCw, Search, BookOpen, DollarSign, Upload, TrendingUp, Users, BarChart3, Download, Settings, LogOut } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { FONT_STACK, IOS_BLEND } from '../theme';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import MobileSection from '../../mobile/design/MobileSection';
import MobileRow from '../../mobile/design/MobileRow';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileSidebar = ({ isOpen, onClose, onOpenSearch }) => {
    const navigate = useNavigate();
    const {
        authUser, isAdmin, isSharedUser, isLimitedUser, onLogout,
        setAppView, openNewTaskForm, fetchTasks,
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
        setTimeout(() => { setClosing(false); onClose(); }, 260);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fd = new FormData();
        fd.append('file', file);
        fd.append('transaction_type', 'credit');

        try {
            const res = await fetch(`${API_BASE}/transactions/upload`, {
                method: 'POST',
                headers: getAuthHeaders(false),
                body: fd
            });

            const data = await res.json().catch(() => null);

            if (res.ok) alert(`Successfully uploaded ${data?.transaction_count || '0'} transactions!`);
            else alert(`Error: ${data?.error || 'Upload failed'}`);
        } catch (err) {
            alert(`Error uploading file: ${err?.message || err}`);
        }

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
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.28)',
                    zIndex: 300,
                    opacity: isVisible ? 1 : 0,
                    transition: `opacity 260ms ${SPRING}`
                }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: IOS_BLEND.sidebarWidth,
                    maxWidth: IOS_BLEND.sidebarMaxWidth,
                    background: '#ffffff',
                    boxShadow: '-12px 0 32px rgba(0,0,0,0.14)',
                    zIndex: 301,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    fontFamily: FONT_STACK,
                    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                    transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                    transition: `transform 260ms ${SPRING}`
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px 20px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(0,0,0,0.06)'
                    }}
                >
                    <div>
                        <h2
                            style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                margin: 0,
                                letterSpacing: '-0.01em'
                            }}
                        >
                            Menu
                        </h2>
                        {isAdmin && (
                            <p style={{ fontSize: '0.75rem', color: '#666', margin: '4px 0 0 0' }}>
                                {authUser} · admin
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(0,0,0,0.04)',
                            border: 'none',
                            borderRadius: '12px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} style={{ opacity: 0.75 }} />
                    </button>
                </div>

                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <MobileSection>
                        <MobileRow onClick={() => { openNewTaskForm(); handleClose(); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Plus size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>New Task</span>
                            </div>
                        </MobileRow>

                        <MobileRow onClick={async () => { await fetchTasks(); handleClose(); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <RefreshCw size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Refresh</span>
                            </div>
                        </MobileRow>

                        <MobileRow onClick={() => { onOpenSearch(); handleClose(); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Search size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Search</span>
                            </div>
                        </MobileRow>

                        <MobileRow showDivider={false} onClick={() => nav('notebook')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <BookOpen size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Notebook</span>
                            </div>
                        </MobileRow>
                    </MobileSection>

                    {showFinance && (
                        <MobileSection>
                            <MobileRow onClick={() => nav('transactions')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <DollarSign size={18} style={{ opacity: 0.75 }} />
                                    <span style={{ fontWeight: 600 }}>Bank Transactions</span>
                                </div>
                            </MobileRow>

                            <MobileRow showDivider={false} onClick={() => uploadRef.current?.click()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Upload size={18} style={{ opacity: 0.75 }} />
                                    <span style={{ fontWeight: 600 }}>Upload File</span>
                                </div>
                            </MobileRow>

                            <input
                                ref={uploadRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={handleUpload}
                            />
                        </MobileSection>
                    )}

                    {showFinance && (
                        <MobileSection>
                            <MobileRow showDivider={false} onClick={() => nav('portfolio')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <TrendingUp size={18} style={{ opacity: 0.75 }} />
                                    <span style={{ fontWeight: 600 }}>Stock Portfolio</span>
                                </div>
                            </MobileRow>
                        </MobileSection>
                    )}

                    {showFinance && (
                        <MobileSection>
                            <MobileRow showDivider={false} onClick={() => nav('clients')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Users size={18} style={{ opacity: 0.75 }} />
                                    <span style={{ fontWeight: 600 }}>Clients</span>
                                </div>
                            </MobileRow>
                        </MobileSection>
                    )}

                    <MobileSection>
                        <MobileRow onClick={() => nav('stats')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <BarChart3 size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>View Stats</span>
                            </div>
                        </MobileRow>

                        <MobileRow showDivider={false} onClick={() => { exportToCSV(); handleClose(); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Download size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Export CSV</span>
                            </div>
                        </MobileRow>
                    </MobileSection>

                    <MobileSection>
                        <MobileRow onClick={() => { navigate('/settings'); handleClose(); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Settings size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Settings</span>
                            </div>
                        </MobileRow>

                        <MobileRow
                            showDivider={false}
                            onClick={() => { handleClose(); if (onLogout) onLogout(); }}
                            style={{ color: '#d11a2a' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <LogOut size={18} style={{ opacity: 0.75 }} />
                                <span style={{ fontWeight: 600 }}>Logout</span>
                            </div>
                        </MobileRow>
                    </MobileSection>

                </div>
            </div>
        </>
    );
};

export default MobileSidebar;
