import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Save } from 'lucide-react';
import TabBarItem from './TabBarItem';

export default function TabBar({
    tabs, activeTabId, apiBase, tabEndpoint,
    getAuthHeaders, onTabCreated, onTabDeleted, onTabSwitched, onTabsChanged, onError,
    colors, deleteConfirmMessage
}) {
    const [showNewTabInput, setShowNewTabInput] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [editingTab, setEditingTab] = useState(null);
    const [editingTabName, setEditingTabName] = useState('');
    const [tabMenuOpen, setTabMenuOpen] = useState(null);
    const tabMenuRef = useRef(null);

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
            const headers = getAuthHeaders ? getAuthHeaders() : {};
            const response = await fetch(`${apiBase}/${tabEndpoint}`, { headers });
            const data = await response.json();
            if (Array.isArray(data)) { onTabsChanged(data); return data; }
            onTabsChanged([]);
            return [];
        } catch (err) {
            console.error('Error fetching tabs:', err);
            onTabsChanged([]);
            return [];
        }
    };

    const handleCreateTab = async () => {
        if (!newTabName.trim()) return;
        try {
            const headers = getAuthHeaders ? { ...getAuthHeaders(), 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
            const response = await fetch(`${apiBase}/${tabEndpoint}`, { method: 'POST', headers, body: JSON.stringify({ name: newTabName.trim() }) });
            const data = await response.json();
            if (response.ok) {
                setNewTabName('');
                setShowNewTabInput(false);
                const updatedTabs = await fetchTabs();
                onTabCreated(data.id, updatedTabs);
            } else {
                onError(data.error || 'Failed to create tab');
            }
        } catch (err) {
            onError('Failed to create tab - server may be unavailable');
        }
    };

    const handleRenameTab = async (tabId) => {
        if (!editingTabName.trim()) return;
        try {
            const headers = getAuthHeaders ? { ...getAuthHeaders(), 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
            const response = await fetch(`${apiBase}/${tabEndpoint}/${tabId}`, { method: 'PUT', headers, body: JSON.stringify({ name: editingTabName.trim() }) });
            if (response.ok) { setEditingTab(null); setEditingTabName(''); await fetchTabs(); }
            else { onError('Failed to rename tab'); }
        } catch (err) {
            onError('Failed to rename tab');
        }
    };

    const handleDeleteTab = async (tabId) => {
        const tab = tabs.find(t => t.id == tabId);
        const message = deleteConfirmMessage ? deleteConfirmMessage(tab?.name) : `Delete "${tab?.name}" and all its data?`;
        if (!window.confirm(message)) return;
        try {
            const headers = getAuthHeaders ? getAuthHeaders() : {};
            const response = await fetch(`${apiBase}/${tabEndpoint}/${tabId}`, { method: 'DELETE', headers });
            if (response.ok) {
                const updatedTabs = await fetchTabs();
                setTabMenuOpen(null);
                onTabDeleted(tabId, updatedTabs);
            } else { onError('Failed to delete tab'); }
        } catch (err) {
            onError('Failed to delete tab');
        }
    };

    // eslint-disable-next-line eqeqeq
    const isActive = (tabId) => activeTabId == tabId;

    return (
        <div className="tab-bar" style={{ background: '#f8f8f8', borderBottom: `3px solid ${colors.border}`, padding: '0', display: 'flex', alignItems: 'stretch', overflowX: 'auto', minHeight: '48px' }}>
            {tabs.map(tab => (
                <TabBarItem
                    key={tab.id}
                    tab={tab}
                    isActive={isActive(tab.id)}
                    // eslint-disable-next-line eqeqeq
                    isEditing={editingTab == tab.id}
                    editingTabName={editingTabName}
                    setEditingTabName={setEditingTabName}
                    // eslint-disable-next-line eqeqeq
                    tabMenuOpen={tabMenuOpen == tab.id}
                    onSwitchTab={onTabSwitched}
                    onStartEdit={(id, name) => { setEditingTab(id); setEditingTabName(name); setTabMenuOpen(null); }}
                    onCancelEdit={() => { setEditingTab(null); setEditingTabName(''); }}
                    onRenameTab={handleRenameTab}
                    onDeleteTab={handleDeleteTab}
                    onToggleMenu={(id) => setTabMenuOpen(tabMenuOpen == id ? null : id)}
                    tabMenuRef={tabMenuRef}
                    colors={colors}
                />
            ))}

            {showNewTabInput ? (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.25rem' }}>
                    <input
                        type="text" value={newTabName} onChange={(e) => setNewTabName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTab(); if (e.key === 'Escape') { setShowNewTabInput(false); setNewTabName(''); } }}
                        placeholder="Tab name..." autoFocus
                        style={{ padding: '0.35rem 0.5rem', border: `2px solid ${colors.primary}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', width: '140px' }}
                    />
                    <button onClick={handleCreateTab} disabled={!newTabName.trim()} style={{ background: newTabName.trim() ? colors.success : '#ccc', border: 'none', color: '#fff', padding: '0.35rem', cursor: newTabName.trim() ? 'pointer' : 'not-allowed', display: 'flex' }}>
                        <Save size={14} />
                    </button>
                    <button onClick={() => { setShowNewTabInput(false); setNewTabName(''); }} style={{ background: colors.accent, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowNewTabInput(true)}
                    style={{ padding: '0.75rem 1rem', border: 'none', borderBottom: '4px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: colors.textLight, fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', transition: 'color 0.15s ease' }}
                    onMouseEnter={(e) => e.target.style.color = colors.primary}
                    onMouseLeave={(e) => e.target.style.color = colors.textLight}
                >
                    <Plus size={16} /> Add Tab
                </button>
            )}
        </div>
    );
}
