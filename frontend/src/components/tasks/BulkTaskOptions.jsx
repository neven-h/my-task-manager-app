import React from 'react';

const BulkTaskOptions = ({ allCategories, clients, bulkCategories, bulkClient, setBulkClient, toggleBulkCategory }) => (
    <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f8f8', border: '2px solid #000' }}>
        <div style={{ marginBottom: '16px' }}>
            <label style={{
                display: 'block', marginBottom: '12px', fontWeight: 700,
                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
                Categories (optional - applies to all tasks)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {allCategories.map(cat => (
                    <div
                        key={cat.id}
                        className={`category-pill ${bulkCategories.includes(cat.id) ? 'selected' : ''}`}
                        onClick={() => toggleBulkCategory(cat.id)}
                    >
                        {cat.label}
                    </div>
                ))}
            </div>
        </div>

        <div>
            <label style={{
                display: 'block', marginBottom: '8px', fontWeight: 700,
                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
                Client (optional - applies to all tasks)
            </label>
            <input
                type="text"
                placeholder="Client name..."
                value={bulkClient}
                onChange={(e) => setBulkClient(e.target.value)}
                list="clients-list-bulk"
            />
            <datalist id="clients-list-bulk">
                {clients.map(client => {
                    const clientName = typeof client === 'string' ? client : (client.name || client.client || '');
                    return <option key={clientName} value={clientName} />;
                })}
            </datalist>
        </div>
    </div>
);

export default BulkTaskOptions;
