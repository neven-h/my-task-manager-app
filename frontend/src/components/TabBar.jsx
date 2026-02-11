import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Users, Save, MoreVertical } from 'lucide-react';

/**
 * Shared tab bar component used by StockPortfolio and BankTransactions.
 *
 * Props:
 *  - tabs: array of { id, name }
 *  - activeTabId: currently selected tab id
 *  - apiBase: API base URL (e.g. from config)
 *  - tabEndpoint: API path segment for tabs (e.g. "portfolio-tabs" or "transaction-tabs")
 *  - authUser: current username
 *  - onTabCreated(newTabId, updatedTabs): called after a tab is created
 *  - onTabDeleted(deletedTabId, updatedTabs): called after a tab is deleted
 *  - onTabSwitched(tabId): called when user clicks a tab
 *  - onTabsChanged(updatedTabs): called after tabs are fetched/updated
 *  - onError(message): called on error
 *  - colors: theme colors object { primary, success, accent, text, textLight, border }
 *  - deleteConfirmMessage(tabName): returns the confirmation string for delete
 */
export default function TabBar({
  tabs,
  activeTabId,
  apiBase,
  tabEndpoint,
  authUser,
  authRole,
  onTabCreated,
  onTabDeleted,
  onTabSwitched,
  onTabsChanged,
  onError,
  colors,
  deleteConfirmMessage
}) {
  const [showNewTabInput, setShowNewTabInput] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTab, setEditingTab] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [tabMenuOpen, setTabMenuOpen] = useState(null);
  const tabMenuRef = useRef(null);

  // Close tab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target)) {
        setTabMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTabs = async () => {
    try {
      const url = `${apiBase}/${tabEndpoint}?username=${authUser}&role=${authRole}`;
      console.log('[TabBar] Fetching tabs from:', url);
      const response = await fetch(url);
      console.log('[TabBar] Fetch response status:', response.status);
      const data = await response.json();
      console.log('[TabBar] Fetched tabs:', data);
      if (Array.isArray(data)) {
        onTabsChanged(data);
        return data;
      }
      console.warn('[TabBar] Response is not an array:', data);
      onTabsChanged([]);
      return [];
    } catch (err) {
      console.error('[TabBar] Error fetching tabs:', err);
      onTabsChanged([]);
      return [];
    }
  };

  const handleCreateTab = async () => {
    if (!newTabName.trim()) return;
    try {
      const url = `${apiBase}/${tabEndpoint}`;
      const payload = { name: newTabName.trim(), username: authUser };
      console.log('[TabBar] Creating tab at:', url, 'with payload:', payload);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('[TabBar] Create response status:', response.status);
      const data = await response.json();
      console.log('[TabBar] Create response data:', data);
      if (response.ok) {
        setNewTabName('');
        setShowNewTabInput(false);
        const updatedTabs = await fetchTabs();
        onTabCreated(data.id, updatedTabs);
      } else {
        console.error('[TabBar] Create tab failed:', data.error);
        onError(data.error || 'Failed to create tab');
      }
    } catch (err) {
      console.error('[TabBar] Create tab error:', err);
      onError('Failed to create tab - server may be unavailable');
    }
  };

  const handleRenameTab = async (tabId) => {
    if (!editingTabName.trim()) return;
    try {
      const url = `${apiBase}/${tabEndpoint}/${tabId}`;
      const payload = { name: editingTabName.trim() };
      console.log('[TabBar] Renaming tab at:', url, 'with payload:', payload);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('[TabBar] Rename response status:', response.status);
      if (response.ok) {
        setEditingTab(null);
        setEditingTabName('');
        await fetchTabs();
      } else {
        const data = await response.json();
        console.error('[TabBar] Rename tab failed:', data.error);
        onError(data.error || 'Failed to rename tab');
      }
    } catch (err) {
      console.error('[TabBar] Rename tab error:', err);
      onError('Failed to rename tab');
    }
  };

  const handleDeleteTab = async (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    const message = deleteConfirmMessage
      ? deleteConfirmMessage(tab?.name)
      : `Delete "${tab?.name}" and all its data?`;
    if (!window.confirm(message)) return;
    try {
      const url = `${apiBase}/${tabEndpoint}/${tabId}`;
      console.log('[TabBar] Deleting tab at:', url);
      const response = await fetch(url, {
        method: 'DELETE'
      });
      console.log('[TabBar] Delete response status:', response.status);
      if (response.ok) {
        const updatedTabs = await fetchTabs();
        setTabMenuOpen(null);
        onTabDeleted(tabId, updatedTabs);
      } else {
        const data = await response.json();
        console.error('[TabBar] Delete tab failed:', data.error);
        onError(data.error || 'Failed to delete tab');
      }
    } catch (err) {
      console.error('[TabBar] Delete tab error:', err);
      onError('Failed to delete tab');
    }
  };

  return (
    <div className="tab-bar" style={{
      background: '#f8f8f8',
      borderBottom: `3px solid ${colors.border}`,
      padding: '0',
      display: 'flex',
      alignItems: 'stretch',
      overflowX: 'auto',
      minHeight: '48px'
    }}>
      {tabs.map(tab => (
        <div key={tab.id} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
          {editingTab === tab.id ? (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.25rem' }}>
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameTab(tab.id);
                  if (e.key === 'Escape') { setEditingTab(null); setEditingTabName(''); }
                }}
                autoFocus
                style={{
                  padding: '0.35rem 0.5rem',
                  border: `2px solid ${colors.primary}`,
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", sans-serif',
                  width: '120px'
                }}
              />
              <button
                onClick={() => handleRenameTab(tab.id)}
                style={{ background: colors.success, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}
              >
                <Save size={14} />
              </button>
              <button
                onClick={() => { setEditingTab(null); setEditingTabName(''); }}
                style={{ background: colors.accent, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onTabSwitched(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: activeTabId === tab.id ? `4px solid ${colors.primary}` : '4px solid transparent',
                background: activeTabId === tab.id ? '#fff' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeTabId === tab.id ? '700' : '500',
                fontSize: '0.95rem',
                color: activeTabId === tab.id ? colors.primary : colors.text,
                fontFamily: '"Inter", sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={16} />
              {tab.name}
            </button>
          )}

          {/* 3-dot menu button - visible on active tab */}
          {activeTabId === tab.id && editingTab !== tab.id && (
            <button
              onClick={(e) => { e.stopPropagation(); setTabMenuOpen(tabMenuOpen === tab.id ? null : tab.id); }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0.5rem',
                display: 'flex',
                alignItems: 'center',
                color: colors.textLight
              }}
            >
              <MoreVertical size={16} />
            </button>
          )}

          {/* Context menu dropdown */}
          {tabMenuOpen === tab.id && (
            <div ref={tabMenuRef} style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              border: `2px solid ${colors.border}`,
              zIndex: 100,
              minWidth: '140px',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.15)'
            }}>
              <button
                onClick={() => { setEditingTab(tab.id); setEditingTabName(tab.name); setTabMenuOpen(null); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  border: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.background = '#fff'}
              >
                <Edit2 size={14} /> Rename
              </button>
              <button
                onClick={() => handleDeleteTab(tab.id)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  border: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", sans-serif',
                  color: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.background = '#fff0f0'}
                onMouseLeave={(e) => e.target.style.background = '#fff'}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add new tab */}
      {showNewTabInput ? (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.25rem' }}>
          <input
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateTab();
              if (e.key === 'Escape') { setShowNewTabInput(false); setNewTabName(''); }
            }}
            placeholder="Tab name..."
            autoFocus
            style={{
              padding: '0.35rem 0.5rem',
              border: `2px solid ${colors.primary}`,
              fontSize: '0.9rem',
              fontFamily: '"Inter", sans-serif',
              width: '140px'
            }}
          />
          <button
            onClick={handleCreateTab}
            disabled={!newTabName.trim()}
            style={{
              background: newTabName.trim() ? colors.success : '#ccc',
              border: 'none',
              color: '#fff',
              padding: '0.35rem',
              cursor: newTabName.trim() ? 'pointer' : 'not-allowed',
              display: 'flex'
            }}
          >
            <Save size={14} />
          </button>
          <button
            onClick={() => { setShowNewTabInput(false); setNewTabName(''); }}
            style={{ background: colors.accent, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewTabInput(true)}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            borderBottom: '4px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: colors.textLight,
            fontFamily: '"Inter", sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.target.style.color = colors.primary}
          onMouseLeave={(e) => e.target.style.color = colors.textLight}
        >
          <Plus size={16} /> Add Tab
        </button>
      )}
    </div>
  );
}
