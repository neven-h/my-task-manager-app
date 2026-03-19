import React, { useState } from 'react';
import { PiggyBank } from 'lucide-react';

const SYS = { primary: '#0000FF', border: '#000', bg: '#fff' };

const BudgetCreateFirstTab = ({ onCreateTab }) => {
    const [name, setName] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        const tab = await onCreateTab(name.trim());
        if (tab) setName('');
    };

    return (
        <div style={{
            maxWidth: 500, margin: '4rem auto', textAlign: 'center',
            padding: '3rem 2rem', border: `3px solid ${SYS.border}`, background: SYS.bg,
        }}>
            <PiggyBank size={48} style={{ color: SYS.primary, marginBottom: '1rem' }} />
            <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.4rem', fontFamily: 'inherit' }}>
                Create Your First Budget Tab
            </h2>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: 1.5 }}>
                Each tab holds its own budget entries. Create a tab to get started.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    placeholder="Tab name..."
                    style={{
                        padding: '0.7rem 1rem', border: `3px solid ${SYS.border}`,
                        fontSize: '1rem', fontFamily: 'inherit', width: 200,
                    }}
                />
                <button
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    style={{
                        padding: '0.7rem 1.5rem',
                        background: name.trim() ? SYS.primary : '#ccc',
                        color: '#fff', border: `3px solid ${SYS.border}`,
                        cursor: name.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit',
                    }}
                >
                    Create
                </button>
            </div>
        </div>
    );
};

export default BudgetCreateFirstTab;
