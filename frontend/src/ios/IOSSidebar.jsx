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
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                opacity: visible ? 1 : 0, transition: `opacity 260ms ${SPRING}`, zIndex: 300
            }} />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                background: '#F2F2F7', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                transition: `transform 260ms ${SPRING}`,
                zIndex: 301, maxHeight: '85vh', overflowY: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)'
            }}>
                <div style={{ width: 36, height: 5, background: 'rgba(0,0,0,0.18)', borderRadius: 3, margin: '10px auto 0' }} />

                {authUser && (
                    <div style={{
                        margin: '12px 16px 4px', padding: '8px 14px', background: '#fff',
                        borderRadius: 10, fontSize: '0.85rem', color: '#6C6C70', fontFamily: FONT_STACK, fontWeight: 400
                    }}>
                        👤 {authUser}{isAdmin ? ' · admin' : ''}
                        {hasActiveFilters && (
                            <span style={{ marginLeft: 8, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0000FF', verticalAlign: 'middle' }} />
                        )}
                    </div>
                )}

                <SectionLabel first={!authUser}>Actions</SectionLabel>
                <SectionCard>
                    <Row icon={Plus}      iconBg="#0000FF" label="New Task" isAction onClick={() => { openNewTaskForm(); handleClose(); }} showDivider />
                    <Row icon={Search}    iconBg="#5856D6" label="Search"   isAction onClick={() => { onOpenSearch(); handleClose(); }} showDivider />
                    <Row icon={RefreshCw} iconBg="#8E8E93" label="Refresh"  isAction onClick={async () => { await fetchTasks(); handleClose(); }} showDivider={false} />
                </SectionCard>

                <SectionLabel>Views</SectionLabel>
                <SectionCard>
                    <Row icon={BookOpen}  iconBg="#34C759" label="Notebook" onClick={() => nav('notebook')} showDivider />
                    <Row icon={BarChart3} iconBg="#FF9500" label="Stats"    onClick={() => nav('stats')} showDivider={false} />
                </SectionCard>

                {showFinance && (
                    <>
                        <SectionLabel>Finance</SectionLabel>
                        <SectionCard>
                            <Row icon={DollarSign} iconBg="#30D158" label="Transactions" onClick={() => nav('transactions')} showDivider />
                            <Row icon={TrendingUp} iconBg="#5856D6" label="Portfolio"    onClick={() => nav('portfolio')} showDivider />
                            <Row icon={PiggyBank}  iconBg="#34C759" label="Budget"       onClick={() => nav('budget')} showDivider />
                            <Row icon={Users}      iconBg="#FF9F0A" label="Clients"      onClick={() => nav('clients')} showDivider />
                            <Row icon={Upload}     iconBg="#007AFF" label="Upload Transactions" isAction onClick={() => { handleClose(); if (onOpenUpload) onOpenUpload(); }} showDivider={false} />
                        </SectionCard>
                    </>
                )}

                <SectionLabel>More</SectionLabel>
                <SectionCard>
                    <Row icon={Download} iconBg="#007AFF" label="Export CSV" isAction onClick={() => { exportToCSV(); handleClose(); }} showDivider />
                    <Row icon={Settings} iconBg="#8E8E93" label="Settings"   onClick={() => { navigate('/settings'); handleClose(); }} showDivider />
                    <Row icon={Trash2}   iconBg="#FF3B30" label="Trash"      onClick={() => { navigate('/trash'); handleClose(); }} showDivider={false} />
                </SectionCard>

                <SectionLabel>Account</SectionLabel>
                <SectionCard>
                    <Row icon={LogOut} label="Logout" destructive isAction onClick={() => { handleClose(); if (onLogout) onLogout(); }} showDivider={false} />
                </SectionCard>
                <div style={{ height: 16 }} />
            </div>
        </>
    );
};

export default IOSSidebar;
