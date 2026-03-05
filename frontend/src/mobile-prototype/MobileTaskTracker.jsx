import React, { useEffect, useState } from 'react';
import {
    Plus,
    RefreshCw,
    Search,
    BookOpen,
    DollarSign,
    TrendingUp,
    Users,
    BarChart3,
    Download,
    Settings,
    LogOut,
    Upload
} from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const Row = ({ icon: Icon, label, onClick, destructive }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 4px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            fontSize: '1rem',
            fontWeight: 500,
            color: destructive ? '#FF3B30' : '#000',
            cursor: 'pointer'
        }}
    >
        <Icon size={20} />
        {label}
    </button>
);

const MobileSidebar = ({ isOpen, onClose, onOpenSearch }) => {
    const {
        isAdmin,
        isSharedUser,
        isLimitedUser,
        onLogout,
        setAppView,
        openNewTaskForm,
        fetchTasks,
        exportToCSV
    } = useTaskContext();

    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) setClosing(false);
    }, [isOpen]);

    if (!isOpen && !closing) return null;

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 260);
    };

    const nav = (view) => {
        setAppView(view);
        handleClose();
    };

    const showFinance = isAdmin || isSharedUser || isLimitedUser;
    const visible = isOpen && !closing;

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('transaction_type', 'credit');
        await fetch(`${API_BASE}/transactions/upload`, {
            method: 'POST',
            headers: getAuthHeaders(false),
            body: fd
        });
        handleClose();
        e.target.value = '';
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(4px)',
                    opacity: visible ? 1 : 0,
                    transition: `opacity 260ms ${SPRING}`,
                    zIndex: 300
                }}
            />

            {/* Bottom Sheet */}
            <div
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#fff',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
                    transform: visible ? 'translateY(0)' : 'translateY(100%)',
                    transition: `transform 260ms ${SPRING}`,
                    zIndex: 301,
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    paddingBottom: 'env(safe-area-inset-bottom)'
                }}
            >
                {/* Grabber */}
                <div
                    style={{
                        width: '40px',
                        height: '5px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '3px',
                        margin: '10px auto 16px'
                    }}
                />

                <div style={{ padding: '0 20px 24px' }}>
                    <Row icon={Plus} label="New Task" onClick={() => { openNewTaskForm(); handleClose(); }} />
                    <Row icon={RefreshCw} label="Refresh" onClick={async () => { await fetchTasks(); handleClose(); }} />
                    <Row icon={Search} label="Search" onClick={() => { onOpenSearch(); handleClose(); }} />
                    <Row icon={BookOpen} label="Notebook" onClick={() => nav('notebook')} />

                    {showFinance && (
                        <>
                            <Row icon={DollarSign} label="Transactions" onClick={() => nav('transactions')} />
                            <Row icon={Upload} label="Upload Transactions" onClick={() => document.getElementById('tx-upload')?.click()} />
                            <input
                                id="tx-upload"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={handleUpload}
                            />
                            <Row icon={TrendingUp} label="Portfolio" onClick={() => nav('portfolio')} />
                            <Row icon={Users} label="Clients" onClick={() => nav('clients')} />
                        </>
                    )}

                    <Row icon={BarChart3} label="Stats" onClick={() => nav('stats')} />
                    <Row icon={Download} label="Export CSV" onClick={() => { exportToCSV(); handleClose(); }} />
                    <Row icon={Settings} label="Settings" onClick={() => { handleClose(); window.location.href = '/settings'; }} />
                    <Row icon={LogOut} label="Logout" destructive onClick={() => { handleClose(); onLogout && onLogout(); }} />
                </div>
            </div>
        </>
    );
};

export default MobileSidebar;
