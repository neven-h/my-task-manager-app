import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const FONT_STACK = '"Inter", "Helvetica Neue", Calibri, sans-serif';

const ClientCard = ({ client, isSelected, editingClient, newClientName, colors, onSelect, onStartEdit, onCancelEdit, onNameChange, onRename, onDelete }) => {
    const isEditing = editingClient === client.client;

    return (
        <div
            style={{
                border: `3px solid ${colors.border}`,
                background: isSelected ? '#f8f8f8' : colors.surface,
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '4px 4px 0px #000',
                transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translate(-2px, -2px)';
                    e.currentTarget.style.boxShadow = '6px 6px 0px #000';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = '4px 4px 0px #000';
                }
            }}
        >
            <div onClick={() => onSelect(client.client)} style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', color: colors.text }}>
                    {client.client}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: colors.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Total Hours
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: colors.primary }}>
                            {(client.total_hours || 0).toFixed(1)}h
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: colors.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Tasks
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: colors.primary }}>
                            {client.task_count}
                        </div>
                    </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: colors.success, fontWeight: 600 }}>
                    ✓ {client.completed_tasks} completed
                </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8f8f8', borderTop: `3px solid ${colors.border}`, display: 'flex', gap: '0.5rem' }}>
                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={newClientName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="New name"
                            style={{ flex: 1, padding: '0.5rem', border: `3px solid ${colors.border}`, fontWeight: 600, fontSize: '1rem', fontFamily: FONT_STACK }}
                        />
                        <button className="btn btn-secondary" onClick={() => onRename(client.client)} style={{ padding: '0.5rem 1rem' }}>
                            Save
                        </button>
                        <button className="btn" onClick={onCancelEdit} style={{ padding: '0.5rem 1rem', background: colors.surface, color: colors.text, borderColor: colors.border }}>
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="btn"
                            onClick={(e) => { e.stopPropagation(); onStartEdit(client.client); }}
                            style={{ flex: 1, background: colors.surface, color: colors.primary, borderColor: colors.primary }}
                        >
                            <Edit2 size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                            Rename
                        </button>
                        <button
                            className="btn"
                            onClick={(e) => { e.stopPropagation(); onDelete(client.client); }}
                            style={{ padding: '0.5rem 0.75rem', background: colors.accent, color: '#fff', borderColor: colors.border }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientCard;
