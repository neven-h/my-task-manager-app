import React from 'react';
import { X } from 'lucide-react';
import { THEME } from '../../theme';

const MobileAddClientForm = ({ newClient, setNewClient, createLoading, onClose, onSubmit }) => (
    <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div style={{ width: '100%', maxHeight: '80vh', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>New Client</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                    <X size={28} />
                </button>
            </div>
            <form onSubmit={onSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                        { label: 'Name *', key: 'name', type: 'text', required: true },
                        { label: 'Email', key: 'email', type: 'email' },
                        { label: 'Phone', key: 'phone', type: 'tel' },
                    ].map(({ label, key, type, required }) => (
                        <div key={key}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                {label}
                            </label>
                            <input
                                type={type} value={newClient[key]} required={required}
                                onChange={(e) => setNewClient({ ...newClient, [key]: e.target.value })}
                                style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }}
                            />
                        </div>
                    ))}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Notes</label>
                        <textarea
                            value={newClient.notes}
                            onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                            rows={3}
                            style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', border: '3px solid #000', background: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                        <button
                            type="submit"
                            disabled={createLoading || !newClient.name?.trim()}
                            style={{ flex: 1, padding: '14px', border: '3px solid #000', background: THEME.primary, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: (createLoading || !newClient.name?.trim()) ? 0.5 : 1 }}
                        >
                            {createLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
);

export default MobileAddClientForm;
