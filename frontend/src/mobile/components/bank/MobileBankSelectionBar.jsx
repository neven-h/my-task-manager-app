import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Download, X, CheckSquare, Pencil, Check } from 'lucide-react';

const BTN = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '10px 12px', border: 'none', borderRadius: 12,
    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0,
};

const MobileBankSelectionBar = ({ count, onDelete, onExport, onSelectAll, allSelected, onCancel, onRename }) => {
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState('');
    const inputRef = useRef(null);

    useEffect(() => { if (renaming && inputRef.current) inputRef.current.focus(); }, [renaming]);
    useEffect(() => { if (count === 0) { setRenaming(false); setRenameVal(''); } }, [count]);

    const submitRename = () => {
        if (!renameVal.trim()) return;
        onRename?.(renameVal.trim());
        setRenaming(false);
        setRenameVal('');
    };

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderTop: '0.5px solid rgba(0,0,0,0.15)',
            zIndex: 200,
        }}>
            {/* Inline rename panel — slides in above the action bar */}
            {renaming && (
                <div style={{
                    padding: '12px 16px 8px',
                    borderBottom: '0.5px solid rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 5 }}>
                            Rename {count} {count === 1 ? 'entry' : 'entries'}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setRenaming(false); setRenameVal(''); } }}
                            placeholder="New description…"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                border: '1.5px solid #007AFF', borderRadius: 10,
                                padding: '9px 12px', fontSize: '16px',
                                outline: 'none', fontFamily: 'inherit',
                                background: 'rgba(0,122,255,0.04)',
                            }}
                        />
                    </div>
                    <button onClick={submitRename} disabled={!renameVal.trim()}
                        style={{ ...BTN, background: renameVal.trim() ? '#007AFF' : 'rgba(0,0,0,0.08)', color: renameVal.trim() ? '#fff' : '#aaa' }}>
                        <Check size={16} />
                    </button>
                    <button onClick={() => { setRenaming(false); setRenameVal(''); }}
                        style={{ ...BTN, background: 'rgba(0,0,0,0.06)', color: '#555', padding: '10px' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Main action bar */}
            <div style={{
                padding: '10px 16px calc(env(safe-area-inset-bottom, 8px) + 10px)',
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                {/* Select All / Deselect All */}
                <button onClick={onSelectAll} style={{ ...BTN, background: 'rgba(0,0,0,0.06)', color: '#333' }}>
                    <CheckSquare size={16} />
                    <span style={{ fontSize: '0.78rem' }}>{allSelected ? 'Deselect' : 'All'}</span>
                </button>

                {/* Count */}
                <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', color: '#333' }}>
                    {count > 0 ? `${count} selected` : 'Select items'}
                </span>

                {count > 0 && (
                    <>
                        {/* Rename */}
                        <button onClick={() => setRenaming(r => !r)}
                            style={{ ...BTN, background: renaming ? '#007AFF' : 'rgba(0,122,255,0.12)', color: renaming ? '#fff' : '#007AFF' }}
                            title="Rename selected">
                            <Pencil size={16} />
                        </button>
                        {/* Export */}
                        <button onClick={onExport}
                            style={{ ...BTN, background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
                            title="Export CSV">
                            <Download size={16} />
                        </button>
                        {/* Delete */}
                        <button onClick={onDelete}
                            style={{ ...BTN, background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}
                            title="Delete selected">
                            <Trash2 size={16} />
                        </button>
                    </>
                )}

                {/* Cancel */}
                <button onClick={() => { setRenaming(false); setRenameVal(''); onCancel(); }}
                    style={{ ...BTN, background: 'rgba(0,0,0,0.06)', color: '#333', padding: '10px' }}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default MobileBankSelectionBar;
