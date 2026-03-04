import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SettingsHeader = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px 16px 0 0',
            padding: '30px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'relative'
        }}>
            <button
                onClick={() => navigate('/tasks')}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'rgba(239, 224, 114, 0.1)',
                    border: 'none',
                    color: '#667eea',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <ArrowLeft size={20} />
            </button>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px 0', color: '#111' }}>
                    Settings
                </h1>
                <p style={{ color: '#666', margin: 0 }}>
                    Manage your account security settings
                </p>
            </div>
        </div>
    );
};

export default SettingsHeader;
