import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// `compact` tightens the header for phone-sized screens
const SettingsHeader = ({ compact = false }) => {
    const navigate = useNavigate();

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px 16px 0 0',
            padding: compact ? '18px 56px' : '30px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'relative'
        }}>
            <button
                onClick={() => navigate('/app')}
                aria-label="Back"
                style={{
                    position: 'absolute',
                    top: compact ? '14px' : '20px',
                    left: compact ? '12px' : '20px',
                    background: 'rgba(239, 229, 114, 0.1)',
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
                <h1 style={{
                    fontSize: compact ? '1.5rem' : '2rem',
                    fontWeight: 700,
                    margin: compact ? '0 0 4px 0' : '0 0 8px 0',
                    color: '#111'
                }}>
                    Settings
                </h1>
                <p style={{ color: '#666', margin: 0, fontSize: compact ? '0.85rem' : undefined }}>
                    Manage your account security settings
                </p>
            </div>
        </div>
    );
};

export default SettingsHeader;
