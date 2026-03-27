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
}) => {
    // ── No balance set yet: prominent CTA ───────────────────────────────────
    if (needsBalance) {
        return (
            <div style={{ borderBottom: '2px solid #000' }}>
                <div style={{
                    padding: '8px 20px',
                    background: '#000',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Set your account balance to enable forecasting
                </div>
                <div style={{
                    padding: '14px 20px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                }}>
                    <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#000',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        minWidth: 110,
                    }}>
                        Current balance:
                    </span>
                    <input
                        autoFocus
                        type="number"
                        value={balInput}
                        onChange={e => setBalInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveBalance(); }}
                        placeholder="0"
                        style={{
                            border: '2px solid #000',
                            borderRadius: 0,
                            padding: '7px 12px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            width: 140,
                            outline: 'none',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    />
                    <button
                        onClick={saveBalance}
                        style={{
                            background: '#0000FF',
                            color: '#fff',
                            border: '2px solid #000',
                            borderRadius: 0,
                            padding: '7px 16px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontFamily: 'inherit',
                        }}
                    >
                        <Check size={13} /> Save
                    </button>
                </div>
            </div>
        );
    }

    // ── Balance set, in edit mode ────────────────────────────────────────────
    if (editingBal) {
        return (
            <div style={{
                padding: '12px 20px',
                background: '#fff',
                borderBottom: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
            }}>
                <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    minWidth: 110,
                }}>
                    Current balance:
                </span>
                <input
                    autoFocus
                    type="number"
                    value={balInput}
                    onChange={e => setBalInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBal(false); }}
                    style={{
                        border: '2px solid #000',
                        borderRadius: 0,
                        padding: '7px 12px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        width: 140,
                        outline: 'none',
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                />
                <button
                    onClick={saveBalance}
                    style={{
                        background: '#0000FF',
                        color: '#fff',
                        border: '2px solid #000',
                        borderRadius: 0,
                        padding: '7px 16px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'inherit',
                    }}
                >
                    <Check size={13} /> Save
                </button>
                <button
                    onClick={() => setEditingBal(false)}
                    style={{
                        background: '#fff',
                        border: '2px solid #000',
                        borderRadius: 0,
                        padding: '7px 10px',
                        cursor: 'pointer',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        fontFamily: 'inherit',
                    }}
                >
                    <X size={13} />
                </button>
            </div>
        );
    }

    // ── Balance set, display mode ────────────────────────────────────────────
    return (
        <div style={{
            padding: '12px 20px',
            background: '#fff',
            borderBottom: '2px solid #000',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
        }}>
            <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
            }}>
                Current balance:
            </span>
            <span style={{
                fontWeight: 900,
                fontSize: '1.1rem',
                color: startingBalance >= 0 ? '#00AA00' : '#FF0000',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {startingBalance < 0 ? '−' : ''}₪{fmt(startingBalance, true)}
            </span>
            <button
                onClick={() => { setBalInput(String(startingBalance)); setEditingBal(true); }}
                style={{
                    background: '#fff',
                    border: '2px solid #000',
                    borderRadius: 0,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    fontFamily: 'inherit',
                }}
            >
                <Edit3 size={12} /> Edit
            </button>
        </div>
    );
};

export default BalanceInputBar;
