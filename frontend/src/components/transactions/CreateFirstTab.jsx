import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const CreateFirstTab = () => {
    const { tabs, colors, handleCreateFirstTab } = useBankTransactionContext();
    const [newTabName, setNewTabName] = useState('');

    if (tabs.length > 0) return null;

    const onCreateTab = async () => {
        const result = await handleCreateFirstTab(newTabName);
        if (result) {
            setNewTabName('');
        }
    };

    return (
        <div style={{
            maxWidth: '500px',
            margin: '4rem auto',
            textAlign: 'center',
            padding: '3rem 2rem',
            border: `3px solid ${colors.border}`,
            background: colors.card
        }}>
            <Users size={48} style={{ color: colors.primary, marginBottom: '1rem' }} />
            <h2 style={{ margin: '0 0 0.75rem 0', fontFamily: '"Inter", sans-serif', fontSize: '1.4rem' }}>
                Create Your First Tab
            </h2>
            <p style={{ color: colors.textLight, margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.5' }}>
                Each tab has its own separate bank transactions. Create a tab to get started.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onCreateTab(); }}
                    placeholder="Tab name..."
                    style={{
                        padding: '0.7rem 1rem',
                        border: `3px solid ${colors.border}`,
                        fontSize: '1rem',
                        fontFamily: '"Inter", sans-serif',
                        width: '200px'
                    }}
                />
                <button
                    onClick={onCreateTab}
                    disabled={!newTabName.trim()}
                    style={{
                        padding: '0.7rem 1.5rem',
                        background: newTabName.trim() ? colors.primary : '#ccc',
                        color: '#fff',
                        border: `3px solid ${colors.border}`,
                        cursor: newTabName.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: '700',
                        fontSize: '1rem',
                        fontFamily: '"Inter", sans-serif'
                    }}
                >
                    Create
                </button>
            </div>
        </div>
    );
};

export default CreateFirstTab;
