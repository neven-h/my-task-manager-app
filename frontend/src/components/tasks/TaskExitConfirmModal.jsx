import React from 'react';

const TaskExitConfirmModal = ({ isEditing, onContinue, onKeepDraft, onDiscard }) => (
    <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ padding: '32px', borderBottom: '3px solid #000', background: '#FF0000', color: '#fff' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>
                    {isEditing ? 'Unsaved Changes' : 'Save Draft?'}
                </h2>
            </div>
            <div style={{ padding: '32px' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '24px', lineHeight: '1.6' }}>
                    {isEditing
                        ? 'You have unsaved changes to this task. What would you like to do?'
                        : 'You have unsaved changes. Your work has been automatically saved as a draft. What would you like to do?'
                    }
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="btn btn-blue" onClick={onContinue} style={{ width: '100%' }}>Continue Editing</button>
                    {!isEditing && (
                        <button className="btn btn-yellow" onClick={onKeepDraft} style={{ width: '100%' }}>Close & Keep Draft</button>
                    )}
                    <button className="btn btn-white" onClick={onDiscard} style={{ width: '100%' }}>
                        {isEditing ? 'Discard Changes' : 'Discard Draft'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default TaskExitConfirmModal;
