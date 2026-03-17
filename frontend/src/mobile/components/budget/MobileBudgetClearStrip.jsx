import React from 'react';
import { FONT_STACK } from '../../../ios/theme';

const IOS_RED  = '#FF3B30';
const IOS_MUTED = '#8E8E93';
const IOS_SEP   = 'rgba(0,0,0,0.08)';

/**
 * MobileBudgetClearStrip — confirmation strip for clearing all entries in a tab.
 */
const MobileBudgetClearStrip = ({ tabEntries, loading, confirmClearTab, setConfirmClearTab, onClearTab }) => {
    if (!tabEntries.length) return null;

    const count = tabEntries.length;

    return (
        <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderBottom: `0.5px solid ${IOS_SEP}`,
            background: '#fff',
        }}>
            {confirmClearTab ? (
                <>
                    <span style={{ fontSize: '0.72rem', color: IOS_MUTED, fontWeight: 500, flexShrink: 1 }}>
                        Delete all {count} {count === 1 ? 'entry' : 'entries'}?
                    </span>
                    <button type="button" onClick={onClearTab} disabled={loading}
                        style={{
                            padding: '5px 14px', borderRadius: 20, border: 'none',
                            background: IOS_RED, color: '#fff', fontWeight: 600,
                            fontSize: '0.78rem', cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: FONT_STACK, opacity: loading ? 0.5 : 1, flexShrink: 0,
                        }}>
                        {loading ? '…' : 'Clear'}
                    </button>
                    <button type="button" onClick={() => setConfirmClearTab(false)}
                        style={{
                            padding: '5px 12px', borderRadius: 20, border: 'none',
                            background: IOS_SEP, color: IOS_MUTED, fontWeight: 600,
                            fontSize: '0.78rem', cursor: 'pointer', fontFamily: FONT_STACK, flexShrink: 0,
                        }}>
                        Cancel
                    </button>
                </>
            ) : (
                <button type="button" onClick={() => setConfirmClearTab(true)}
                    style={{
                        padding: '4px 12px', borderRadius: 20, border: 'none',
                        background: 'none', color: IOS_MUTED, fontWeight: 500,
                        fontSize: '0.75rem', cursor: 'pointer', fontFamily: FONT_STACK,
                    }}>
                    Clear tab
                </button>
            )}
        </div>
    );
};

export default MobileBudgetClearStrip;
