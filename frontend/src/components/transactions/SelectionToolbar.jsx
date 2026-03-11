import React from 'react';
import { Trash2, Download, X } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const BTN = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', color: '#fff', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.8rem', fontFamily: '"Inter", sans-serif',
    textTransform: 'uppercase',
};

const SelectionToolbar = () => {
    const { selectedIds, clearSelection, handleDeleteSelected, exportSelectedCSV, colors } = useBankTransactionContext();
    if (selectedIds.size === 0) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 16px', background: '#000', color: '#fff',
            border: '3px solid #000', marginBottom: '1rem',
        }}>
            <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                {selectedIds.size} selected
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={exportSelectedCSV} style={{ ...BTN, background: colors.primary, border: '2px solid #fff' }}>
                <Download size={14} /> Export CSV
            </button>
            <button onClick={handleDeleteSelected} style={{ ...BTN, background: colors.accent, border: '2px solid #fff' }}>
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
    );
};

export default SelectionToolbar;
