import React from 'react';
import { Edit3, Check, X } from 'lucide-react';

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BalanceInputBar = ({
    startingBalance,
    editingBal,
    setEditingBal,
    balInput,
    setBalInput,
    needsBalance,
    saveBalance,
}) => (
    <div style={{
        padding: '12px 20px',
        background: needsBalance ? '#f0fdf4' : '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
            Current balance:
        </span>
        {editingBal || needsBalance ? (
            <>
                <input autoFocus type="number" value={balInput}
                    onChange={e => setBalInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBal(false); }}
                    placeholder="e.g. 15000"
                    style={{
                        border: '1.5px solid #0d9488', borderRadius: 6,
                        padding: '5px 10px', fontSize: '0.88rem',
                        fontWeight: 700, width: 120, outline: 'none',
                    }} />
                <button onClick={saveBalance} style={{
                    background: '#0d9488', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <Check size={13} /> Save
                </button>
                {!needsBalance && (
                    <button onClick={() => setEditingBal(false)} style={{
                        background: 'none', border: '1px solid #d1d5db', borderRadius: 6,
                        padding: '5px 10px', cursor: 'pointer', color: '#6b7280',
                    }}>
                        <X size={13} />
                    </button>
                )}
                {needsBalance && (
                    <span style={{ fontSize: '0.77rem', color: '#6b7280', marginLeft: 4 }}>
                        Enter your account balance to see AI insights
                    </span>
                )}
            </>
        ) : (
            <>
                <span style={{
                    fontWeight: 900, fontSize: '1.1rem',
                    color: startingBalance >= 0 ? '#059669' : '#dc2626',
                }}>
                    {startingBalance < 0 ? '−' : ''}₪{fmt(startingBalance, true)}
                </span>
                <button onClick={() => { setBalInput(String(startingBalance)); setEditingBal(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                    <Edit3 size={14} />
                </button>
            </>
        )}
    </div>
);

export default BalanceInputBar;
