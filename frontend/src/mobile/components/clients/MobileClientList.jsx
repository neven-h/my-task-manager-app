import React from 'react';
import { THEME } from '../../theme';

const MobileClientList = ({ clients, loading, selectedClient, onClientClick, onDeleteClient }) => {
    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
    }
    if (clients.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>No clients yet</div>;
    }
    return (
        <>
            {clients.map(client => (
                <div
                    key={client.client}
                    onClick={() => onClientClick(client.client)}
                    style={{ border: '3px solid #000', padding: '16px', marginBottom: '12px', background: selectedClient === client.client ? '#f8f8f8' : '#fff', cursor: 'pointer' }}
                >
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '8px' }}>
                        {client.client}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: THEME.muted }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{Number(client.total_hours || 0).toFixed(1)}h</div>
                            <div style={{ fontSize: '0.75rem' }}>Total Hours</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>{client.task_count || 0}</div>
                            <div style={{ fontSize: '0.75rem' }}>Tasks</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteClient(client.client); }}
                            style={{ flex: 1, padding: '8px', border: '2px solid #000', background: THEME.accent, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
};

export default MobileClientList;
