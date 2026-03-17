import React from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { FONT_STACK } from '../../theme';

const IOS = {
    green: '#34C759', red: '#FF3B30', teal: '#30B0C7',
    label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
};

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MobileBalanceInput = ({ startingBalance, editingBal, setEditingBal, balInput, setBalInput, onSave }) => {
    const needsBalance = startingBalance === null;
    return (
        <div style={{ padding: '12px 16px', background: needsBalance ? '#f0fdf4' : '#f9fafb', borderBottom: `0.5px solid ${IOS.sep}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Current balance:</span>
            {editingBal || needsBalance ? (
                <>
                    <input autoFocus type="number" inputMode="decimal" value={balInput}
                        onChange={e => setBalInput(e.target.value)} placeholder="e.g. 15000"
                        style={{ border: `1.5px solid ${IOS.teal}`, borderRadius: 8, padding: '6px 10px', fontSize: '16px', fontWeight: 700, width: 110, outline: 'none', fontFamily: FONT_STACK }} />
                    <button onClick={onSave} style={{ background: IOS.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_STACK }}>
                        <Check size={13} /> Save
                    </button>
                    {!needsBalance && (
                        <button onClick={() => setEditingBal(false)} style={{ background: 'none', border: `1px solid ${IOS.sep}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: IOS.label, fontFamily: FONT_STACK }}>
                            <X size={13} />
                        </button>
                    )}
                    {needsBalance && <span style={{ fontSize: '0.75rem', color: IOS.label, width: '100%' }}>Enter your balance to unlock AI insights</span>}
                </>
            ) : (
                <>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: startingBalance >= 0 ? IOS.green : IOS.red }}>
                        {startingBalance < 0 ? '−' : ''}₪{fmt(startingBalance, true)}
                    </span>
                    <button onClick={() => setEditingBal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Edit3 size={15} color={IOS.label} />
                    </button>
                </>
            )}
        </div>
    );
};

export { MobileBalanceInput };
export default MobileBalanceInput;
