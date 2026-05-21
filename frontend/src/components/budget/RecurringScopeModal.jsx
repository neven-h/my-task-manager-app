import React from 'react';
import { SCOPE_SINGLE, SCOPE_THIS_AND_FUTURE } from './budgetConstants';

/**
 * Asks the user whether a change to a recurring budget entry should apply
 * to this single occurrence or to this row and every future occurrence in
 * the same chain (mirrors Google Calendar's edit/delete dialog).
 *
 * Props:
 *   open       — boolean, whether the modal is visible
 *   mode       — 'edit' | 'delete' (only changes copy + accent color)
 *   chainInfo  — optional { seq, total } shown next to the title
 *   onChoose   — (scope: SCOPE_SINGLE | SCOPE_THIS_AND_FUTURE) => void
 *   onCancel   — () => void
 */
const RecurringScopeModal = ({ open, mode = 'edit', chainInfo = null, onChoose, onCancel }) => {
    if (!open) return null;

    const isDelete = mode === 'delete';
    const actionWord = isDelete ? 'Delete' : 'Edit';
    const accentClass = isDelete ? 'btn-red' : 'btn-blue';

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 420, padding: 24, gap: 14 }}
            >
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#000' }}>
                    {actionWord} recurring entry
                    {chainInfo && (
                        <span style={{ color: '#666', fontWeight: 600, marginLeft: 8 }}>
                            · {chainInfo.seq} of {chainInfo.total ?? '∞'}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#444', marginBottom: 4 }}>
                    This entry is part of a recurring series. What would you like to change?
                </div>

                <button
                    type="button"
                    className="btn btn-white"
                    onClick={() => onChoose(SCOPE_SINGLE)}
                    style={{ textAlign: 'left' }}
                >
                    <div style={{ fontWeight: 800 }}>This month only</div>
                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>
                        {isDelete
                            ? 'Delete just this occurrence. Future months stay scheduled.'
                            : 'Apply the change to only this row.'}
                    </div>
                </button>

                <button
                    type="button"
                    className={`btn ${accentClass}`}
                    onClick={() => onChoose(SCOPE_THIS_AND_FUTURE)}
                    style={{ textAlign: 'left' }}
                >
                    <div style={{ fontWeight: 800 }}>This and all future months</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: 2 }}>
                        {isDelete
                            ? 'Delete this row and every future occurrence in the chain.'
                            : 'Apply the change to this row and every future occurrence.'}
                    </div>
                </button>

                <button
                    type="button"
                    className="btn btn-white btn-narrow"
                    onClick={onCancel}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 4 }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default RecurringScopeModal;
