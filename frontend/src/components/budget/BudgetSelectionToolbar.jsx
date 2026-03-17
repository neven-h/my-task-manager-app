import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Download, X, Edit2, Tag, Check } from 'lucide-react';

const SYS = { border: '#000', accent: '#FF0000', primary: '#0000FF', success: '#00AA00' };

const BTN = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', border: `2px solid ${SYS.border}`,
    cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
    textTransform: 'uppercase', letterSpacing: '0.3px',
    fontFamily: 'inherit',
};

const BudgetSelectionToolbar = ({ count, onDelete, onExport, onCancel, onBatchUpdate, allCategories }) => {
    const [panel, setPanel] = useState(null); // null | 'rename' | 'category'
    const [renameVal, setRenameVal] = useState('');
    const [catVal, setCatVal] = useState('');
    const inputRef = useRef(null);

    useEffect(() => { if (panel && inputRef.current) inputRef.current.focus(); }, [panel]);
    useEffect(() => { if (count === 0) { setPanel(null); setRenameVal(''); setCatVal(''); } }, [count]);

    if (count === 0) return null;

    const openPanel = (p) => setPanel(prev => prev === p ? null : p);

    const submitRename = () => {
        if (!renameVal.trim()) return;
        onBatchUpdate({ description: renameVal.trim() });
        setPanel(null); setRenameVal('');
    };

    const submitCategory = () => {
        onBatchUpdate({ category: catVal.trim() });
        setPanel(null); setCatVal('');
    };

    return (
        <div style={{ marginBottom: 8 }}>
            {/* Rename panel */}
            {panel === 'rename' && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: '#f0f4ff',
                    border: `2px solid ${SYS.primary}`, borderBottom: 'none',
                }}>
                    <Edit2 size={14} color={SYS.primary} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: SYS.primary, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                        Rename {count}:
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setPanel(null); }}
                        placeholder="New description…"
                        style={{ flex: 1, padding: '5px 8px', fontSize: '0.88rem', border: `2px solid ${SYS.primary}`, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button onClick={submitRename} disabled={!renameVal.trim()} style={{ ...BTN, background: renameVal.trim() ? SYS.success : '#ccc', color: '#fff', border: `2px solid #000`, cursor: renameVal.trim() ? 'pointer' : 'default' }}>
                        <Check size={13} /> Apply
                    </button>
                    <button onClick={() => setPanel(null)} style={{ ...BTN, background: '#fff', color: '#000' }}>
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Category panel */}
            {panel === 'category' && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: '#fffbe6',
                    border: `2px solid #cc9900`, borderBottom: 'none',
                }}>
                    <Tag size={14} color="#cc9900" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cc9900', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                        Set category for {count}:
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        list="budget-categories-list"
                        value={catVal}
                        onChange={e => setCatVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitCategory(); if (e.key === 'Escape') setPanel(null); }}
                        placeholder="Category name…"
                        style={{ flex: 1, padding: '5px 8px', fontSize: '0.88rem', border: '2px solid #cc9900', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <datalist id="budget-categories-list">
                        {(allCategories || []).map(c => <option key={c} value={c} />)}
                    </datalist>
                    <button onClick={submitCategory} style={{ ...BTN, background: SYS.success, color: '#fff', border: `2px solid #000` }}>
                        <Check size={13} /> Apply
                    </button>
                    <button onClick={() => setPanel(null)} style={{ ...BTN, background: '#fff', color: '#000' }}>
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Main toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', background: '#000', color: '#fff',
                border: `2px solid ${SYS.border}`,
            }}>
                <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', marginRight: 4 }}>
                    {count} selected
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => openPanel('rename')} style={{ ...BTN, background: panel === 'rename' ? SYS.primary : '#333', color: '#fff', border: '2px solid #fff' }}>
                    <Edit2 size={13} /> Rename
                </button>
                <button onClick={() => openPanel('category')} style={{ ...BTN, background: panel === 'category' ? '#cc9900' : '#333', color: '#fff', border: '2px solid #fff' }}>
                    <Tag size={13} /> Category
                </button>
                <button onClick={onExport} style={{ ...BTN, background: SYS.primary, color: '#fff', border: '2px solid #fff' }}>
                    <Download size={13} /> CSV
                </button>
                <button onClick={onDelete} style={{ ...BTN, background: SYS.accent, color: '#fff', border: '2px solid #fff' }}>
                    <Trash2 size={13} /> Delete
                </button>
                <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', padding: '5px', background: 'none', color: '#fff', border: '2px solid #fff', cursor: 'pointer' }}>
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default React.memo(BudgetSelectionToolbar);
