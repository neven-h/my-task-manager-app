import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, Plus, RefreshCw, Search, BookOpen, DollarSign, Upload,
    TrendingUp, Users, BarChart3, Download, Settings, LogOut
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import { THEME, FONT_STACK } from './theme';

const SectionTitle = ({ children }) => (
    <h3 style={{
        fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '1px', marginBottom: '12px', fontFamily: FONT_STACK
    }}>
        {children}
    </h3>
);

const IOSSidebar = ({ isOpen, onClose, onOpenSearch }) => {
    const navigate = useNavigate();
    const {
        authUser, isAdmin, isSharedUser, isLimitedUser,
        openNewTaskForm, setAppView, fetchTasks, tasks, exportToCSV, onLogout
    } = useTaskContext();
    const uploadRef = useRef(null);
    const hasFilters = useTaskContext().hasActiveFilters;

    if (!isOpen) return null;

    const nav = (view) => { setAppView(view); onClose(); };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('transaction_type', 'credit');
        try {
            const res = await fetch(`${API_BASE}/transactions/upload`, {
                method: 'POST', headers: getAuthHeaders(false), body: fd
            });
            const data = await res.json().catch(() => null);
            if (res.ok) alert(`Successfully uploaded ${data?.transaction_count || '0'} transactions!`);
            else alert(`Error: ${data?.error || 'Upload failed'}`);
        } catch (err) {
            alert(`Error uploading file: ${err?.message || err}`);
        }
        onClose();
        e.target.value = '';
    };

    return (
        <>
            {/* Overlay */}
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
                onClick={onClose}
            />

            {/* Sidebar panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '85%', maxWidth: '350px',
                background: '#fff', borderLeft: '3px solid #000', zIndex: 301,
                overflowY: 'auto', padding: '24px', fontFamily: FONT_STACK
            }}>
                {/* Close */}
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                    <X size={24} color={THEME.text} />
                </button>

                {/* User info */}
                <div style={{ marginBottom: '32px', paddingTop: '8px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 8px 0', textTransform: 'uppercase', fontFamily: FONT_STACK }}>Menu</h2>
                    {isAdmin && <p style={{ fontSize: '0.85rem', color: THEME.muted, margin: 0, fontFamily: FONT_STACK }}>👤 {authUser} (admin)</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Quick Actions */}
                    <div>
                        <SectionTitle>Quick Actions</SectionTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="mobile-btn mobile-btn-primary" onClick={() => { openNewTaskForm(); onClose(); }} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <Plus size={16} style={{ marginRight: '8px' }} /> New Task
                            </button>
                            <button className="mobile-btn" onClick={async () => { await fetchTasks(); onClose(); }} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <RefreshCw size={16} style={{ marginRight: '8px' }} /> Refresh
                            </button>
                            <button className="mobile-btn" onClick={() => { onOpenSearch(); onClose(); }} style={{ width: '100%', justifyContent: 'flex-start', position: 'relative' }}>
                                <Search size={16} style={{ marginRight: '8px' }} /> Search
                                {hasFilters && (
                                    <span style={{ position: 'absolute', top: '6px', right: '10px', background: THEME.accent, color: '#fff', borderRadius: '50%', width: '8px', height: '8px', display: 'inline-block' }} />
                                )}
                            </button>
                            <button className="mobile-btn" onClick={() => nav('notebook')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <BookOpen size={16} style={{ marginRight: '8px' }} /> Notebook
                            </button>
                        </div>
                    </div>

                    {/* Bank Transactions */}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <div>
                            <SectionTitle>Bank Transactions</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button className="mobile-btn" onClick={() => nav('transactions')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                    <DollarSign size={16} style={{ marginRight: '8px' }} /> View Transactions
                                </button>
                                <button className="mobile-btn" onClick={() => uploadRef.current?.click()} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                    <Upload size={16} style={{ marginRight: '8px' }} /> Upload File
                                </button>
                                <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload} />
                            </div>
                        </div>
                    )}

                    {/* Stock Portfolio */}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <div>
                            <SectionTitle>Stock Portfolio</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button className="mobile-btn" onClick={() => nav('portfolio')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                    <TrendingUp size={16} style={{ marginRight: '8px' }} /> View Portfolio
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Clients */}
                    {(isAdmin || isSharedUser || isLimitedUser) && (
                        <div>
                            <SectionTitle>Clients</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button className="mobile-btn" onClick={() => nav('clients')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                    <Users size={16} style={{ marginRight: '8px' }} /> Manage Clients
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Analytics */}
                    <div>
                        <SectionTitle>Analytics</SectionTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="mobile-btn" onClick={() => nav('stats')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <BarChart3 size={16} style={{ marginRight: '8px' }} /> View Stats
                            </button>
                        </div>
                    </div>

                    {/* Export / Import */}
                    <div>
                        <SectionTitle>Export / Import</SectionTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="mobile-btn" onClick={() => { exportToCSV(); onClose(); }} disabled={tasks.length === 0} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                <Download size={16} style={{ marginRight: '8px' }} /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <SectionTitle>Account</SectionTitle>
                        <button className="mobile-btn mobile-btn-accent" onClick={() => { navigate('/settings'); onClose(); }} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '12px' }}>
                            <Settings size={16} style={{ marginRight: '8px' }} /> Settings
                        </button>
                        <button className="mobile-btn mobile-btn-accent" onClick={() => { onClose(); if (onLogout) onLogout(); }} style={{ width: '100%', justifyContent: 'flex-start' }}>
                            <LogOut size={16} style={{ marginRight: '8px' }} /> Logout
                        </button>
                    </div>
                </div>

                <button className="mobile-btn" onClick={onClose} style={{ width: '100%', marginTop: '32px' }}>
                    Close Menu
                </button>
            </div>
        </>
    );
};

export default IOSSidebar;
