import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Download, X, Edit2, Check } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const BTN = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', color: '#fff', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.8rem', fontFamily: '"Inter", sans-serif',
    textTransform: 'uppercase', border: '2px solid #fff',
};

const SelectionToolbar = () => {
    const {
        selectedIds, clearSelection, handleDeleteSelected, handleRenameSelected,
        exportSelectedCSV, selectAllFiltered, filteredCount, colors,
    } = useBankTransactionContext();

    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (renaming && inputRef.current) inputRef.current.focus();
    }, [renaming]);

    // Reset rename panel if selection is cleared
    useEffect(() => {
        if (selectedIds.size === 0) { setRenaming(false); setRenameVal(''); }
    }, [selectedIds.size]);

    if (selectedIds.size === 0) return null;

    const allFilteredSelected = selectedIds.size === filteredCount;

    const submitRename = async () => {
        if (!renameVal.trim()) return;
        await handleRenameSelected(renameVal);
        setRenaming(false);
        setRenameVal('');
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            {/* Gmail-style "select all filtered" banner */}
            {!allFilteredSelected && filteredCount > selectedIds.size && (
                <div style={{
                    textAlign: 'center', padding: '8px 16px',
                    background: '#e8f0fe', borderBottom: '1px solid #c5cae9',
                    fontSize: '0.85rem', color: '#1a1a2e',
                }}>
                    All <strong>{selectedIds.size}</strong> transactions on this page are selected.{' '}
                    <button onClick={selectAllFiltered} style={{
                        background: 'none', border: 'none', color: colors.primary,
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        textDecoration: 'underline', padding: 0,
                    }}>
                        Select all {filteredCount} results
                    </button>
                </div>
            )}
            {allFilteredSelected && filteredCount > 1 && (
                <div style={{
                    textAlign: 'center', padding: '8px 16px',
                    background: '#e8f0fe', borderBottom: '1px solid #c5cae9',
                    fontSize: '0.85rem', color: '#1a1a2e',
                }}>
                    All <strong>{filteredCount}</strong> results are selected.{' '}
                    <button onClick={clearSelection} style={{
                        background: 'none', border: 'none', color: colors.primary,
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        textDecoration: 'underline', padding: 0,
                    }}>
                        Clear selection
                    </button>
                </div>
            )}

            {/* Inline rename panel */}
            {renaming && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', background: '#f0f4ff',
                    border: '2px solid #0000FF', borderBottom: 'none',
                }}>
                    <Edit2 size={15} color={colors.primary} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: colors.primary, whiteSpace: 'nowrap' }}>
                        Rename {selectedIds.size} selected:
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false); }}
                        placeholder="New description…"
                        style={{
                            flex: 1, padding: '6px 10px', fontSize: '0.9rem',
                            border: '2px solid #0000FF', fontFamily: '"Inter", sans-serif',
                            outline: 'none',
                        }}
                    />
                    <button onClick={submitRename} disabled={!renameVal.trim()} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 14px', background: renameVal.trim() ? '#00AA00' : '#ccc',
                        color: '#fff', border: '2px solid #000', cursor: renameVal.trim() ? 'pointer' : 'default',
                        fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
                    }}>
                        <Check size={14} /> Apply
                    </button>
                    <button onClick={() => setRenaming(false)} style={{
                        display: 'flex', alignItems: 'center', padding: '6px',
                        background: 'none', border: '2px solid #666', cursor: 'pointer',
                    }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Main action bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', background: '#000', color: '#fff',
                border: '3px solid #000',
            }}>
                <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    {selectedIds.size} selected
                </span>
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => { setRenaming(r => !r); setRenameVal(''); }}
                    style={{ ...BTN, background: renaming ? '#0000FF' : '#333' }}
                    title="Rename selected"
                >
                    <Edit2 size={14} /> Rename
                </button>
                <button onClick={exportSelectedCSV} style={{ ...BTN, background: colors.primary }}>
                    <Download size={14} /> Export CSV
                </button>
                <button onClick={handleDeleteSelected} style={{ ...BTN, background: colors.accent }}>
                    <Trash2 size={14} /> Delete
                </button>
                <button onClick={clearSelection} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '6px', background: 'none', color: '#fff',
                    border: '2px solid #fff', cursor: 'pointer',
                }}>
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default SelectionToolbar;
