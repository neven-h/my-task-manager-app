import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Search, BookOpen, DollarSign, TrendingUp,
  Users, BarChart3, Download, Settings, LogOut, Upload, ChevronRight
} from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';
const FONT = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

/* ── iOS section header label ─────────────────────────────────────── */
const SectionLabel = ({ children, first }) => (
  <div style={{
    fontSize: '12px',
    fontWeight: 400,
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    padding: first ? '8px 20px 6px' : '20px 20px 6px',
    fontFamily: FONT
  }}>
    {children}
  </div>
);

/* ── White grouped-card container ─────────────────────────────────── */
const SectionCard = ({ children }) => (
  <div style={{
    background: '#fff',
    borderRadius: 12,
    margin: '0 16px',
    overflow: 'hidden'
  }}>
    {children}
  </div>
);

/* ── Single tappable row ──────────────────────────────────────────── */
const Row = ({
  icon: Icon,
  iconBg,
  label,
  onClick,
  destructive = false,
  showDivider = true,
  isAction = false   // action rows: no disclosure chevron
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 14px 0 16px',
          height: 52,
          background: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: `background 120ms ${SPRING}`,
          fontFamily: FONT
        }}
      >
        {/* Rounded-square icon container */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          background: destructive ? '#FF3B30' : (iconBg || '#8E8E93'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={17} color="#fff" strokeWidth={2.2} />
        </div>

        {/* Label */}
        <span style={{
          flex: 1,
          fontSize: '1rem',
          fontWeight: 400,
          color: destructive ? '#FF3B30' : '#000',
          fontFamily: FONT,
          lineHeight: 1
        }}>
          {label}
        </span>

        {/* Disclosure chevron on navigation rows only */}
        {!isAction && !destructive && (
          <ChevronRight size={16} color="#C7C7CC" strokeWidth={2.5} />
        )}
      </button>

      {/* Inset divider — starts after icon column */}
      {showDivider && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 58,   /* 16px padding + 30px icon + 12px gap */
          right: 0,
          height: '0.5px',
          background: 'rgba(0,0,0,0.12)'
        }} />
      )}
    </div>
  );
};

/* ── Main component ───────────────────────────────────────────────── */
const MobileSidebar = ({ isOpen, onClose, onOpenSearch }) => {
  const {
    isAdmin, isSharedUser, isLimitedUser,
    onLogout, setAppView, openNewTaskForm, fetchTasks, exportToCSV
  } = useTaskContext();

  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 260);
  };

  const nav = (view) => { setAppView(view); handleClose(); };

  const showFinance = isAdmin || isSharedUser || isLimitedUser;
  const visible = isOpen && !closing;

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
    handleClose();
    e.target.value = '';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
          transition: `opacity 260ms ${SPRING}`,
          zIndex: 300
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          background: '#F2F2F7',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform 260ms ${SPRING}`,
          zIndex: 301,
          maxHeight: '85vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)'
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 5,
          background: 'rgba(0,0,0,0.18)',
          borderRadius: 3,
          margin: '10px auto 0'
        }} />

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <SectionLabel first>Actions</SectionLabel>
        <SectionCard>
          <Row icon={Plus}      iconBg="#0000FF" label="New Task" isAction
            onClick={() => { openNewTaskForm(); handleClose(); }} showDivider />
          <Row icon={Search}    iconBg="#5856D6" label="Search"   isAction
            onClick={() => { onOpenSearch(); handleClose(); }}   showDivider />
          <Row icon={RefreshCw} iconBg="#8E8E93" label="Refresh"  isAction
            onClick={async () => { await fetchTasks(); handleClose(); }}
            showDivider={false} />
        </SectionCard>

        {/* ── Views ──────────────────────────────────────────────── */}
        <SectionLabel>Views</SectionLabel>
        <SectionCard>
          <Row icon={BookOpen}  iconBg="#34C759" label="Notebook"
            onClick={() => nav('notebook')} showDivider />
          <Row icon={BarChart3} iconBg="#FF9500" label="Stats"
            onClick={() => nav('stats')} showDivider={false} />
        </SectionCard>

        {/* ── Finance (role-gated) ────────────────────────────────── */}
        {showFinance && (
          <>
            <SectionLabel>Finance</SectionLabel>
            <SectionCard>
              <Row icon={DollarSign} iconBg="#30D158" label="Transactions"
                onClick={() => nav('transactions')} showDivider />
              <Row icon={TrendingUp} iconBg="#5856D6" label="Portfolio"
                onClick={() => nav('portfolio')} showDivider />
              <Row icon={Users}      iconBg="#FF9F0A" label="Clients"
                onClick={() => nav('clients')} showDivider />
              <Row icon={Upload}     iconBg="#007AFF" label="Upload Transactions" isAction
                onClick={() => document.getElementById('tx-upload')?.click()}
                showDivider={false} />
              <input id="tx-upload" type="file" accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }} onChange={handleUpload} />
            </SectionCard>
          </>
        )}

        {/* ── More ───────────────────────────────────────────────── */}
        <SectionLabel>More</SectionLabel>
        <SectionCard>
          <Row icon={Download} iconBg="#007AFF" label="Export CSV" isAction
            onClick={() => { exportToCSV(); handleClose(); }} showDivider />
          <Row icon={Settings} iconBg="#8E8E93" label="Settings"
            onClick={() => { handleClose(); window.location.href = '/settings'; }}
            showDivider={false} />
        </SectionCard>

        {/* ── Account ────────────────────────────────────────────── */}
        <SectionLabel>Account</SectionLabel>
        <SectionCard>
          <Row icon={LogOut} label="Logout" destructive isAction
            onClick={() => { handleClose(); onLogout && onLogout(); }}
            showDivider={false} />
        </SectionCard>

        <div style={{ height: 16 }} />
      </div>
    </>
  );
};

export default MobileSidebar;
