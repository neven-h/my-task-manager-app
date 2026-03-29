import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, RefreshCw, Search, BookOpen, DollarSign, Upload,
    TrendingUp, Users, BarChart3, Download, Settings, LogOut, PiggyBank, Trash2
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { FONT_STACK } from './theme';
import { SectionLabel, SectionCard, Row } from './IOSSidebarRow';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const IOSSidebar = ({ isOpen, onClose, onOpenSearch, onOpenUpload }) => {
    const navigate = useNavigate();
    const { authUser, isAdmin, isSharedUser, isLimitedUser, openNewTaskForm, setAppView, fetchTasks, exportToCSV, onLogout, hasActiveFilters } = useTaskContext();
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 260);
    };

    if (!isOpen && !closing) return null;

    const nav = (view) => { setAppView(view); handleClose(); };
    const showFinance = isAdmin || isSharedUser || isLimitedUser;
    const visible = isOpen && !closing;

    return (
        <>
            <div onClick={handleClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                opacity: visible ? 1 : 0, transition: `opacity 260ms ${SPRING}`, zIndex: 300
            }} />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                background: '#fff', borderRadius: 0, borderTop: '3px solid #000',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                transition: `transform 260ms ${SPRING}`,
                zIndex: 301, maxHeight: '85dvh', overflowY: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)'
            }}>

                {authUser && (
                    <div style={{
                        margin: '12px 16px 4px', padding: '8px 14px', background: '#FFD500',
                        border: '2px solid #000', fontSize: '0.8rem', color: '#000', fontFamily: FONT_STACK, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.4px'
                    }}>
                        {authUser}{isAdmin ? ' · admin' : ''}
                        {hasActiveFilters && (
                            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#0000FF', fontWeight: 700 }}>FILTERS ON</span>
                        )}
                    </div>
                )}

                <SectionLabel first={!authUser}>Actions</SectionLabel>
                <SectionCard>
                    <Row icon={Plus}     label="New Task" onClick={() => { openNewTaskForm(); handleClose(); }} showDivider />
                    <Row icon={Search}    label="Search"   onClick={() => { onOpenSearch(); handleClose(); }} showDivider />
                    <Row icon={RefreshCw} label="Refresh"  onClick={async () => { await fetchTasks(); handleClose(); }} showDivider={false} />
                </SectionCard>

                <SectionLabel>Views</SectionLabel>
                <SectionCard>
                    <Row icon={BookOpen}  label="Notebook" onClick={() => nav('notebook')} showDivider />
                    <Row icon={BarChart3} label="Stats"    onClick={() => nav('stats')} showDivider={false} />
                </SectionCard>

                {showFinance && (
                    <>
                        <SectionLabel>Finance</SectionLabel>
                        <SectionCard>
                            <Row icon={DollarSign} label="Transactions" onClick={() => nav('transactions')} showDivider />
                            <Row icon={TrendingUp} label="Portfolio"    onClick={() => nav('portfolio')} showDivider />
                            <Row icon={PiggyBank}  label="Budget"       onClick={() => nav('budget')} showDivider />
                            <Row icon={Users}      label="Clients"      onClick={() => nav('clients')} showDivider />
                            <Row icon={Upload}     label="Upload Transactions" onClick={() => { handleClose(); if (onOpenUpload) onOpenUpload(); }} showDivider={false} />
                        </SectionCard>
                    </>
                )}

                <SectionLabel>More</SectionLabel>
                <SectionCard>
                    <Row icon={Download} label="Export CSV" onClick={() => { exportToCSV(); handleClose(); }} showDivider />
                    <Row icon={Settings} label="Settings"   onClick={() => { navigate('/settings'); handleClose(); }} showDivider />
                    <Row icon={Trash2}   label="Trash"      onClick={() => { navigate('/trash'); handleClose(); }} showDivider={false} />
                </SectionCard>

                <SectionLabel>Account</SectionLabel>
                <SectionCard>
                    <Row icon={LogOut} label="Logout" destructive onClick={() => { handleClose(); if (onLogout) onLogout(); }} showDivider={false} />
                </SectionCard>
                <div style={{ height: 16 }} />
            </div>
        </>
    );
};

export default IOSSidebar;
