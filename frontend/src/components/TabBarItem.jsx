import React from 'react';
import { Edit2, Trash2, X, Users, Save, MoreVertical } from 'lucide-react';

const TabBarItem = ({
    tab, isActive, isEditing, editingTabName, setEditingTabName, tabMenuOpen,
    onSwitchTab, onStartEdit, onCancelEdit, onRenameTab, onDeleteTab, onToggleMenu,
    tabMenuRef, colors
}) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
        {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.25rem' }}>
                <input
                    type="text"
                    value={editingTabName}
                    onChange={(e) => setEditingTabName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameTab(tab.id);
                        if (e.key === 'Escape') onCancelEdit();
                    }}
                    autoFocus
                    style={{ padding: '0.35rem 0.5rem', border: `2px solid ${colors.primary}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', width: '120px' }}
                />
                <button onClick={() => onRenameTab(tab.id)} style={{ background: colors.success, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}>
                    <Save size={14} />
                </button>
                <button onClick={onCancelEdit} style={{ background: colors.accent, border: 'none', color: '#fff', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}>
                    <X size={14} />
                </button>
            </div>
        ) : (
            <button
                onClick={() => onSwitchTab(tab.id)}
                style={{ padding: '0.75rem 1.25rem', border: 'none', borderBottom: isActive ? `4px solid ${colors.primary}` : '4px solid transparent', background: isActive ? '#fff' : 'transparent', cursor: 'pointer', fontWeight: isActive ? '700' : '500', fontSize: '0.95rem', color: isActive ? colors.primary : colors.text, fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
            >
                <Users size={16} />
                {tab.name}
            </button>
        )}

        {!isEditing && (
            <>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleMenu(tab.id); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0.25rem', display: 'flex', alignItems: 'center', color: isActive ? colors.text : colors.textLight }}
                    title="Rename tab"
                >
                    <MoreVertical size={16} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTab(tab.id); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0.4rem', display: 'flex', alignItems: 'center', color: colors.accent, fontSize: '1rem', lineHeight: 1 }}
                    title="Delete tab"
                >
                    <Trash2 size={14} />
                </button>
            </>
        )}

        {tabMenuOpen && (
            <div ref={tabMenuRef} style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', border: `2px solid ${colors.border}`, zIndex: 100, minWidth: '140px', boxShadow: '4px 4px 0px rgba(0,0,0,0.15)' }}>
                <button
                    onClick={() => { onStartEdit(tab.id, tab.name); }}
                    style={{ width: '100%', padding: '0.65rem 1rem', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                    <Edit2 size={14} /> Rename
                </button>
                <button
                    onClick={() => onDeleteTab(tab.id)}
                    style={{ width: '100%', padding: '0.65rem 1rem', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', color: colors.accent, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseEnter={(e) => e.target.style.background = '#fff0f0'}
                    onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        )}
    </div>
);

export default TabBarItem;
