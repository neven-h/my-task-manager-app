import React from 'react';
import { Check, Undo2 } from 'lucide-react';
import { THEME, FONT_STACK } from '../../../ios/theme';

const MobileUploadFlowSuccess = ({
    undone, savedIds, selectedTabName,
    parsedData, undoing, handleUndo, onClose,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
        {undone ? (
            <>
                <Undo2 size={48} color={THEME.muted} />
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '4px' }}>Upload Undone</div>
                    <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                        {savedIds.length} transactions removed from "{selectedTabName}"
                    </div>
                </div>
            </>
        ) : (
            <>
                <Check size={48} color={THEME.success} />
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '4px' }}>
                        {parsedData?.transaction_count || savedIds.length} Transactions Saved
                    </div>
                    <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                        Added to "{selectedTabName}"
                    </div>
                </div>
            </>
        )}

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            {!undone && savedIds.length > 0 && (
                <button
                    onClick={handleUndo}
                    disabled={undoing}
                    style={{
                        flex: 1, padding: '14px', border: '3px solid #000',
                        background: undoing ? '#ccc' : '#fff',
                        color: THEME.accent, fontWeight: 700, fontSize: '0.9rem',
                        cursor: undoing ? 'not-allowed' : 'pointer',
                        fontFamily: FONT_STACK, textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <Undo2 size={16} />
                    {undoing ? 'Undoing...' : 'Undo'}
                </button>
            )}
            <button
                onClick={onClose}
                style={{
                    flex: 1, padding: '14px', border: '3px solid #000',
                    background: THEME.primary, color: '#fff',
                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    fontFamily: FONT_STACK, textTransform: 'uppercase'
                }}
            >
                Done
            </button>
        </div>
    </div>
);

export default MobileUploadFlowSuccess;
