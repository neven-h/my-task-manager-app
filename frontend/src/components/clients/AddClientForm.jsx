import React, { useState } from 'react';

const FONT_STACK = '"Inter", "Helvetica Neue", Calibri, sans-serif';

const fieldStyle = (border) => ({
    width: '100%', padding: '0.75rem', border: `3px solid ${border}`,
    fontWeight: 600, fontSize: '1rem', fontFamily: FONT_STACK, boxSizing: 'border-box'
});

const AddClientForm = ({ colors, onSubmit, onCancel }) => {
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });
    const [loading, setLoading] = useState(false);

    const update = (key, value) => setNewClient(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(newClient);
        setLoading(false);
        setNewClient({ name: '', email: '', phone: '', notes: '' });
    };

    const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', color: colors.text };

    return (
        <div style={{ border: `3px solid ${colors.border}`, background: colors.surface, padding: '2rem', marginBottom: '2rem', boxShadow: '4px 4px 0px #000' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textTransform: 'UPPERCASE', color: colors.text }}>Create New Client</h3>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}>Client Name <span style={{ color: colors.accent }}>*</span></label>
                        <input type="text" value={newClient.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter client name" required style={fieldStyle(colors.border)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Email</label>
                        <input type="email" value={newClient.email} onChange={(e) => update('email', e.target.value)} placeholder="client@example.com" style={fieldStyle(colors.border)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Phone</label>
                        <input type="tel" value={newClient.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 (555) 123-4567" style={fieldStyle(colors.border)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Notes</label>
                        <textarea value={newClient.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Additional notes about the client" rows={3} style={{ ...fieldStyle(colors.border), resize: 'vertical' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading || !newClient.name?.trim()} style={{ flex: 1 }}>
                        {loading ? 'Creating...' : 'Create Client'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default AddClientForm;
