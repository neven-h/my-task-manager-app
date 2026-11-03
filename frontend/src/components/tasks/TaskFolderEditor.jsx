import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

// Inline (not the .btn classes) so the same buttons look right in the iOS app, which does not load TaskTracker.css
export const folderBtn = (bg, fg = '#000') => ({
    background: bg, color: fg, border: '3px solid #000', padding: '10px 18px', fontWeight: 700,
    fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
});

const COLORS = ['#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF9500', '#5856D6', '#000000'];

/** Create or edit a folder: name, color, and which categories it holds. */
const TaskFolderEditor = ({ folder, onClose }) => {
    const { allCategories, allTasks, folders, saveFolder, deleteFolder, setActiveFolder } = useTaskContext();
    const [name, setName] = useState(folder.name || '');
    const [color, setColor] = useState(folder.color || COLORS[0]);
    const [picked, setPicked] = useState(() => new Set(folder.categories || []));
    const [saving, setSaving] = useState(false);

    // Every category in use or defined, with the folder it sits in now
    const options = useMemo(() => {
        const ids = new Set([...allCategories.map(c => c.id), ...allTasks.map(t => t.category).filter(Boolean)]);
        const label = (id) => allCategories.find(c => c.id === id)?.label ?? id;
        const owner = (id) => folders.find(f => f.id !== folder.id && f.categories.includes(id))?.name;
        return [...ids].map(id => ({ id, label: label(id), elsewhere: owner(id) }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [allCategories, allTasks, folders, folder.id]);

    const toggle = (id) => setPicked(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const ok = await saveFolder({ id: folder.id, name: name.trim(), color, categories: [...picked] });
        setSaving(false);
        if (ok) onClose();
    };

    const remove = async () => {
        if (!window.confirm(`Delete the folder "${folder.name}"? Its tasks are kept and move to Unfiled.`)) return;
        if (await deleteFolder(folder.id)) {
            setActiveFolder(null);
            onClose();
        }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div role="dialog" aria-modal="true" aria-label={folder.id ? 'Edit folder' : 'New folder'} onClick={e => e.stopPropagation()}
                style={{ background: '#fff', border: '3px solid #000', width: '100%', maxWidth: 460, maxHeight: '90dvh', overflowY: 'auto', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{folder.id ? 'Edit folder' : 'New folder'}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><X size={20} /></button>
                </div>

                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }} htmlFor="folder-name">Name</label>
                <input id="folder-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '3px solid #000', fontSize: '1rem', marginBottom: 16 }} />

                <div style={{ fontWeight: 700, marginBottom: 6 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                            style={{ width: 32, height: 32, background: c, border: color === c ? '4px solid #000' : '2px solid #ccc', cursor: 'pointer', padding: 0 }} />
                    ))}
                </div>

                <div style={{ fontWeight: 700, marginBottom: 6 }}>Categories in this folder</div>
                <div style={{ border: '2px solid #000', marginBottom: 20 }}>
                    {options.length === 0 && <div style={{ padding: 12, color: '#666' }}>No categories yet</div>}
                    {options.map(o => (
                        <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                            <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} style={{ width: 18, height: 18, flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{o.label}</span>
                            {o.elsewhere && <span style={{ fontSize: '0.75rem', color: '#666' }}>{picked.has(o.id) ? `moves from ${o.elsewhere}` : `in ${o.elsewhere}`}</span>}
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" style={{ ...folderBtn('#0000FF', '#fff'), opacity: saving || !name.trim() ? 0.5 : 1 }} onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" style={folderBtn('#fff')} onClick={onClose}>Cancel</button>
                    {folder.id && <button type="button" onClick={remove} style={{ ...folderBtn('#FF0000', '#fff'), marginLeft: 'auto' }}>Delete folder</button>}
                </div>
            </div>
        </div>
    );
};

export default TaskFolderEditor;
